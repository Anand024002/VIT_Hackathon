# optimizer/timetable_optimizer.py - Google OR-Tools Optimizer
from ortools.sat.python import cp_model
import random
from datetime import datetime
from typing import List, Dict, Any, Optional
import copy

class TimetableOptimizer:
    def __init__(self):
        self.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        self.periods = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-1:00', '2:00-3:00', '3:00-4:00']
        
    def generate_optimized_timetables(self, faculty, rooms, subjects, leave_requests=None, constraints=None):
        """Generate multiple optimized timetable options using CP-SAT solver"""
        
        if leave_requests is None:
            leave_requests = []
        if constraints is None:
            constraints = {}
            
        timetables = []
        
        # Generate 3 different optimized timetables
        for attempt in range(3):
            timetable = self._generate_single_timetable(
                faculty, rooms, subjects, leave_requests, constraints, attempt
            )
            if timetable:
                timetables.append(timetable)
        
        # Sort by score (higher is better)
        timetables.sort(key=lambda t: t['score'], reverse=True)
        
        return timetables
    
    def _generate_single_timetable(self, faculty, rooms, subjects, leave_requests, constraints, seed=0):
        """Generate a single optimized timetable using CP-SAT"""
        
        model = cp_model.CpModel()
        
        # Create variables for each time slot
        # schedule[d][p][f][r][s] = 1 if faculty f teaches subject s in room r at day d, period p
        schedule = {}
        for d, day in enumerate(self.days):
            schedule[d] = {}
            for p, period in enumerate(self.periods):
                schedule[d][p] = {}
                for f, fac in enumerate(faculty):
                    schedule[d][p][f] = {}
                    for r, room in enumerate(rooms):
                        schedule[d][p][f][r] = {}
                        for s, subject in enumerate(subjects):
                            schedule[d][p][f][r][s] = model.NewBoolVar(
                                f'schedule_d{d}_p{p}_f{f}_r{r}_s{s}'
                            )
        
        # Constraint 1: Each time slot can have at most one class
        for d in range(len(self.days)):
            for p in range(len(self.periods)):
                total_classes = []
                for f in range(len(faculty)):
                    for r in range(len(rooms)):
                        for s in range(len(subjects)):
                            total_classes.append(schedule[d][p][f][r][s])
                model.Add(sum(total_classes) <= len(rooms))  # Multiple classes can run simultaneously in different rooms
        
        # Constraint 2: Faculty can teach at most one class at a time
        for d in range(len(self.days)):
            for p in range(len(self.periods)):
                for f in range(len(faculty)):
                    faculty_classes = []
                    for r in range(len(rooms)):
                        for s in range(len(subjects)):
                            faculty_classes.append(schedule[d][p][f][r][s])
                    model.Add(sum(faculty_classes) <= 1)
        
        # Constraint 3: Room can host at most one class at a time
        for d in range(len(self.days)):
            for p in range(len(self.periods)):
                for r in range(len(rooms)):
                    room_classes = []
                    for f in range(len(faculty)):
                        for s in range(len(subjects)):
                            room_classes.append(schedule[d][p][f][r][s])
                    model.Add(sum(room_classes) <= 1)
        
        # Constraint 4: Faculty-Subject compatibility
        for d in range(len(self.days)):
            for p in range(len(self.periods)):
                for f, fac in enumerate(faculty):
                    for r in range(len(rooms)):
                        for s, subject in enumerate(subjects):
                            # Only allow faculty to teach their subject
                            if fac['subject'] != subject['name']:
                                model.Add(schedule[d][p][f][r][s] == 0)
        
        # Constraint 5: Leave requests - faculty not available
        for leave in leave_requests:
            if leave['status'] == 'approved':
                day_idx = self._get_day_index(leave['date'])
                period_idx = self._get_period_index(leave['period'])
                faculty_idx = self._get_faculty_index(faculty, leave['faculty'])
                
                if day_idx >= 0 and period_idx >= 0 and faculty_idx >= 0:
                    for r in range(len(rooms)):
                        for s in range(len(subjects)):
                            model.Add(schedule[day_idx][period_idx][faculty_idx][r][s] == 0)
        
        # Optimization objectives (soft constraints)
        
        # Objective 1: Maximize room utilization
        room_usage = []
        for d in range(len(self.days)):
            for p in range(len(self.periods)):
                for r in range(len(rooms)):
                    room_used = model.NewBoolVar(f'room_used_d{d}_p{p}_r{r}')
                    classes_in_room = []
                    for f in range(len(faculty)):
                        for s in range(len(subjects)):
                            classes_in_room.append(schedule[d][p][f][r][s])
                    model.Add(room_used <= sum(classes_in_room))
                    room_usage.append(room_used)
        
        # Objective 2: Balance faculty workload
        faculty_workload = []
        for f in range(len(faculty)):
            workload = []
            for d in range(len(self.days)):
                for p in range(len(self.periods)):
                    for r in range(len(rooms)):
                        for s in range(len(subjects)):
                            workload.append(schedule[d][p][f][r][s])
            faculty_workload.append(sum(workload))
        
        # Create objective function
        objective_terms = []
        
        # Weight for room utilization
        for usage in room_usage:
            objective_terms.append(usage * 10)
        
        # Weight for balanced workload (minimize deviation from average)
        if len(faculty_workload) > 1:
            for i in range(len(faculty_workload) - 1):
                diff = model.NewIntVar(-100, 100, f'workload_diff_{i}')
                model.Add(diff == faculty_workload[i] - faculty_workload[i + 1])
                abs_diff = model.NewIntVar(0, 100, f'abs_workload_diff_{i}')
                model.AddAbsEquality(abs_diff, diff)
                objective_terms.append(abs_diff * -5)  # Negative weight to minimize
        
        model.Maximize(sum(objective_terms))
        
        # Solve the model
        solver = cp_model.CpSolver()
        solver.parameters.random_seed = seed
        solver.parameters.max_time_in_seconds = 30  # 30 second timeout
        
        status = solver.Solve(model)
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            return self._extract_timetable(solver, schedule, faculty, rooms, subjects)
        else:
            return None
    
    def _extract_timetable(self, solver, schedule, faculty, rooms, subjects):
        """Extract the solution from the solver"""
        
        timetable_data = {}
        for d, day in enumerate(self.days):
            timetable_data[day] = {}
            for p, period in enumerate(self.periods):
                timetable_data[day][period] = None
                
                # Find the scheduled class for this time slot
                for f, fac in enumerate(faculty):
                    for r, room in enumerate(rooms):
                        for s, subject in enumerate(subjects):
                            if solver.Value(schedule[d][p][f][r][s]) == 1:
                                timetable_data[day][period] = {
                                    'subject': subject['name'],
                                    'faculty': fac['name'],
                                    'room': room['name']
                                }
                                break
                        if timetable_data[day][period]:
                            break
                    if timetable_data[day][period]:
                        break
        
        # Calculate metrics
        metrics = self._calculate_metrics(timetable_data, faculty, rooms)
        
        return {
            'timetable': timetable_data,
            'score': metrics['score'],
            'metrics': metrics,
            'generated_at': datetime.now().isoformat()
        }
    
    def _calculate_metrics(self, timetable, faculty, rooms):
        """Calculate timetable quality metrics"""
        
        total_slots = len(self.days) * len(self.periods)
        filled_slots = 0
        faculty_load = {f['name']: 0 for f in faculty}
        room_usage = {r['name']: 0 for r in rooms}
        
        for day in self.days:
            for period in self.periods:
                slot = timetable[day][period]
                if slot:
                    filled_slots += 1
                    faculty_load[slot['faculty']] += 1
                    room_usage[slot['room']] += 1
        
        # Calculate metrics
        utilization_rate = (filled_slots / total_slots) * 100
        
        # Faculty workload balance (lower standard deviation is better)
        workloads = list(faculty_load.values())
        avg_workload = sum(workloads) / len(workloads) if workloads else 0
        workload_std = (sum((w - avg_workload) ** 2 for w in workloads) / len(workloads)) ** 0.5 if workloads else 0
        
        # Room utilization
        room_util_rate = (sum(1 for usage in room_usage.values() if usage > 0) / len(rooms)) * 100
        
        # Overall score (0-100)
        score = (utilization_rate * 0.4 + 
                (100 - min(workload_std * 10, 100)) * 0.3 + 
                room_util_rate * 0.3)
        
        return {
            'score': round(score, 2),
            'utilization_rate': round(utilization_rate, 2),
            'workload_balance': round(100 - min(workload_std * 10, 100), 2),
            'room_utilization': round(room_util_rate, 2),
            'filled_slots': filled_slots,
            'total_slots': total_slots,
            'faculty_load': faculty_load,
            'room_usage': room_usage
        }
    
    def reschedule_for_leave(self, current_timetable, leave_request, faculty, rooms):
        """Auto-reschedule timetable when leave is approved"""
        
        day_name = self._date_to_day_name(leave_request['date'])
        period = leave_request['period']
        faculty_on_leave = leave_request['faculty']
        
        # Get the affected slot
        if (day_name in current_timetable['timetable'] and 
            period in current_timetable['timetable'][day_name] and
            current_timetable['timetable'][day_name][period] and
            current_timetable['timetable'][day_name][period]['faculty'] == faculty_on_leave):
            
            affected_slot = current_timetable['timetable'][day_name][period]
            
            # Find available replacement faculty who can teach the same subject
            available_faculty = [
                f for f in faculty 
                if f['name'] != faculty_on_leave and f['subject'] == affected_slot['subject']
            ]
            
            if available_faculty:
                # Choose the faculty with the least workload
                faculty_workloads = self._calculate_faculty_workloads(current_timetable['timetable'], faculty)
                replacement = min(available_faculty, 
                                key=lambda f: faculty_workloads.get(f['name'], 0))
                
                # Update the timetable
                new_timetable = copy.deepcopy(current_timetable)
                new_timetable['timetable'][day_name][period]['faculty'] = replacement['name']
                new_timetable['metrics'] = self._calculate_metrics(
                    new_timetable['timetable'], faculty, rooms
                )
                new_timetable['score'] = new_timetable['metrics']['score']
                
                return new_timetable
            else:
                # No replacement available, mark slot as free
                new_timetable = copy.deepcopy(current_timetable)
                new_timetable['timetable'][day_name][period] = None
                new_timetable['metrics'] = self._calculate_metrics(
                    new_timetable['timetable'], faculty, rooms
                )
                new_timetable['score'] = new_timetable['metrics']['score']
                
                return new_timetable
        
        return None
    
    def _calculate_faculty_workloads(self, timetable, faculty):
        """Calculate current workload for each faculty member"""
        workloads = {f['name']: 0 for f in faculty}
        
        for day in self.days:
            for period in self.periods:
                slot = timetable[day][period]
                if slot and slot['faculty'] in workloads:
                    workloads[slot['faculty']] += 1
        
        return workloads
    
    def _get_day_index(self, date_str):
        """Convert date string to day index"""
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            day_name = date_obj.strftime('%A')
            return self.days.index(day_name) if day_name in self.days else -1
        except:
            return -1
    
    def _get_period_index(self, period):
        """Get period index from period string"""
        return self.periods.index(period) if period in self.periods else -1
    
    def _get_faculty_index(self, faculty_list, faculty_name):
        """Get faculty index from faculty name"""
        for i, fac in enumerate(faculty_list):
            if fac['name'] == faculty_name:
                return i
        return -1
    
    def _date_to_day_name(self, date_str):
        """Convert date string to day name"""
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            return date_obj.strftime('%A')
        except:
            return None


