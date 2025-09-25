// Faculty Dashboard Management

class FacultyDashboardManager {
    constructor() {
        this.activeSection = 'timetable';
        this.currentFaculty = null;
        this.init();
    }

    init() {
        this.currentFaculty = window.authManager ? window.authManager.getCurrentUser() : null;
        this.setupSectionNavigation();
        this.setupEventListeners();
        this.updateFacultyInfo();
        
        // Wait for DOM to be ready before showing section
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.showSection('timetable');
            });
        } else {
            this.showSection('timetable');
        }
    }

    setupSectionNavigation() {
        const sidebarLinks = document.querySelectorAll('#facultySidebar .sidebar-link');
        
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                if (section) {
                    this.showSection(section);
                }
            });
        });
    }

    setupEventListeners() {
        // Leave request form
        const submitLeaveBtn = document.getElementById('submitLeaveBtn');
        if (submitLeaveBtn) {
            submitLeaveBtn.addEventListener('click', () => this.submitLeaveRequest());
        }

        // Enter key support for leave form
        const leaveInputs = ['leaveDate', 'leavePeriod', 'leaveReason'];
        leaveInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && inputId !== 'leaveReason') {
                        this.submitLeaveRequest();
                    }
                });
            }
        });
    }

    showSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('#facultyDashboard .dashboard-section');
        sections.forEach(section => {
            section.classList.remove('active');
            section.classList.add('hidden');
        });

        // Show selected section
        const targetSection = document.getElementById('faculty' + this.capitalizeFirst(sectionName) + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.classList.remove('hidden');
        }

        // Update sidebar active state
        const sidebarLinks = document.querySelectorAll('#facultySidebar .sidebar-link');
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionName) {
                link.classList.add('active');
            }
        });

        this.activeSection = sectionName;

        // Initialize section-specific content
        this.initializeSection(sectionName);
    }

    initializeSection(sectionName) {
        switch (sectionName) {
            case 'timetable':
                this.renderFacultyTimetable();
                break;
            case 'leave':
                this.renderLeaveSection();
                break;
        }
    }

    renderFacultyTimetable() {
        if (window.timetableManager && this.currentFaculty) {
            // Always load the latest timetable to ensure we have the published one
            timetableManager.loadTimetable().then(() => {
                timetableManager.renderTimetableGrid('facultyTimetableGrid', this.currentFaculty.name);
                timetableManager.updateStatus();
            }).catch(error => {
                console.error('Error loading timetable for faculty:', error);
                // Even if there's an error, try to render what we have
                timetableManager.renderTimetableGrid('facultyTimetableGrid', this.currentFaculty.name);
                timetableManager.updateStatus();
            });
        }
    }

    renderLeaveSection() {
        if (window.leaveManager && this.currentFaculty) {
            leaveManager.renderFacultyLeaveHistory(this.currentFaculty.name);
        }
    }

    async updateFacultyInfo() {
        if (!this.currentFaculty) return;

        // Update welcome message
        const welcomeElement = document.getElementById('facultyWelcome');
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome, ${this.currentFaculty.name}`;
        }

        // Update subject info
        const subjectInfoElement = document.getElementById('facultySubjectInfo');
        if (subjectInfoElement) {
            try {
                // Get updated faculty data from API
                const facultyData = await this.getFacultyByName(this.currentFaculty.name);
                const subject = facultyData ? facultyData.subject : this.currentFaculty.subject;
                subjectInfoElement.textContent = `Subject: ${subject || 'Not Assigned'}`;
            } catch (error) {
                console.error('Error getting faculty data:', error);
                subjectInfoElement.textContent = `Subject: ${this.currentFaculty.subject || 'Not Assigned'}`;
            }
        }
    }

    async getFacultyByName(name) {
        try {
            const facultyList = await apiClient.getFaculty();
            return facultyList.find(faculty => faculty.name === name);
        } catch (error) {
            console.error('Error fetching faculty data:', error);
            return null;
        }
    }

    async submitLeaveRequest() {
        if (!this.currentFaculty) {
            toastManager.show('User not authenticated', 'error');
            return;
        }

        const date = document.getElementById('leaveDate').value;
        const period = document.getElementById('leavePeriod').value;
        const reason = document.getElementById('leaveReason').value.trim();

        // Validate inputs
        const errors = utils.validateRequired({ date, period, reason });
        if (errors.length > 0) {
            toastManager.show(errors[0], 'error');
            return;
        }

        // Validate date is not in the past
        const requestDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (requestDate < today) {
            toastManager.show('Cannot request leave for past dates', 'error');
            return;
        }

        // Validate reason length
        if (reason.length < 10) {
            toastManager.show('Reason must be at least 10 characters long', 'error');
            return;
        }

        try {
            const requestData = {
                faculty: this.currentFaculty.name,
                facultyId: this.currentFaculty.id,
                date,
                period,
                reason
            };

            // Validate request with leave manager
            if (window.leaveManager) {
                const validationErrors = leaveManager.validateLeaveRequest(requestData);
                if (validationErrors.length > 0) {
                    toastManager.show(validationErrors[0], 'error');
                    return;
                }
            }

            // Submit leave request via API
            const response = await apiClient.submitLeaveRequest(requestData);
            
            if (!response.success) {
                throw new Error(response.error || 'Failed to submit leave request');
            }

            // Clear form
            this.clearLeaveForm();
            
            // Refresh leave history
            this.renderLeaveSection();
            
            toastManager.show('Leave request submitted successfully!', 'success');
        } catch (error) {
            console.error('Error submitting leave request:', error);
            toastManager.show(error.message || 'Error submitting leave request', 'error');
        }
    }

    clearLeaveForm() {
        document.getElementById('leaveDate').value = '';
        document.getElementById('leavePeriod').value = '';
        document.getElementById('leaveReason').value = '';
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Get faculty schedule for current week
    getCurrentWeekSchedule() {
        if (!this.currentFaculty || !window.timetableManager) return {};
        
        return timetableManager.getFacultyTimetable(this.currentFaculty.name);
    }

    // Get faculty upcoming classes
    getUpcomingClasses() {
        const schedule = this.getCurrentWeekSchedule();
        const upcoming = [];
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        const currentTime = now.getHours() * 60 + now.getMinutes();

        // Convert period time to minutes for comparison
        const timeToMinutes = (timeStr) => {
            const [time] = timeStr.split('-');
            const [hours, minutes] = time.split(':');
            return parseInt(hours) * 60 + parseInt(minutes);
        };

        // Get today's remaining classes
        if (schedule[currentDay]) {
            Object.entries(schedule[currentDay]).forEach(([period, slot]) => {
                if (slot) {
                    const periodTime = timeToMinutes(period);
                    if (periodTime > currentTime) {
                        upcoming.push({
                            day: currentDay,
                            period,
                            ...slot,
                            isToday: true
                        });
                    }
                }
            });
        }

        // Get future days' classes (limit to 3-5 upcoming classes)
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const currentDayIndex = days.indexOf(currentDay);
        
        for (let i = 1; i < days.length && upcoming.length < 5; i++) {
            const dayIndex = (currentDayIndex + i) % days.length;
            const day = days[dayIndex];
            
            if (schedule[day]) {
                Object.entries(schedule[day]).forEach(([period, slot]) => {
                    if (slot && upcoming.length < 5) {
                        upcoming.push({
                            day,
                            period,
                            ...slot,
                            isToday: false
                        });
                    }
                });
            }
        }

        return upcoming.slice(0, 5);
    }

    // Get faculty leave summary
    async getLeaveSummary() {
        if (!this.currentFaculty || !window.leaveManager) return {};
        
        try {
            const allRequests = await this.getFacultyLeaveRequests(this.currentFaculty.name);
            const pendingRequests = allRequests.filter(r => r.status === 'pending');
            const approvedRequests = allRequests.filter(r => r.status === 'approved');
            const upcomingLeaves = await this.getUpcomingLeaves(this.currentFaculty.name);

            return {
                total: allRequests.length,
                pending: pendingRequests.length,
                approved: approvedRequests.length,
                upcoming: upcomingLeaves.length,
                recentRequests: allRequests.slice(-3).reverse()
            };
        } catch (error) {
            console.error('Error getting leave summary:', error);
            return {
                total: 0,
                pending: 0,
                approved: 0,
                upcoming: 0,
                recentRequests: []
            };
        }
    }

    async getFacultyLeaveRequests(facultyName) {
        try {
            const response = await apiClient.getLeaveRequests();
            return response.filter(request => request.faculty_name === facultyName);
        } catch (error) {
            console.error('Error fetching leave requests:', error);
            return [];
        }
    }

    async getUpcomingLeaves(facultyName) {
        try {
            const allRequests = await this.getFacultyLeaveRequests(facultyName);
            const approvedRequests = allRequests.filter(r => r.status === 'approved');
            const today = new Date();
            
            return approvedRequests.filter(request => {
                const leaveDate = new Date(request.date);
                return leaveDate >= today;
            });
        } catch (error) {
            console.error('Error getting upcoming leaves:', error);
            return [];
        }
    }

    // Export faculty schedule
    exportSchedule(format = 'json') {
        if (!this.currentFaculty) return;

        const schedule = this.getCurrentWeekSchedule();
        const upcoming = this.getUpcomingClasses();

        this.getLeaveSummary().then(leaveSummary => {
            const data = {
                faculty: this.currentFaculty.name,
                subject: this.currentFaculty.subject,
                schedule,
                upcomingClasses: upcoming,
                leaveSummary,
                exportDate: new Date().toISOString()
            };

            if (format === 'json') {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.currentFaculty.name.replace(/\s+/g, '_')}_schedule.json`;
                a.click();
                URL.revokeObjectURL(url);
            } else if (format === 'csv') {
                this.exportScheduleCSV(schedule);
            }

            toastManager.show('Schedule exported successfully!', 'success');
        });
    }

    exportScheduleCSV(schedule) {
        let csv = 'Day,Period,Subject,Room\n';
        
        Object.entries(schedule).forEach(([day, periods]) => {
            Object.entries(periods).forEach(([period, slot]) => {
                if (slot) {
                    csv += `${day},${period},${slot.subject},${slot.room}\n`;
                }
            });
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentFaculty.name.replace(/\s+/g, '_')}_schedule.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Get faculty statistics
    async getFacultyStatistics() {
        if (!this.currentFaculty) return {};

        const schedule = this.getCurrentWeekSchedule();
        const leaveSummary = await this.getLeaveSummary();
        
        let totalClasses = 0;
        let subjectBreakdown = {};
        let roomUsage = {};
        let dailyLoad = {};

        // Count classes and analyze distribution
        Object.entries(schedule).forEach(([day, periods]) => {
            dailyLoad[day] = 0;
            Object.values(periods).forEach(slot => {
                if (slot) {
                    totalClasses++;
                    dailyLoad[day]++;
                    
                    if (subjectBreakdown[slot.subject]) {
                        subjectBreakdown[slot.subject]++;
                    } else {
                        subjectBreakdown[slot.subject] = 1;
                    }
                    
                    if (roomUsage[slot.room]) {
                        roomUsage[slot.room]++;
                    } else {
                        roomUsage[slot.room] = 1;
                    }
                }
            });
        });

        // Calculate workload percentage (out of 30 total slots)
        const workloadPercentage = Math.round((totalClasses / 30) * 100);
        
        // Find busiest day
        const busiestDay = Object.entries(dailyLoad)
            .sort(([,a], [,b]) => b - a)[0];

        return {
            totalClasses,
            workloadPercentage,
            subjectBreakdown,
            roomUsage,
            dailyLoad,
            busiestDay: busiestDay ? busiestDay[0] : 'None',
            busiestDayClasses: busiestDay ? busiestDay[1] : 0,
            averageClassesPerDay: Math.round(totalClasses / 5 * 10) / 10,
            leave: leaveSummary
        };
    }

    // Refresh dashboard data
    async refreshDashboard() {
        this.currentFaculty = authManager.getCurrentUser();
        await this.updateFacultyInfo();
        this.initializeSection(this.activeSection);
        toastManager.show('Dashboard refreshed', 'success');
    }

    // Check for schedule conflicts
    async checkScheduleConflicts() {
        if (!this.currentFaculty) return [];
        
        const conflicts = [];
        const schedule = this.getCurrentWeekSchedule();
        const upcomingLeaves = await this.getUpcomingLeaves(this.currentFaculty.name);

        // Check for leave conflicts with scheduled classes
        upcomingLeaves.forEach(leave => {
            const dayName = this.getDayFromDate(leave.date);
            if (schedule[dayName] && schedule[dayName][leave.period]) {
                conflicts.push({
                    type: 'leave_conflict',
                    day: dayName,
                    period: leave.period,
                    class: schedule[dayName][leave.period],
                    leave: leave
                });
            }
        });

        return conflicts;
    }

    getDayFromDate(dateStr) {
        const date = new Date(dateStr);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return dayNames[date.getDay()];
    }

    // Get current active section
    getActiveSection() {
        return this.activeSection;
    }

    // Update when faculty data changes (called from faculty manager)
    onFacultyDataUpdate() {
        this.updateFacultyInfo();
    }
}

// Initialize faculty dashboard manager
const facultyDashboardManager = new FacultyDashboardManager();

// Export for use in other files
window.facultyDashboardManager = facultyDashboardManager;