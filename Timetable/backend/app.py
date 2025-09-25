# app.py - Fixed Flask Application with proper breaks and practicals handling
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import json
import os
import traceback

# Import from your existing files
from models.database import Database
# Use the fixed optimizer
from optimizer.timetable_optimizer_fixed import TimetableOptimizer

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Initialize database and optimizer
db = Database()
optimizer = TimetableOptimizer()

# Ensure database tables exist
try:
    db.create_tables()
    db.create_default_users()
    print("Database tables created/verified successfully")
except Exception as e:
    print(f"Database initialization error: {e}")

# Error handler
@app.errorhandler(Exception)
def handle_exception(e):
    print(f"Unhandled exception: {e}")
    traceback.print_exc()
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Test database connection
        conn = db.get_connection()
        conn.close()
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'service': 'Smart Timetable Scheduler Backend',
            'database': 'connected'
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.now().isoformat(),
            'error': str(e)
        }), 500

# Faculty endpoints
@app.route('/api/faculty', methods=['GET'])
def get_faculty():
    try:
        faculty = db.get_faculty()
        return jsonify({'success': True, 'data': faculty})
    except Exception as e:
        print(f"Error fetching faculty: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/faculty', methods=['POST'])
def add_faculty():
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['name', 'subject', 'email']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        # Check for duplicates
        existing_faculty = db.get_faculty()
        if any(f['name'].lower() == data['name'].lower() or f['email'].lower() == data['email'].lower() 
               for f in existing_faculty):
            return jsonify({'success': False, 'error': 'Faculty with this name or email already exists'}), 400
        
        faculty_id = db.add_faculty(data)
        return jsonify({'success': True, 'data': faculty_id})
    except Exception as e:
        print(f"Error adding faculty: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/faculty/<int:faculty_id>', methods=['PUT'])
def update_faculty(faculty_id):
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        db.update_faculty(faculty_id, data)
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        print(f"Error updating faculty: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/faculty/<int:faculty_id>', methods=['DELETE'])
def delete_faculty(faculty_id):
    try:
        db.delete_faculty(faculty_id)
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error deleting faculty: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

# Room endpoints
@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    try:
        rooms = db.get_rooms()
        return jsonify({'success': True, 'data': rooms})
    except Exception as e:
        print(f"Error fetching rooms: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rooms', methods=['POST'])
def add_room():
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        required_fields = ['name', 'capacity', 'type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        room_id = db.add_room(data)
        return jsonify({'success': True, 'data': room_id})
    except Exception as e:
        print(f"Error adding room: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/rooms/<int:room_id>', methods=['DELETE'])
def delete_room(room_id):
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM rooms WHERE id = ?', (room_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error deleting room: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

# Subject endpoints
@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    try:
        subjects = db.get_subjects()
        return jsonify({'success': True, 'data': subjects})
    except Exception as e:
        print(f"Error fetching subjects: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/subjects', methods=['POST'])
def add_subject():
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        required_fields = ['name', 'code', 'credits']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        subject_id = db.add_subject(data)
        return jsonify({'success': True, 'data': subject_id})
    except Exception as e:
        print(f"Error adding subject: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/subjects/<int:subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM subjects WHERE id = ?', (subject_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error deleting subject: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

# Leave request endpoints
@app.route('/api/leave-requests', methods=['GET'])
def get_leave_requests():
    try:
        requests = db.get_leave_requests()
        return jsonify({'success': True, 'data': requests})
    except Exception as e:
        print(f"Error fetching leave requests: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/leave-requests', methods=['POST'])
def add_leave_request():
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Map frontend field names to backend field names if needed
        leave_data = {
            'faculty': data.get('faculty') or data.get('faculty_name'),
            'date': data.get('date'),
            'period': data.get('period'),
            'reason': data.get('reason', '')
        }
        
        required_fields = ['faculty', 'date', 'period']
        for field in required_fields:
            if not leave_data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        request_id = db.add_leave_request(leave_data)
        return jsonify({'success': True, 'data': request_id})
    except Exception as e:
        print(f"Error adding leave request: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/leave-requests/<int:request_id>', methods=['PUT'])
def update_leave_request(request_id):
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        db.update_leave_request(request_id, data)
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error updating leave request: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

# Enhanced timetable generation endpoint with breaks and practicals support
@app.route('/api/generate-timetable', methods=['POST'])
def generate_timetable():
    try:
        # Get input data
        data = request.json or {}
        constraints = data.get('constraints', {})
        breaks = data.get('breaks', [])  # Get breaks from the request
        practicals = data.get('practicals', [])  # Get practicals from the request
        
        print("=== TIMETABLE GENERATION REQUEST ===")
        print(f"Constraints: {constraints}")
        print(f"Breaks received: {len(breaks)}")
        print(f"Practicals received: {len(practicals)}")
        
        # Log break details for debugging
        for i, break_item in enumerate(breaks):
            print(f"Break {i+1}: {break_item}")
            
        # Log practical details for debugging
        for i, practical in enumerate(practicals):
            print(f"Practical {i+1}: {practical}")
        
        # Fetch all required data from database
        faculty = db.get_faculty()
        rooms = db.get_rooms()
        subjects = db.get_subjects()
        leave_requests = db.get_approved_leave_requests()
        
        print(f"Data loaded - Faculty: {len(faculty)}, Rooms: {len(rooms)}, Subjects: {len(subjects)}")
        print(f"Leave requests: {len(leave_requests)}")
        
        # Validate minimum requirements
        if not faculty or not rooms or not subjects:
            return jsonify({
                'success': False, 
                'error': f'Minimum requirements not met. Need at least 1 faculty ({len(faculty)}), 1 room ({len(rooms)}), and 1 subject ({len(subjects)}).'
            }), 400
        
        # Generate optimized timetables with breaks and practicals
        print("Starting optimization...")
        timetables = optimizer.generate_optimized_timetables(
            faculty=faculty,
            rooms=rooms,
            subjects=subjects,
            leave_requests=leave_requests,
            constraints=constraints,
            breaks=breaks,  # Pass breaks to the optimizer
            practicals=practicals  # Pass practicals to the optimizer
        )
        
        if not timetables:
            return jsonify({
                'success': False,
                'error': 'Could not generate any valid timetable. Please check constraints and data.'
            }), 400
        
        # Save the best timetable option
        best_timetable = timetables[0]
        timetable_id = db.save_timetable(best_timetable)
        
        print(f"Generated {len(timetables)} timetable options, best score: {best_timetable['score']}")
        print(f"Saved timetable with ID: {timetable_id}")
        
        # Log timetable structure for debugging
        sample_day = list(best_timetable['timetable'].keys())[0]
        sample_periods = list(best_timetable['timetable'][sample_day].keys())[:3]
        print(f"Sample timetable slots for {sample_day}:")
        for period in sample_periods:
            slot = best_timetable['timetable'][sample_day][period]
            if slot:
                print(f"  {period}: {slot}")
        
        return jsonify({
            'success': True,
            'data': {
                'timetables': timetables,
                'timetable_id': timetable_id,
                'generated_at': datetime.now().isoformat(),
                'metadata': {
                    'breaks_applied': len(breaks),
                    'practicals_applied': len(practicals),
                    'constraints_used': constraints
                }
            }
        })
        
    except Exception as e:
        print(f"Timetable generation error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# Get published timetable
@app.route('/api/timetable', methods=['GET'])
def get_timetable():
    try:
        timetable = db.get_published_timetable()
        if not timetable:
            return jsonify({'success': True, 'data': None})
        
        # Add debug information
        print(f"Retrieved timetable with ID: {timetable.get('id')}")
        if 'timetable' in timetable:
            break_count = 0
            practical_count = 0
            regular_count = 0
            
            for day_schedule in timetable['timetable'].values():
                for slot in day_schedule.values():
                    if slot:
                        if slot.get('type') == 'break' or slot.get('subject') == 'BREAK':
                            break_count += 1
                        elif slot.get('type') == 'practical':
                            practical_count += 1
                        else:
                            regular_count += 1
            
            print(f"Timetable composition: {regular_count} regular, {practical_count} practicals, {break_count} breaks")
        
        return jsonify({'success': True, 'data': timetable})
    except Exception as e:
        print(f"Error fetching timetable: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Publish timetable
@app.route('/api/publish-timetable', methods=['POST'])
def publish_timetable():
    try:
        data = request.json
        timetable_id = data.get('timetable_id')
        
        if not timetable_id:
            return jsonify({'success': False, 'error': 'Timetable ID required'}), 400
        
        print(f"Publishing timetable with ID: {timetable_id}")
        db.publish_timetable(timetable_id)
        print("Timetable published successfully")
        
        return jsonify({'success': True})
        
    except ValueError as e:
        print(f"Publish timetable error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        print(f"Error publishing timetable: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Auto-reschedule endpoint for leave approval
@app.route('/api/auto-reschedule', methods=['POST'])
def auto_reschedule():
    try:
        data = request.json
        leave_request_id = data.get('leave_request_id')
        
        print(f"Auto-rescheduling for leave request ID: {leave_request_id}")
        
        # Get current timetable and leave request details
        current_timetable = db.get_published_timetable()
        leave_request = db.get_leave_request(leave_request_id)
        
        if not current_timetable or not leave_request:
            return jsonify({'success': False, 'error': 'Required data not found'}), 400
        
        print(f"Leave request: {leave_request}")
        
        # Generate rescheduled timetable
        rescheduled = optimizer.reschedule_for_leave(
            current_timetable=current_timetable,
            leave_request=leave_request,
            faculty=db.get_faculty(),
            rooms=db.get_rooms()
        )
        
        if rescheduled:
            # Save and publish the rescheduled timetable
            timetable_id = db.save_timetable(rescheduled)
            db.publish_timetable(timetable_id)
            
            print(f"Rescheduled timetable saved with ID: {timetable_id}")
            
            return jsonify({
                'success': True,
                'data': rescheduled,
                'message': 'Timetable automatically rescheduled'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Could not automatically reschedule. Manual intervention required.'
            })
            
    except Exception as e:
        print(f"Auto-reschedule error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# Authentication endpoint
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        role = data.get('role')
        
        if not all([username, password, role]):
            return jsonify({
                'success': False,
                'error': 'Username, password, and role are required'
            }), 400
        
        # Simple authentication (extend this for production)
        user = db.authenticate_user(username, password, role)
        
        if user:
            return jsonify({
                'success': True,
                'data': user
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid credentials'
            }), 401
            
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Statistics endpoint
@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    try:
        stats = {
            'faculty_count': len(db.get_faculty()),
            'room_count': len(db.get_rooms()),
            'subject_count': len(db.get_subjects()),
            'pending_leaves': len(db.get_pending_leave_requests()),
            'timetable_published': db.is_timetable_published()
        }
        return jsonify({'success': True, 'data': stats})
    except Exception as e:
        print(f"Statistics error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Development endpoint to reset database
@app.route('/api/dev/reset-db', methods=['POST'])
def reset_database():
    """Development only - reset and reinitialize database"""
    try:
        if os.path.exists(db.db_path):
            os.remove(db.db_path)
        db.create_tables()
        db.create_default_users()
        return jsonify({'success': True, 'message': 'Database reset successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Debug endpoint to check timetable structure
@app.route('/api/debug/timetable-structure', methods=['GET'])
def debug_timetable_structure():
    """Debug endpoint to check timetable structure"""
    try:
        timetable = db.get_published_timetable()
        if not timetable:
            return jsonify({
                'success': True,
                'data': {
                    'message': 'No published timetable found',
                    'timetable_exists': False
                }
            })
        
        # Analyze timetable structure
        analysis = {
            'timetable_id': timetable.get('id'),
            'created_at': timetable.get('created_at'),
            'score': timetable.get('score'),
            'days': [],
            'slot_types': {'regular': 0, 'break': 0, 'practical': 0, 'empty': 0}
        }
        
        if 'timetable' in timetable:
            for day, day_schedule in timetable['timetable'].items():
                day_analysis = {
                    'day': day,
                    'periods': []
                }
                
                for period, slot in day_schedule.items():
                    if slot:
                        slot_type = slot.get('type', 'regular')
                        if slot.get('subject') == 'BREAK':
                            slot_type = 'break'
                        
                        analysis['slot_types'][slot_type] += 1
                        day_analysis['periods'].append({
                            'period': period,
                            'type': slot_type,
                            'subject': slot.get('subject'),
                            'faculty': slot.get('faculty'),
                            'room': slot.get('room')
                        })
                    else:
                        analysis['slot_types']['empty'] += 1
                        day_analysis['periods'].append({
                            'period': period,
                            'type': 'empty'
                        })
                
                analysis['days'].append(day_analysis)
        
        return jsonify({
            'success': True,
            'data': {
                'timetable_exists': True,
                'analysis': analysis
            }
        })
        
    except Exception as e:
        print(f"Debug endpoint error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Smart Timetable Scheduler Backend...")
    print(f"Database path: {db.db_path}")
    
    # Test database connection
    try:
        db.create_tables()
        db.create_default_users()
        faculty_count = len(db.get_faculty())
        print(f"Database initialized. Faculty count: {faculty_count}")
    except Exception as e:
        print(f"Database initialization warning: {e}")
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)