# models/database.py - Database Models (SQLite for simplicity)
import sqlite3
import json
from datetime import datetime
import os

class Database:
    def __init__(self, db_path='timetable.db'):
        self.db_path = db_path
        self.create_tables()
    
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def create_tables(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Faculty table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS faculty (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                subject TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Rooms table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                capacity INTEGER NOT NULL,
                type TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Subjects table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                code TEXT NOT NULL UNIQUE,
                credits INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Leave requests table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS leave_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                faculty_name TEXT NOT NULL,
                date TEXT NOT NULL,
                period TEXT NOT NULL,
                reason TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Timetables table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS timetables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timetable_data TEXT NOT NULL,
                score REAL NOT NULL,
                metrics TEXT NOT NULL,
                is_published BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Users table for authentication
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insert default users if they don't exist
        self._insert_default_users(cursor)
        self._insert_default_data(cursor)
        
        conn.commit()
        conn.close()
    
    def _insert_default_users(self, cursor):
        default_users = [
            ('admin', 'admin123', 'admin', 'Administrator', 'admin@school.edu'),
            ('Dr. Smith', 'faculty123', 'faculty', 'Dr. Smith', 'smith@school.edu'),
            ('Dr. Johnson', 'faculty123', 'faculty', 'Dr. Johnson', 'johnson@school.edu'),
            ('john.doe', 'student123', 'student', 'John Doe', 'john.doe@school.edu')
        ]
        
        for username, password, role, name, email in default_users:
            cursor.execute('''
                INSERT OR IGNORE INTO users (username, password, role, name, email)
                VALUES (?, ?, ?, ?, ?)
            ''', (username, password, role, name, email))
    
    def _insert_default_data(self, cursor):
        # Default faculty
        default_faculty = [
            ('Dr. Smith', 'Mathematics', 'smith@school.edu'),
            ('Dr. Johnson', 'Physics', 'johnson@school.edu'),
            ('Dr. Brown', 'Chemistry', 'brown@school.edu'),
            ('Ms. Davis', 'English', 'davis@school.edu'),
            ('Mr. Wilson', 'History', 'wilson@school.edu')
        ]
        
        for name, subject, email in default_faculty:
            cursor.execute('''
                INSERT OR IGNORE INTO faculty (name, subject, email)
                VALUES (?, ?, ?)
            ''', (name, subject, email))
        
        # Default rooms
        default_rooms = [
            ('Room 101', 30, 'Classroom'),
            ('Room 102', 30, 'Classroom'),
            ('Lab 1', 20, 'Laboratory'),
            ('Room 201', 25, 'Classroom'),
            ('Auditorium', 100, 'Auditorium')
        ]
        
        for name, capacity, room_type in default_rooms:
            cursor.execute('''
                INSERT OR IGNORE INTO rooms (name, capacity, type)
                VALUES (?, ?, ?)
            ''', (name, capacity, room_type))
        
        # Default subjects
        default_subjects = [
            ('Mathematics', 'MATH101', 3),
            ('Physics', 'PHYS101', 3),
            ('Chemistry', 'CHEM101', 3),
            ('English', 'ENG101', 2),
            ('History', 'HIST101', 2)
        ]
        
        for name, code, credits in default_subjects:
            cursor.execute('''
                INSERT OR IGNORE INTO subjects (name, code, credits)
                VALUES (?, ?, ?)
            ''', (name, code, credits))
    
    # Faculty methods
    def get_faculty(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM faculty ORDER BY name')
        faculty = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return faculty
    
    def add_faculty(self, data):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute