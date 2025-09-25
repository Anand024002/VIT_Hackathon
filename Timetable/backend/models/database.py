import sqlite3
import json
import hashlib

class Database:
    def __init__(self, db_path="timetable.db"):
        self.db_path = db_path

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
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
        cursor.execute('''
            INSERT INTO faculty (name, subject, email)
            VALUES (?, ?, ?)
        ''', (data['name'], data['subject'], data['email']))
        faculty_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return faculty_id

    def update_faculty(self, faculty_id, data):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE faculty 
            SET name = ?, subject = ?, email = ?
            WHERE id = ?
        ''', (data['name'], data['subject'], data['email'], faculty_id))
        conn.commit()
        conn.close()

    def delete_faculty(self, faculty_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM faculty WHERE id = ?', (faculty_id,))
        conn.commit()
        conn.close()

    def get_faculty_by_id(self, faculty_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM faculty WHERE id = ?', (faculty_id,))
        faculty = cursor.fetchone()
        conn.close()
        return dict(faculty) if faculty else None

    def get_faculty_by_name(self, name):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM faculty WHERE name = ?', (name,))
        faculty = cursor.fetchone()
        conn.close()
        return dict(faculty) if faculty else None

    # Room methods
    def get_rooms(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM rooms ORDER BY name')
        rooms = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rooms

    def add_room(self, data):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO rooms (name, capacity, type)
            VALUES (?, ?, ?)
        ''', (data['name'], data['capacity'], data['type']))
        room_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return room_id

    def update_room(self, room_id, data):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE rooms 
            SET name = ?, capacity = ?, type = ?
            WHERE id = ?
        ''', (data['name'], data['capacity'], data['type'], room_id))
        conn.commit()
        conn.close()

    def delete_room(self, room_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM rooms WHERE id = ?', (room_id,))
        conn.commit()
        conn.close()

    def get_room_by_id(self, room_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM rooms WHERE id = ?', (room_id,))
        room = cursor.fetchone()
        conn.close()
        return dict(room) if room else None

    # Subject methods
    def get_subjects(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM subjects ORDER BY name')
        subjects = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return subjects

    def add_subject(self, data):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO subjects (name, code, credits)
            VALUES (?, ?, ?)
        ''', (data['name'], data['code'], data['credits']))
        subject_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return subject_id

    def update_subject(self, subject_id, data):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE subjects 
            SET name = ?, code = ?, credits = ?
            WHERE id = ?
        ''', (data['name'], data['code'], data['credits'], subject_id))
        conn.commit()
        conn.close()

    def delete_subject(self, subject_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM subjects WHERE id = ?', (subject_id,))
        conn.commit()
        conn.close()

    def get_subject_by_id(self, subject_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM subjects WHERE id = ?', (subject_id,))
        subject = cursor.fetchone()
        conn.close()
        return dict(subject) if subject else None

    # Leave request methods
    def get_leave_requests(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM leave_requests ORDER BY created_at DESC')
        requests = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return requests

    def add_leave_request(self, data):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO leave_requests (faculty_name, date, period, reason, status)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data['faculty'], 
            data['date'], 
            data['period'], 
            data['reason'],
            data.get('status', 'pending')
        ))
        request_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return request_id

    def update_leave_request(self, request_id, data):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE leave_requests 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (data['status'], request_id))
        conn.commit()
        conn.close()

    def get_leave_request(self, request_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM leave_requests WHERE id = ?', (request_id,))
        request = cursor.fetchone()
        conn.close()
        return dict(request) if request else None

    def get_approved_leave_requests(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM leave_requests WHERE status = 'approved' ORDER BY date ASC")
        requests = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return requests

    def get_pending_leave_requests(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM leave_requests WHERE status = 'pending' ORDER BY created_at DESC")
        requests = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return requests

    def get_leave_requests_by_faculty(self, faculty_name):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM leave_requests WHERE faculty_name = ? ORDER BY created_at DESC", 
            (faculty_name,)
        )
        requests = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return requests

    def get_leave_requests_by_status(self, status):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM leave_requests WHERE status = ? ORDER BY created_at DESC", 
            (status,)
        )
        requests = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return requests

    def delete_leave_request(self, request_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM leave_requests WHERE id = ?', (request_id,))
        conn.commit()
        conn.close()

    # Timetable methods
    def save_timetable(self, timetable_data):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO timetables (timetable_data, score, metrics)
            VALUES (?, ?, ?)
        ''', (
            json.dumps(timetable_data['timetable']),
            timetable_data.get('score', 0),
            json.dumps(timetable_data.get('metrics', {}))
        ))
        timetable_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return timetable_id

    def get_published_timetable(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM timetables WHERE is_published = TRUE 
            ORDER BY created_at DESC LIMIT 1
        ''')
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row['id'],
                'timetable': json.loads(row['timetable_data']),
                'score': row['score'],
                'metrics': json.loads(row['metrics']) if row['metrics'] else {},
                'created_at': row['created_at']
            }
        return None

    def get_timetable_by_id(self, timetable_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM timetables WHERE id = ?', (timetable_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row['id'],
                'timetable': json.loads(row['timetable_data']),
                'score': row['score'],
                'metrics': json.loads(row['metrics']) if row['metrics'] else {},
                'created_at': row['created_at'],
                'is_published': row['is_published']
            }
        return None

    def get_all_timetables(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM timetables ORDER BY created_at DESC')
        rows = cursor.fetchall()
        conn.close()
        
        timetables = []
        for row in rows:
            timetables.append({
                'id': row['id'],
                'timetable': json.loads(row['timetable_data']),
                'score': row['score'],
                'metrics': json.loads(row['metrics']) if row['metrics'] else {},
                'created_at': row['created_at'],
                'is_published': row['is_published']
            })
        
        return timetables

    def publish_timetable(self, timetable_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # First, check if the timetable exists
        cursor.execute('SELECT id FROM timetables WHERE id = ?', (timetable_id,))
        if not cursor.fetchone():
            conn.close()
            raise ValueError(f"Timetable with ID {timetable_id} not found")
        
        # First, unpublish all existing timetables
        cursor.execute('UPDATE timetables SET is_published = FALSE')
        
        # Then publish the selected timetable
        cursor.execute('''
            UPDATE timetables SET is_published = TRUE 
            WHERE id = ?
        ''', (timetable_id,))
        
        conn.commit()
        conn.close()

    def unpublish_timetable(self, timetable_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE timetables SET is_published = FALSE 
            WHERE id = ?
        ''', (timetable_id,))
        conn.commit()
        conn.close()

    def delete_timetable(self, timetable_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM timetables WHERE id = ?', (timetable_id,))
        conn.commit()
        conn.close()

    def is_timetable_published(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) as count FROM timetables WHERE is_published = TRUE')
        result = cursor.fetchone()
        conn.close()
        return result['count'] > 0

    # Authentication methods
    def authenticate_user(self, username, password, role):
        # Hash the input password before comparison
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM users 
            WHERE username = ? AND password = ? AND role = ?
        ''', (username, hashed_password, role))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return {
                'id': user['id'],
                'username': user['username'],
                'role': user['role'],
                'name': user['name'],
                'email': user['email']
            }
        return None

    def add_user(self, data):
        # Hash the password before storing
        hashed_data = data.copy()
        if 'password' in hashed_data:
            hashed_data['password'] = hashlib.sha256(hashed_data['password'].encode()).hexdigest()
        
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO users (username, password, role, name, email)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            hashed_data['username'], 
            hashed_data['password'], 
            hashed_data['role'], 
            hashed_data.get('name', ''), 
            hashed_data.get('email', '')
        ))
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return user_id

    def get_user_by_id(self, user_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        conn.close()
        return dict(user) if user else None

    def get_user_by_username(self, username):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        conn.close()
        return dict(user) if user else None

    def update_user(self, user_id, data):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE users 
            SET username = ?, password = ?, role = ?, name = ?, email = ?
            WHERE id = ?
        ''', (
            data['username'], 
            data['password'], 
            data['role'], 
            data.get('name', ''), 
            data.get('email', ''),
            user_id
        ))
        conn.commit()
        conn.close()

    def delete_user(self, user_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        conn.close()

    def get_all_users(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users ORDER BY username')
        users = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return users

    # Utility methods
    def clear_all_data(self):
        """Clear all data from all tables (use with caution)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Clear all tables
        tables = ['faculty', 'rooms', 'subjects', 'leave_requests', 'timetables']
        for table in tables:
            cursor.execute(f'DELETE FROM {table}')
        
        conn.commit()
        conn.close()

    def get_database_stats(self):
        """Get statistics about the database"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        stats = {}
        tables = ['faculty', 'rooms', 'subjects', 'leave_requests', 'timetables', 'users']
        
        for table in tables:
            cursor.execute(f'SELECT COUNT(*) as count FROM {table}')
            result = cursor.fetchone()
            stats[table] = result['count']
        
        conn.close()
        return stats

    # Create tables method
    def create_tables(self):
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS faculty (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                subject TEXT NOT NULL,
                email TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                capacity INTEGER DEFAULT 0,
                type TEXT DEFAULT 'Classroom',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                code TEXT UNIQUE,
                credits INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS leave_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                faculty_name TEXT NOT NULL,
                date TEXT NOT NULL,
                period TEXT NOT NULL,
                reason TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (faculty_name) REFERENCES faculty(name)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS timetables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timetable_data TEXT NOT NULL,
                score REAL DEFAULT 0,
                metrics TEXT DEFAULT '{}',
                is_published BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                name TEXT DEFAULT '',
                email TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create indexes for better performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_faculty_name ON faculty(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_rooms_name ON rooms(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_leave_faculty ON leave_requests(faculty_name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_timetable_published ON timetables(is_published)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')

        conn.commit()
        conn.close()

    def create_default_users(self):
        """Create default users for the system"""
        try:
            # Check if admin user exists
            if not self.get_user_by_username('admin'):
                self.add_user({
                    'username': 'admin',
                    'password': hashlib.sha256('admin123'.encode()).hexdigest(),  # Hash the password
                    'role': 'admin',
                    'name': 'System Administrator',
                    'email': 'admin@college.edu'
                })

            # Check if a sample faculty user exists
            if not self.get_user_by_username('faculty1'):
                self.add_user({
                    'username': 'faculty1',
                    'password': hashlib.sha256('faculty123'.encode()).hexdigest(),  # Hash the password
                    'role': 'faculty',
                    'name': 'John Doe',
                    'email': 'john.doe@college.edu'
                })

            # Check if a student user exists
            if not self.get_user_by_username('student1'):
                self.add_user({
                    'username': 'student1',
                    'password': hashlib.sha256('student123'.encode()).hexdigest(),  # Hash the password
                    'role': 'student',
                    'name': 'Jane Smith',
                    'email': 'jane.smith@college.edu'
                })

        except Exception as e:
            print(f"Error creating default users: {e}")

    def initialize_database(self):
        """Initialize the database with tables and default data"""
        self.create_tables()
        self.create_default_users()