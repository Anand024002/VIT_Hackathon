// Student Dashboard Management

class StudentManager {
    constructor() {
        this.currentStudent = null;
        this.init();
    }

    init() {
        this.currentStudent = window.authManager ? window.authManager.getCurrentUser() : null;
        this.updateStudentInfo();
        
        // Wait for DOM to be ready before rendering timetable
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.renderStudentTimetable();
            });
        } else {
            this.renderStudentTimetable();
        }
    }

    updateStudentInfo() {
        if (!this.currentStudent) return;

        // Update welcome message
        const welcomeElement = document.getElementById('studentWelcome');
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome, ${this.currentStudent.name}`;
        }

        // Update class info
        const classInfoElement = document.getElementById('studentClassInfo');
        if (classInfoElement) {
            const className = this.currentStudent.class || 'Not Assigned';
            classInfoElement.textContent = `Class: ${className}`;
        }
    }

    renderStudentTimetable() {
        if (window.timetableManager) {
            // Always load the latest timetable to ensure we have the published one
            timetableManager.loadTimetable().then(() => {
                timetableManager.renderTimetableGrid('studentTimetableGrid');
                timetableManager.updateStatus();
            }).catch(error => {
                console.error('Error loading timetable for student:', error);
                // Even if there's an error, try to render what we have
                timetableManager.renderTimetableGrid('studentTimetableGrid');
                timetableManager.updateStatus();
            });
        }
    }

    // Get student schedule (same as general timetable for now)
    getStudentSchedule() {
        if (!window.timetableManager) return {};
        return timetableManager.getTimetable();
    }

    // Get today's classes
    getTodayClasses() {
        const schedule = this.getStudentSchedule();
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        
        if (!schedule[today]) return [];

        const todayClasses = [];
        Object.entries(schedule[today]).forEach(([period, slot]) => {
            if (slot) {
                todayClasses.push({
                    period,
                    ...slot
                });
            }
        });

        return todayClasses;
    }

    // Get next class
    getNextClass() {
        const todayClasses = this.getTodayClasses();
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        // Convert period time to minutes for comparison
        const timeToMinutes = (timeStr) => {
            const [time] = timeStr.split('-');
            const [hours, minutes] = time.split(':');
            return parseInt(hours) * 60 + parseInt(minutes);
        };

        // Find next class
        for (const classItem of todayClasses) {
            const classTime = timeToMinutes(classItem.period);
            if (classTime > currentTime) {
                return {
                    ...classItem,
                    timeUntil: this.calculateTimeUntil(classItem.period)
                };
            }
        }

        return null;
    }

    // Get current class
    getCurrentClass() {
        const todayClasses = this.getTodayClasses();
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        // Convert period time to minutes for comparison
        const timeToMinutes = (timeStr) => {
            const [startTime, endTime] = timeStr.split('-');
            const [startHours, startMinutes] = startTime.split(':');
            const [endHours, endMinutes] = endTime.split(':');
            return {
                start: parseInt(startHours) * 60 + parseInt(startMinutes),
                end: parseInt(endHours) * 60 + parseInt(endMinutes)
            };
        };

        // Find current class
        for (const classItem of todayClasses) {
            const classTimes = timeToMinutes(classItem.period);
            if (currentTime >= classTimes.start && currentTime < classTimes.end) {
                return {
                    ...classItem,
                    timeRemaining: this.calculateTimeRemaining(classItem.period)
                };
            }
        }

        return null;
    }

    calculateTimeUntil(period) {
        const [startTime] = period.split('-');
        const [hours, minutes] = startTime.split(':');
        const classTime = new Date();
        classTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const now = new Date();
        const diff = classTime - now;
        
        if (diff <= 0) return 'Starting now';
        
        const diffMinutes = Math.floor(diff / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const remainingMinutes = diffMinutes % 60;
        
        if (diffHours > 0) {
            return `${diffHours}h ${remainingMinutes}m`;
        } else {
            return `${remainingMinutes}m`;
        }
    }

    calculateTimeRemaining(period) {
        const [, endTime] = period.split('-');
        const [hours, minutes] = endTime.split(':');
        const classEndTime = new Date();
        classEndTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const now = new Date();
        const diff = classEndTime - now;
        
        if (diff <= 0) return 'Class ended';
        
        const diffMinutes = Math.floor(diff / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const remainingMinutes = diffMinutes % 60;
        
        if (diffHours > 0) {
            return `${diffHours}h ${remainingMinutes}m`;
        } else {
            return `${remainingMinutes}m`;
        }
    }

    // Get week overview
    getWeekOverview() {
        const schedule = this.getStudentSchedule();
        const overview = {
            totalClasses: 0,
            subjectBreakdown: {},
            facultyCount: {},
            roomUsage: {},
            dailyClassCount: {}
        };

        Object.entries(schedule).forEach(([day, periods]) => {
            overview.dailyClassCount[day] = 0;
            
            Object.values(periods).forEach(slot => {
                if (slot) {
                    overview.totalClasses++;
                    overview.dailyClassCount[day]++;
                    
                    // Subject breakdown
                    if (overview.subjectBreakdown[slot.subject]) {
                        overview.subjectBreakdown[slot.subject]++;
                    } else {
                        overview.subjectBreakdown[slot.subject] = 1;
                    }
                    
                    // Faculty count
                    if (overview.facultyCount[slot.faculty]) {
                        overview.facultyCount[slot.faculty]++;
                    } else {
                        overview.facultyCount[slot.faculty] = 1;
                    }
                    
                    // Room usage
                    if (overview.roomUsage[slot.room]) {
                        overview.roomUsage[slot.room]++;
                    } else {
                        overview.roomUsage[slot.room] = 1;
                    }
                }
            });
        });

        // Calculate additional stats
        overview.averageClassesPerDay = Math.round(overview.totalClasses / 5 * 10) / 10;
        overview.busiestDay = Object.entries(overview.dailyClassCount)
            .sort(([,a], [,b]) => b - a)[0];

        return overview;
    }

    // Get attendance summary (placeholder - would integrate with attendance system)
    getAttendanceSummary() {
        // This would integrate with an attendance tracking system
        // For now, return mock data
        const subjects = Object.keys(this.getWeekOverview().subjectBreakdown);
        const summary = {};
        
        subjects.forEach(subject => {
            summary[subject] = {
                present: Math.floor(Math.random() * 20) + 15, // 15-35 classes
                total: Math.floor(Math.random() * 5) + 35, // 35-40 total classes
                percentage: 0
            };
            summary[subject].percentage = Math.round(
                (summary[subject].present / summary[subject].total) * 100
            );
        });
        
        return summary;
    }

    // Export student schedule
    exportSchedule(format = 'json') {
        if (!this.currentStudent) return;

        const schedule = this.getStudentSchedule();
        const overview = this.getWeekOverview();
        const todayClasses = this.getTodayClasses();
        const nextClass = this.getNextClass();
        const currentClass = this.getCurrentClass();

        const data = {
            student: this.currentStudent.name,
            class: this.currentStudent.class,
            schedule,
            overview,
            todayClasses,
            nextClass,
            currentClass,
            exportDate: new Date().toISOString()
        };

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentStudent.name.replace(/\s+/g, '_')}_schedule.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'csv') {
            this.exportScheduleCSV(schedule);
        }

        toastManager.show('Schedule exported successfully!', 'success');
    }

    exportScheduleCSV(schedule) {
        let csv = 'Day,Period,Subject,Faculty,Room\n';
        
        Object.entries(schedule).forEach(([day, periods]) => {
            Object.entries(periods).forEach(([period, slot]) => {
                if (slot) {
                    csv += `${day},${period},${slot.subject},${slot.faculty},${slot.room}\n`;
                } else {
                    csv += `${day},${period},Free,,,\n`;
                }
            });
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentStudent.name.replace(/\s+/g, '_')}_schedule.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Print schedule
    printSchedule() {
        const printWindow = window.open('', '_blank');
        const schedule = this.getStudentSchedule();
        const student = this.currentStudent;
        
        let html = `
            <html>
            <head>
                <title>${student.name} - Class Schedule</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 20px;
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #2563eb;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .student-info {
                        margin-bottom: 20px;
                        background-color: #f8fafc;
                        padding: 15px;
                        border-radius: 8px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-bottom: 20px;
                    }
                    th, td { 
                        border: 1px solid #ddd; 
                        padding: 12px; 
                        text-align: center;
                        vertical-align: middle;
                    }
                    th { 
                        background-color: #2563eb; 
                        color: white; 
                        font-weight: bold;
                    }
                    .subject { font-weight: bold; color: #1e40af; }
                    .faculty { font-size: 0.9em; color: #64748b; }
                    .room { font-size: 0.9em; color: #059669; }
                    .empty { 
                        background-color: #f8fafc; 
                        color: #94a3b8; 
                        font-style: italic;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        font-size: 0.9em;
                        color: #64748b;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Class Schedule</h1>
                    <h2>Smart Classroom Timetable System</h2>
                </div>
                
                <div class="student-info">
                    <strong>Student:</strong> ${student.name} | 
                    <strong>Class:</strong> ${student.class || 'Not Assigned'} | 
                    <strong>Generated:</strong> ${new Date().toLocaleDateString()}
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Monday</th>
                            <th>Tuesday</th>
                            <th>Wednesday</th>
                            <th>Thursday</th>
                            <th>Friday</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        const periods = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-1:00', '2:00-3:00', '3:00-4:00'];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        periods.forEach(period => {
            html += `<tr><td class="time"><strong>${period}</strong></td>`;
            
            days.forEach(day => {
                const slot = schedule[day] && schedule[day][period];
                if (slot) {
                    html += `
                        <td>
                            <div class="subject">${slot.subject}</div>
                            <div class="faculty">${slot.faculty}</div>
                            <div class="room">${slot.room}</div>
                        </td>
                    `;
                } else {
                    html += `<td class="empty">Free</td>`;
                }
            });
            
            html += '</tr>';
        });

        html += `
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>This schedule is subject to changes. Please check for updates regularly.</p>
                    <p>Printed on: ${new Date().toLocaleString()}</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    }

    // Get schedule notifications/reminders
    getScheduleReminders() {
        const reminders = [];
        const nextClass = this.getNextClass();
        const currentClass = this.getCurrentClass();

        if (currentClass) {
            reminders.push({
                type: 'current',
                message: `${currentClass.subject} is in progress in ${currentClass.room}`,
                timeInfo: `Time remaining: ${currentClass.timeRemaining}`,
                priority: 'high'
            });
        }

        if (nextClass) {
            const timeUntil = nextClass.timeUntil;
            if (timeUntil.includes('m') && !timeUntil.includes('h')) {
                const minutes = parseInt(timeUntil);
                if (minutes <= 15) {
                    reminders.push({
                        type: 'upcoming',
                        message: `${nextClass.subject} starts soon in ${nextClass.room}`,
                        timeInfo: `Starts in: ${nextClass.timeUntil}`,
                        priority: minutes <= 5 ? 'high' : 'medium'
                    });
                }
            }
        }

        return reminders;
    }

    // Refresh dashboard
    refreshDashboard() {
        this.currentStudent = authManager.getCurrentUser();
        this.updateStudentInfo();
        this.renderStudentTimetable();
        toastManager.show('Dashboard refreshed', 'success');
    }

    // Get student statistics
    getStudentStatistics() {
        const overview = this.getWeekOverview();
        const todayClasses = this.getTodayClasses();
        const attendance = this.getAttendanceSummary();

        return {
            ...overview,
            todayClassCount: todayClasses.length,
            attendance,
            currentSemester: 'Semester 1', // This would come from system settings
            academicYear: '2024-2025' // This would come from system settings
        };
    }
}

// Initialize student manager
const studentManager = new StudentManager();

// Export for use in other files
window.studentManager = studentManager;