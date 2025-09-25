# optimizer/timetable_optimizer_fixed.py - Fixed Optimizer with Breaks and Practicals Support
from ortools.sat.python import cp_model
import random
from datetime import datetime
from typing import List, Dict, Any, Optional
import copy

class TimetableOptimizer:
    def __init__(self):
        self.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        self.periods = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-1:00', '2:00-3:00', '3:00-4:00']
        
    def generate_optimized_timetables(self, faculty, rooms, subjects, leave_requests=None, constraints=None, breaks=None, practicals=None):
        """Generate multiple optimized timetable options using CP-SAT solver"""
        
        if leave_requests is None:
            leave_requests = []
        if constraints is None:
            constraints = {}
        if breaks is None:
            breaks = []
        if practicals is None:
            practicals = []
            
        print(f"Starting optimization with {len(faculty)} faculty, {len(rooms)} rooms, {len(subjects)} subjects")
        print(f"Breaks: {len(breaks)}, Practicals: {len(practicals)}")
            
        timetables = []
        
        # Generate 3 different optimized timetables with different seeds
        for attempt in range(3):
            print(f"Generating timetable attempt {attempt + 1}")
            timetable = self._generate_single_timetable(
                faculty, rooms, subjects, leave_requests, constraints, breaks, practicals, attempt
            )
            if timetable:
                timetables.append(timetable)
                print(f"Attempt {attempt + 1} successful with score {timetable['score']}")
        
        # If no optimized solutions, try fallback
        if not timetables:
            print("No optimized solutions found, trying fallback...")
            fallback = self._generate_fallback_timetable(faculty, rooms, subjects, leave_requests, breaks, practicals)
            if fallback:
                timetables.append(fallback)
        
        # Sort by score (higher is better)
        timetables.sort(key=lambda t: t['score'], reverse=True)
        
        print(f"Generated {len(timetables)} timetable options")
        return timetables
    
    def _generate_single_timetable(self, faculty, rooms, subjects, leave_requests, constraints, breaks, practicals, seed=0):
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
        
        # Constraint 1: Each time slot can have at most one class per room
        for d in range(len(self.days)):
            for p in range(len(self.periods)):
                for r in range(len(rooms)):
                    room_classes = []
                    for f in range(len(faculty)):
                        for s in range(len(subjects)):
                            room_classes.append(schedule[d][p][f][r][s])
                    model.Add(sum(room_classes) <= 1)
        
        # Constraint 2: Faculty can teach at most one class at a time
        for d in range(len(self.days)):
            for p in range(len(self.periods)):
                for f in range(len(faculty)):
                    faculty_classes = []
                    for r in range(len(rooms)):
                        for s in range(len(subjects)):
                            faculty_classes.append(schedule[d][p][f][r][s])
                    model.Add(sum(faculty_classes) <= 1)
        
        # Constraint 3: Faculty-Subject compatibility (IMPROVED)
        for d in range(len(self.days)):
            for p in range(len(self.periods)):
                for f, fac in enumerate(faculty):
                    for r in range(len(rooms)):
                        for s, subject in enumerate(subjects):
                            # Enhanced subject matching
                            faculty_subject = fac['subject'].lower()
                            subject_name = subject['name'].lower()
                            
                            # Check if faculty can teach this subject
                            can_teach = (
                                faculty_subject == subject_name or
                                faculty_subject in subject_name or
                                subject_name in faculty_subject or
                                self._can_faculty_teach_subject(faculty_subject, subject_name)
                            )
                            
                            if not can_teach:
                                model.Add(schedule[d][p][f][r][s] == 0)
        
        # Constraint 4: Leave requests - faculty not available
        for leave in leave_requests:
            if leave.get('status') == 'approved':
                day_idx = self._get_day_index(leave['date'])
                period_idx = self._get_period_index(leave['period'])
                faculty_idx = self._get_faculty_index(faculty, leave.get('faculty_name', leave.get('faculty')))
                
                if day_idx >= 0 and period_idx >= 0 and faculty_idx >= 0:
                    for r in range(len(rooms)):
                        for s in range(len(subjects)):
                            model.Add(schedule[day_idx][period_idx][faculty_idx][r][s] == 0)
        
        # Constraint 5: Breaks - no regular classes during break times
        break_slots = self._get_break_slots(breaks)
        for day_idx, period_idx in break_slots:
            if 0 <= day_idx < len(self.days) and 0 <= period_idx < len(self.periods):
                for f in range(len(faculty)):
                    for r in range(len(rooms)):
                        for s in range(len(subjects)):
                            model.Add(schedule[day_idx][period_idx][f][r][s] == 0)
        
        # Constraint 6: Subject diversity - prevent same subject all day
        for d in range(len(self.days)):
            for s in range(len(subjects)):
                subject_classes_today = []
                for p in range(len(self.periods)):
                    for f in range(len(faculty)):
                        for r in range(len(rooms)):
                            subject_classes_today.append(schedule[d][p][f][r][s])
                # Limit same subject to max 3 periods per day
                model.Add(sum(subject_classes_today) <= 3)
        
        # Constraint 7: Faculty workload balance
        for f in range(len(faculty)):
            faculty_total_classes = []
            for d in range(len(self.days)):
                for p in range(len(self.periods)):
                    for r in range(len(rooms)):
                        for s in range(len(subjects)):
                            faculty_total_classes.append(schedule[d][p][f][r][s])
            # Each faculty should teach at least 2 classes and not more than 8
            model.Add(sum(faculty_total_classes) >= 2)
            model.Add(sum(faculty_total_classes) <= 8)
        
        # Simplified objective function
        objective_terms = []
        
        # Maximize total number of classes scheduled
        total_classes = []
        for d in range(len(self.days)):
            for p in range(len(self.periods)):
                for f in range(len(faculty)):
                    for r in range(len(rooms)):
                        for s in range(len(subjects)):
                            total_classes.append(schedule[d][p][f][r][s])
        objective_terms.append(sum(total_classes) * 100)
        
        # Encourage balanced faculty workload
        if len(faculty) > 1:
            faculty_workload_vars = []
            for f in range(len(faculty)):
                workload = model.NewIntVar(0, len(self.days) * len(self.periods), f'workload_f{f}')
                workload_expr = []
                for d in range(len(self.days)):
                    for p in range(len(self.periods)):
                        for r in range(len(rooms)):
                            for s in range(len(subjects)):
                                workload_expr.append(schedule[d][p][f][r][s])
                model.Add(workload == sum(workload_expr))
                faculty_workload_vars.append(workload)
            
            # Minimize workload variance
            max_workload = model.NewIntVar(0, len(self.days) * len(self.periods), 'max_workload')
            min_workload = model.NewIntVar(0, len(self.days) * len(self.periods), 'min_workload')
            model.AddMaxEquality(max_workload, faculty_workload_vars)
            model.AddMinEquality(min_workload, faculty_workload_vars)
            workload_diff = model.NewIntVar(0, len(self.days) * len(self.periods), 'workload_diff')
            model.Add(workload_diff == max_workload - min_workload)
            objective_terms.append(workload_diff * -20)  # Penalty for imbalance
        
        # Maximize room utilization
        room_usage = []
        for d in range(len(self.days)):
            for p in range(len(self.periods)):
                if (d, p) not in break_slots:  # Skip break slots
                    for r in range(len(rooms)):
                        room_used = model.NewBoolVar(f'room_used_d{d}_p{p}_r{r}')
                        classes_in_room = []
                        for f in range(len(faculty)):
                            for s in range(len(subjects)):
                                classes_in_room.append(schedule[d][p][f][r][s])
                        model.Add(room_used <= sum(classes_in_room))
                        room_usage.append(room_used)
        
        for usage in room_usage:
            objective_terms.append(usage * 30)
        
        model.Maximize(sum(objective_terms))
        
        # Solve the model
        solver = cp_model.CpSolver()
        solver.parameters.random_seed = seed
        solver.parameters.max_time_in_seconds = 45  # Increased timeout
        
        status = solver.Solve(model)
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            return self._extract_timetable(solver, schedule, faculty, rooms, subjects, breaks, practicals)
        else:
            print(f"Optimization failed with status: {status}")
            return None
    
    def _can_faculty_teach_subject(self, faculty_subject, subject_name):
        """Enhanced faculty-subject matching logic"""
        subject_mappings = {
            'mathematics': ['calculus', 'algebra', 'geometry', 'statistics', 'math'],
            'physics': ['mechanics', 'thermodynamics', 'electromagnetism', 'quantum'],
            'chemistry': ['organic', 'inorganic', 'physical chemistry', 'biochemistry'],
            'biology': ['cell biology', 'genetics', 'ecology', 'anatomy', 'botany', 'zoology'],
            'computer science': ['programming', 'algorithms', 'data structures', 'software engineering', 'cs'],
            'english': ['literature', 'composition', 'writing', 'grammar', 'linguistics'],
            'history': ['world history', 'american history', 'european history', 'ancient history'],
            'economics': ['microeconomics', 'macroeconomics', 'finance', 'business'],
            'psychology': ['cognitive', 'behavioral', 'social psychology', 'developmental'],
            'engineering': ['mechanical', 'electrical', 'civil', 'chemical engineering']
        }
        
        for key, subjects in subject_mappings.items():
            if key in faculty_subject:
                return any(subj in subject_name for subj in subjects)
        
        return False
    
    def _get_break_slots(self, breaks):
        """Convert breaks to (day_index, period_index) tuples"""
        break_slots = set()
        
        for break_item in breaks:
            start_time = break_item.get('startTime', '')
            duration = int(break_item.get('duration', 60))
            
            # Find starting period
            start_period_idx = -1
            for i, period in enumerate(self.periods):
                period_start = period.split('-')[0]
                if period_start == start_time:
                    start_period_idx = i
                    break
            
            if start_period_idx >= 0:
                # Calculate how many periods the break covers
                periods_covered = max(1, duration // 60)
                
                # Apply break to all days (or specific days if specified)
                days_to_apply = [break_item.get('day')] if 'day' in break_item else self.days
                
                for day_name in days_to_apply:
                    if day_name in self.days:
                        day_idx = self.days.index(day_name)
                        for p in range(start_period_idx, min(start_period_idx + periods_covered, len(self.periods))):
                            break_slots.add((day_idx, p))
                    else:
                        # Apply to all days if no specific day
                        for day_idx in range(len(self.days)):
                            for p in range(start_period_idx, min(start_period_idx + periods_covered, len(self.periods))):
                                break_slots.add((day_idx, p))
        
        return list(break_slots)
    
    def _extract_timetable(self, solver, schedule, faculty, rooms, subjects, breaks, practicals):
        """Extract the solution from the solver"""
        
        timetable_data = {}
        break_slots = self._get_break_slots(breaks)
        
        for d, day in enumerate(self.days):
            timetable_data[day] = {}
            for p, period in enumerate(self.periods):
                # Check if this is a break slot
                if (d, p) in break_slots:
                    # Find the break info
                    break_info = self._get_break_info_for_slot(d, p, breaks)
                    timetable_data[day][period] = {
                        'subject': 'BREAK',
                        'faculty': 'N/A',
                        'room': 'N/A',
                        'type': 'break',
                        'name': break_info.get('name', 'Break Time')
                    }
                else:
                    timetable_data[day][period] = None
                    
                    # Find the scheduled class for this time slot
                    for f, fac in enumerate(faculty):
                        for r, room in enumerate(rooms):
                            for s, subject in enumerate(subjects):
                                if solver.Value(schedule[d][p][f][r][s]) == 1:
                                    # Check if this should be a practical session
                                    is_practical = self._is_practical_session(
                                        subject['name'], fac['name'], room['name'], practicals
                                    )
                                    
                                    if is_practical:
                                        practical_info = self._get_practical_info(
                                            subject['name'], fac['name'], room['name'], practicals
                                        )
                                        timetable_data[day][period] = {
                                            'subject': subject['name'],
                                            'faculty': fac['name'],
                                            'room': room['name'],
                                            'type': 'practical',
                                            'duration': practical_info.get('duration', 120),
                                            'description': practical_info.get('description', '')
                                        }
                                    else:
                                        timetable_data[day][period] = {
                                            'subject': subject['name'],
                                            'faculty': fac['name'],
                                            'room': room['name'],
                                            'type': 'regular'
                                        }
                                    break
                            if timetable_data[day][period]:
                                break
                        if timetable_data[day][period]:
                            break
        
        # Calculate metrics
        metrics = self._calculate_metrics(timetable_data, faculty, rooms, subjects)
        
        return {
            'timetable': timetable_data,
            'score': metrics['score'],
            'metrics': metrics,
            'generated_at': datetime.now().isoformat()
        }
    
    def _get_break_info_for_slot(self, day_idx, period_idx, breaks):
        """Get break information for a specific slot"""
        for break_item in breaks:
            start_time = break_item.get('startTime', '')
            duration = int(break_item.get('duration', 60))
            
            # Find starting period
            start_period_idx = -1
            for i, period in enumerate(self.periods):
                period_start = period.split('-')[0]
                if period_start == start_time:
                    start_period_idx = i
                    break
            
            if start_period_idx >= 0:
                periods_covered = max(1, duration // 60)
                if start_period_idx <= period_idx < start_period_idx + periods_covered:
                    return break_item
        
        return {}
    
    def _is_practical_session(self, subject_name, faculty_name, room_name, practicals):
        """Check if this should be a practical session"""
        for practical in practicals:
            if (practical.get('subject') == subject_name and 
                practical.get('faculty') == faculty_name and 
                practical.get('room') == room_name):
                return True
        return False
    
    def _get_practical_info(self, subject_name, faculty_name, room_name, practicals):
        """Get practical session information"""
        for practical in practicals:
            if (practical.get('subject') == subject_name and 
                practical.get('faculty') == faculty_name and 
                practical.get('room') == room_name):
                return practical
        return {}
    
    def _generate_fallback_timetable(self, faculty, rooms, subjects, leave_requests, breaks, practicals):
        """Generate a fallback timetable when optimization fails"""
        print("Generating fallback timetable...")
        
        timetable_data = {}
        break_slots = self._get_break_slots(breaks)
        
        # Initialize empty timetable
        for d, day in enumerate(self.days):
            timetable_data[day] = {}
            for p, period in enumerate(self.periods):
                if (d, p) in break_slots:
                    break_info = self._get_break_info_for_slot(d, p, breaks)
                    timetable_data[day][period] = {
                        'subject': 'BREAK',
                        'faculty': 'N/A',
                        'room': 'N/A',
                        'type': 'break',
                        'name': break_info.get('name', 'Break Time')
                    }
                else:
                    timetable_data[day][period] = None
        
        # Simple round-robin assignment avoiding breaks and leave conflicts
        faculty_idx = 0
        room_idx = 0
        subject_idx = 0
        subject_count = {s['name']: 0 for s in subjects}
        
        for d, day in enumerate(self.days):
            for p, period in enumerate(self.periods):
                # Skip if break slot
                if (d, p) in break_slots:
                    continue
                    
                # Skip if leave conflict
                skip_slot = False
                for leave in leave_requests:
                    if (leave.get('status') == 'approved' and 
                        self._get_day_index(leave['date']) == d and 
                        self._get_period_index(leave['period']) == p):
                        skip_slot = True
                        break
                
                if not skip_slot and faculty and rooms and subjects:
                    attempts = 0
                    while attempts < len(subjects) * 2:  # Limit attempts to prevent infinite loop
                        fac = faculty[faculty_idx % len(faculty)]
                        room = rooms[room_idx % len(rooms)]
                        subject = subjects[subject_idx % len(subjects)]
                        
                        # Check if faculty can teach this subject
                        if self._can_faculty_teach_subject(fac['subject'].lower(), subject['name'].lower()):
                            # Check if subject hasn't been overused today
                            daily_subject_count = sum(
                                1 for slot in timetable_data[day].values() 
                                if slot and slot.get('subject') == subject['name']
                            )
                            
                            if daily_subject_count < 2:  # Max 2 sessions per subject per day
                                # Check if this should be a practical
                                is_practical = self._is_practical_session(
                                    subject['name'], fac['name'], room['name'], practicals
                                )
                                
                                if is_practical:
                                    practical_info = self._get_practical_info(
                                        subject['name'], fac['name'], room['name'], practicals
                                    )
                                    timetable_data[day][period] = {
                                        'subject': subject['name'],
                                        'faculty': fac['name'],
                                        'room': room['name'],
                                        'type': 'practical',
                                        'duration': practical_info.get('duration', 120),
                                        'description': practical_info.get('description', '')
                                    }
                                else:
                                    timetable_data[day][period] = {
                                        'subject': subject['name'],
                                        'faculty': fac['name'],
                                        'room': room['name'],
                                        'type': 'regular'
                                    }
                                
                                subject_count[subject['name']] += 1
                                break
                        
                        # Move to next combination
                        subject_idx = (subject_idx + 1) % len(subjects)
                        if subject_idx == 0:
                            faculty_idx = (faculty_idx + 1) % len(faculty)
                            if faculty_idx == 0:
                                room_idx = (room_idx + 1) % len(rooms)
                        attempts += 1
                    
                    faculty_idx = (faculty_idx + 1) % len(faculty)
                    room_idx = (room_idx + 1) % len(rooms)
                    subject_idx = (subject_idx + 1) % len(subjects)
        
        # Calculate metrics
        metrics = self._calculate_metrics(timetable_data, faculty, rooms, subjects)
        
        return {
            'timetable': timetable_data,
            'score': max(10, metrics['score'] // 2),  # Lower score for fallback
            'metrics': metrics,
            'generated_at': datetime.now().isoformat()
        }
    
    def _calculate_metrics(self, timetable, faculty, rooms, subjects):
        """Calculate timetable quality metrics"""
        
        total_slots = len(self.days) * len(self.periods)
        filled_slots = 0
        break_slots = 0
        practical_slots = 0
        faculty_load = {f['name']: 0 for f in faculty}
        room_usage = {r['name']: 0 for r in rooms}
        subject_distribution = {}
        
        for day in self.days:
            for period in self.periods:
                slot = timetable[day][period]
                if slot:
                    if slot.get('type') == 'break' or slot.get('subject') == 'BREAK':
                        break_slots += 1
                    elif slot.get('type') == 'practical':
                        practical_slots += 1
                        filled_slots += 1
                    else:
                        filled_slots += 1
                    
                    if slot.get('faculty') and slot.get('faculty') != 'N/A':
                        faculty_load[slot['faculty']] = faculty_load.get(slot['faculty'], 0) + 1
                    
                    if slot.get('room') and slot.get('room') != 'N/A':
                        room_usage[slot['room']] = room_usage.get(slot['room'], 0) + 1
                    
                    if slot.get('subject') and slot.get('subject') != 'BREAK':
                        subject_distribution[slot['subject']] = subject_distribution.get(slot['subject'], 0) + 1
        
        # Calculate metrics (excluding break slots from utilization)
        available_slots = total_slots - break_slots
        utilization_rate = (filled_slots / available_slots * 100) if available_slots > 0 else 0
        
        # Faculty workload balance
        workloads = list(faculty_load.values())
        if workloads:
            avg_workload = sum(workloads) / len(workloads)
            workload_std = (sum((w - avg_workload) ** 2 for w in workloads) / len(workloads)) ** 0.5
        else:
            workload_std = 0
        
        # Room utilization
        room_util_rate = (sum(1 for usage in room_usage.values() if usage > 0) / len(rooms)) * 100 if rooms else 0
        
        # Subject diversity score
        subject_diversity = len(subject_distribution) / len(subjects) * 100 if subjects else 0
        
        # Overall score (0-100)
        score = (
            utilization_rate * 0.35 + 
            (100 - min(workload_std * 10, 100)) * 0.25 + 
            room_util_rate * 0.25 +
            subject_diversity * 0.15
        )
        
        return {
            'score': round(score, 2),
            'utilization_rate': round(utilization_rate, 2),
            'workload_balance': round(100 - min(workload_std * 10, 100), 2),
            'room_utilization': round(room_util_rate, 2),
            'subject_diversity': round(subject_diversity, 2),
            'filled_slots': filled_slots,
            'break_slots': break_slots,
            'practical_slots': practical_slots,
            'total_slots': total_slots,
            'faculty_load': faculty_load,
            'room_usage': room_usage,
            'subject_distribution': subject_distribution
        }
    
    def reschedule_for_leave(self, current_timetable, leave_request, faculty, rooms):
        """Auto-reschedule timetable when leave is approved"""
        
        day_name = self._date_to_day_name(leave_request['date'])
        period = leave_request['period']
        faculty_on_leave = leave_request.get('faculty_name', leave_request.get('faculty'))
        
        # Get the affected slot
        if (day_name in current_timetable['timetable'] and 
            period in current_timetable['timetable'][day_name] and
            current_timetable['timetable'][day_name][period] and
            current_timetable['timetable'][day_name][period]['faculty'] == faculty_on_leave):
            
            affected_slot = current_timetable['timetable'][day_name][period]
            
            # Find available replacement faculty who can teach the same subject
            available_faculty = [
                f for f in faculty 
                if (f['name'] != faculty_on_leave and 
                    self._can_faculty_teach_subject(f['subject'].lower(), affected_slot['subject'].lower()))
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
                    new_timetable['timetable'], faculty, rooms, subjects
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
                if slot and slot.get('type') != 'break' and slot.get('faculty') in workloads:
                    workloads[slot['faculty']] += 1
        
        return workloads
    
    def _get_day_index(self, date_str):
        """Convert date string to day index"""
        try:
            if isinstance(date_str, str):
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                day_name = date_obj.strftime('%A')
                return self.days.index(day_name) if day_name in self.days else -1
        except:
            pass
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
            if isinstance(date_str, str):
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                return date_obj.strftime('%A')
        except:
            pass
        return None