// Admin Dashboard Management

class AdminManager {
    constructor() {
        this.activeSection = 'faculty';
        this.init();
    }

    init() {
        this.setupSectionNavigation();
        this.setupEventListeners();
        this.showSection('faculty');
    }

    setupSectionNavigation() {
        const sidebarLinks = document.querySelectorAll('#adminSidebar .sidebar-link');
        
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
        // Event listeners are handled in individual managers
        // This method can be used for admin-specific events
    }

    showSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.dashboard-section');
        sections.forEach(section => {
            section.classList.remove('active');
            section.classList.add('hidden');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionName + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.classList.remove('hidden');
        }

        // Update sidebar active state
        const sidebarLinks = document.querySelectorAll('#adminSidebar .sidebar-link');
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
            case 'faculty':
                if (window.facultyManager) {
                    facultyManager.renderFacultyList();
                }
                break;
            case 'rooms':
                if (window.roomsManager) {
                    roomsManager.renderRoomsList();
                }
                break;
            case 'subjects':
                if (window.subjectsManager) {
                    subjectsManager.renderSubjectsList();
                }
                break;
            case 'practicals':
                if (window.practicalsManager) {
                    practicalsManager.renderPracticalsList();
                    practicalsManager.updateSubjectDropdown();
                    practicalsManager.updateFacultyDropdown();
                    practicalsManager.updateRoomDropdown();
                }
                break;
            case 'breaks':
                if (window.breaksManager) {
                    breaksManager.renderBreaksList();
                }
                break;
            case 'timetable':
                if (window.timetableManager) {
                    timetableManager.renderTimetableGrid();
                    timetableManager.updateStatus();
                }
                break;
            case 'leave':
                if (window.leaveManager) {
                    leaveManager.renderLeaveRequestsList();
                }
                break;
        }
    }

    // Dashboard statistics using API calls
    async getDashboardStats() {
        try {
            const [faculty, rooms, subjects, practicals, breaks, leaveRequests, timetableSettings] = await Promise.all([
                apiClient.getFaculty(),
                apiClient.getRooms(),
                apiClient.getSubjects(),
                this.getPracticals(),
                this.getBreaks(),
                apiClient.getLeaveRequests(),
                this.getTimetableSettings()
            ]);

            const pendingLeaves = leaveRequests.filter(req => req.status === 'pending');
            
            return {
                faculty: faculty.length,
                rooms: rooms.length,
                subjects: subjects.length,
                practicals: practicals.length,
                breaks: breaks.length,
                pendingLeaves: pendingLeaves.length,
                timetablePublished: timetableSettings.published
            };
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            return {
                faculty: 0,
                rooms: 0,
                subjects: 0,
                practicals: 0,
                breaks: 0,
                pendingLeaves: 0,
                timetablePublished: false
            };
        }
    }

    // Helper methods for data that might be stored locally
    async getPracticals() {
        // If practicals are stored locally, use storage
        if (window.storage && typeof storage.getPracticals === 'function') {
            return storage.getPracticals();
        }
        return [];
    }

    async getBreaks() {
        // If breaks are stored locally, use storage
        if (window.storage && typeof storage.getBreaks === 'function') {
            return storage.getBreaks();
        }
        return [];
    }

    async getTimetableSettings() {
        // If settings are stored locally, use storage
        if (window.storage && typeof storage.getTimetableSettings === 'function') {
            return storage.getTimetableSettings();
        }
        return { published: false };
    }

    // Render dashboard overview
    async renderDashboardOverview() {
        const stats = await this.getDashboardStats();
        
        // This could be used to create a dashboard overview section
        const overviewHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="card p-4">
                    <div class="flex items-center">
                        <i data-lucide="users" class="w-8 h-8 text-blue-600 mr-3"></i>
                        <div>
                            <div class="text-2xl font-bold">${stats.faculty}</div>
                            <div class="text-sm text-slate-600">Faculty Members</div>
                        </div>
                    </div>
                </div>
                <div class="card p-4">
                    <div class="flex items-center">
                        <i data-lucide="building" class="w-8 h-8 text-green-600 mr-3"></i>
                        <div>
                            <div class="text-2xl font-bold">${stats.rooms}</div>
                            <div class="text-sm text-slate-600">Rooms</div>
                        </div>
                    </div>
                </div>
                <div class="card p-4">
                    <div class="flex items-center">
                        <i data-lucide="book" class="w-8 h-8 text-purple-600 mr-3"></i>
                        <div>
                            <div class="text-2xl font-bold">${stats.subjects}</div>
                            <div class="text-sm text-slate-600">Subjects</div>
                        </div>
                    </div>
                </div>
                <div class="card p-4">
                    <div class="flex items-center">
                        <i data-lucide="calendar-x" class="w-8 h-8 text-red-600 mr-3"></i>
                        <div>
                            <div class="text-2xl font-bold">${stats.pendingLeaves}</div>
                            <div class="text-sm text-slate-600">Pending Leaves</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return overviewHTML;
    }

    // Export all data using API calls
    async exportAllData() {
        try {
            const [faculty, rooms, subjects, practicals, breaks, leaveRequests, timetable] = await Promise.all([
                apiClient.getFaculty(),
                apiClient.getRooms(),
                apiClient.getSubjects(),
                this.getPracticals(),
                this.getBreaks(),
                apiClient.getLeaveRequests(),
                apiClient.getTimetable()
            ]);

            const timetableSettings = await this.getTimetableSettings();

            const allData = {
                faculty,
                rooms,
                subjects,
                practicals,
                breaks,
                leaveRequests,
                timetable,
                timetableSettings,
                exportDate: new Date().toISOString(),
                exportedBy: authManager.getCurrentUser()?.name || 'Unknown'
            };

            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `complete_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            toastManager.show('Complete backup exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            toastManager.show('Error exporting data: ' + error.message, 'error');
        }
    }

    // Import all data with API integration
    async importAllData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Validate data structure
            const requiredFields = ['faculty', 'rooms', 'subjects'];
            const missingFields = requiredFields.filter(field => !data[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // Import data using API calls where possible
            const importPromises = [];

            // Import faculty
            if (data.faculty && data.faculty.length > 0) {
                for (const faculty of data.faculty) {
                    importPromises.push(apiClient.addFaculty(faculty));
                }
            }

            // Import rooms
            if (data.rooms && data.rooms.length > 0) {
                for (const room of data.rooms) {
                    importPromises.push(apiClient.addRoom(room));
                }
            }

            // Import subjects
            if (data.subjects && data.subjects.length > 0) {
                for (const subject of data.subjects) {
                    importPromises.push(apiClient.addSubject(subject));
                }
            }

            // Import leave requests
            if (data.leaveRequests && data.leaveRequests.length > 0) {
                for (const request of data.leaveRequests) {
                    importPromises.push(apiClient.submitLeaveRequest(request));
                }
            }

            // Wait for all imports to complete
            await Promise.all(importPromises);

            // Handle local storage data
            if (window.storage) {
                if (data.practicals) storage.setPracticals(data.practicals);
                if (data.breaks) storage.setBreaks(data.breaks);
                if (data.timetableSettings) storage.setTimetableSettings(data.timetableSettings);
            }

            // Refresh all managers
            if (window.facultyManager) facultyManager.loadFaculty();
            if (window.roomsManager) roomsManager.loadRooms();
            if (window.subjectsManager) subjectsManager.loadSubjects();
            if (window.practicalsManager) practicalsManager.loadPracticals();
            if (window.breaksManager) breaksManager.loadBreaks();
            if (window.leaveManager) leaveManager.loadLeaveRequests();
            if (window.timetableManager) timetableManager.loadTimetable();

            // Refresh current section
            this.initializeSection(this.activeSection);

            toastManager.show('All data imported successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            toastManager.show('Error importing data: ' + error.message, 'error');
            return false;
        }
    }

    // Reset all data
    async resetAllData() {
        if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
            try {
                // Clear local storage
                if (window.storage) {
                    storage.clearAll();
                }

                // Note: For API data, you might want to implement delete endpoints
                // For now, we'll just refresh the managers
                
                // Refresh all managers
                if (window.facultyManager) facultyManager.loadFaculty();
                if (window.roomsManager) roomsManager.loadRooms();
                if (window.subjectsManager) subjectsManager.loadSubjects();
                if (window.practicalsManager) practicalsManager.loadPracticals();
                if (window.breaksManager) breaksManager.loadBreaks();
                if (window.leaveManager) leaveManager.loadLeaveRequests();
                if (window.timetableManager) timetableManager.loadTimetable();

                // Refresh current section
                this.initializeSection(this.activeSection);

                toastManager.show('Local data has been reset to defaults', 'warning');
            } catch (error) {
                console.error('Error resetting data:', error);
                toastManager.show('Error resetting data: ' + error.message, 'error');
            }
        }
    }

    // Get current section
    getActiveSection() {
        return this.activeSection;
    }

    // Bulk operations with API integration
    async bulkDeleteFaculty(facultyIds) {
        try {
            const deletePromises = facultyIds.map(id => apiClient.deleteFaculty(id));
            await Promise.all(deletePromises);
            
            if (window.facultyManager) {
                facultyManager.loadFaculty();
            }
            
            toastManager.show(`${facultyIds.length} faculty members deleted`, 'success');
        } catch (error) {
            console.error('Error in bulk delete faculty:', error);
            toastManager.show('Error deleting faculty members', 'error');
        }
    }

    async bulkDeleteRooms(roomIds) {
        try {
            const deletePromises = roomIds.map(id => apiClient.deleteRoom(id));
            await Promise.all(deletePromises);
            
            if (window.roomsManager) {
                roomsManager.loadRooms();
            }
            
            toastManager.show(`${roomIds.length} rooms deleted`, 'success');
        } catch (error) {
            console.error('Error in bulk delete rooms:', error);
            toastManager.show('Error deleting rooms', 'error');
        }
    }

    async bulkDeleteSubjects(subjectIds) {
        try {
            const deletePromises = subjectIds.map(id => apiClient.deleteSubject(id));
            await Promise.all(deletePromises);
            
            if (window.subjectsManager) {
                subjectsManager.loadSubjects();
            }
            
            toastManager.show(`${subjectIds.length} subjects deleted`, 'success');
        } catch (error) {
            console.error('Error in bulk delete subjects:', error);
            toastManager.show('Error deleting subjects', 'error');
        }
    }

    // Search across all entities
    async globalSearch(query) {
        try {
            const [faculty, rooms, subjects, practicals, breaks, leaveRequests] = await Promise.all([
                apiClient.getFaculty(),
                apiClient.getRooms(),
                apiClient.getSubjects(),
                this.getPracticals(),
                this.getBreaks(),
                apiClient.getLeaveRequests()
            ]);

            const results = {
                faculty: this.searchArray(faculty, query, ['name', 'subject', 'email']),
                rooms: this.searchArray(rooms, query, ['name', 'type']),
                subjects: this.searchArray(subjects, query, ['name', 'code']),
                practicals: this.searchArray(practicals, query, ['subject', 'faculty', 'room']),
                breaks: this.searchArray(breaks, query, ['name', 'description']),
                leaveRequests: this.searchArray(leaveRequests, query, ['faculty_name', 'reason'])
            };

            return results;
        } catch (error) {
            console.error('Error in global search:', error);
            return {
                faculty: [],
                rooms: [],
                subjects: [],
                practicals: [],
                breaks: [],
                leaveRequests: []
            };
        }
    }

    // Helper method for searching arrays
    searchArray(array, query, searchFields) {
        const lowercaseQuery = query.toLowerCase();
        return array.filter(item => 
            searchFields.some(field => 
                item[field] && item[field].toString().toLowerCase().includes(lowercaseQuery)
            )
        );
    }

    // System health check with API integration
    async performHealthCheck() {
        const issues = [];
        
        try {
            // Check for empty collections
            const [faculty, rooms, subjects] = await Promise.all([
                apiClient.getFaculty(),
                apiClient.getRooms(),
                apiClient.getSubjects()
            ]);

            if (faculty.length === 0) {
                issues.push('No faculty members defined');
            }
            
            if (rooms.length === 0) {
                issues.push('No rooms defined');
            }
            
            if (subjects.length === 0) {
                issues.push('No subjects defined');
            }

            // Check for orphaned data
            const timetable = await apiClient.getTimetable();
            const facultyNames = faculty.map(f => f.name);
            const roomNames = rooms.map(r => r.name);
            const subjectNames = subjects.map(s => s.name);

            // Check timetable references
            if (timetable && typeof timetable === 'object') {
                Object.values(timetable).forEach(day => {
                    if (day && typeof day === 'object') {
                        Object.values(day).forEach(slot => {
                            if (slot) {
                                if (!facultyNames.includes(slot.faculty)) {
                                    issues.push(`Timetable references unknown faculty: ${slot.faculty}`);
                                }
                                if (!roomNames.includes(slot.room)) {
                                    issues.push(`Timetable references unknown room: ${slot.room}`);
                                }
                                if (!subjectNames.includes(slot.subject)) {
                                    issues.push(`Timetable references unknown subject: ${slot.subject}`);
                                }
                            }
                        });
                    }
                });
            }

            return {
                healthy: issues.length === 0,
                issues: issues
            };
        } catch (error) {
            console.error('Error performing health check:', error);
            return {
                healthy: false,
                issues: ['Error performing health check: ' + error.message]
            };
        }
    }

    // Generate reports with API integration
    async generateReport(type) {
        switch (type) {
            case 'faculty':
                return await this.generateFacultyReport();
            case 'rooms':
                return await this.generateRoomsReport();
            case 'subjects':
                return await this.generateSubjectsReport();
            case 'timetable':
                return await this.generateTimetableReport();
            case 'leave':
                return await this.generateLeaveReport();
            default:
                return await this.generateOverallReport();
        }
    }

    async generateFacultyReport() {
        try {
            const faculty = await apiClient.getFaculty();
            const stats = await this.getFacultyStatistics(faculty);
            
            return {
                title: 'Faculty Report',
                data: faculty,
                statistics: stats,
                generated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating faculty report:', error);
            return {
                title: 'Faculty Report',
                data: [],
                statistics: {},
                error: error.message,
                generated: new Date().toISOString()
            };
        }
    }

    async generateRoomsReport() {
        try {
            const rooms = await apiClient.getRooms();
            const stats = await this.getRoomsStatistics(rooms);
            
            return {
                title: 'Rooms Report',
                data: rooms,
                statistics: stats,
                generated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating rooms report:', error);
            return {
                title: 'Rooms Report',
                data: [],
                statistics: {},
                error: error.message,
                generated: new Date().toISOString()
            };
        }
    }

    async generateSubjectsReport() {
        try {
            const subjects = await apiClient.getSubjects();
            const stats = await this.getSubjectsStatistics(subjects);
            
            return {
                title: 'Subjects Report',
                data: subjects,
                statistics: stats,
                generated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating subjects report:', error);
            return {
                title: 'Subjects Report',
                data: [],
                statistics: {},
                error: error.message,
                generated: new Date().toISOString()
            };
        }
    }

    async generateTimetableReport() {
        try {
            const timetable = await apiClient.getTimetable();
            const stats = window.timetableManager ? timetableManager.getStatistics() : {};
            const settings = await this.getTimetableSettings();
            
            return {
                title: 'Timetable Report',
                data: timetable,
                statistics: stats,
                settings: settings,
                generated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating timetable report:', error);
            return {
                title: 'Timetable Report',
                data: {},
                statistics: {},
                settings: {},
                error: error.message,
                generated: new Date().toISOString()
            };
        }
    }

    async generateLeaveReport() {
        try {
            const leaveRequests = await apiClient.getLeaveRequests();
            const stats = await this.getLeaveStatistics(leaveRequests);
            
            return {
                title: 'Leave Report',
                data: leaveRequests,
                statistics: stats,
                generated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating leave report:', error);
            return {
                title: 'Leave Report',
                data: [],
                statistics: {},
                error: error.message,
                generated: new Date().toISOString()
            };
        }
    }

    async generateOverallReport() {
        const [faculty, rooms, subjects, timetable, leave] = await Promise.all([
            this.generateFacultyReport(),
            this.generateRoomsReport(),
            this.generateSubjectsReport(),
            this.generateTimetableReport(),
            this.generateLeaveReport()
        ]);

        const systemHealth = await this.performHealthCheck();

        return {
            title: 'Overall System Report',
            faculty,
            rooms,
            subjects,
            timetable,
            leave,
            systemHealth,
            generated: new Date().toISOString()
        };
    }

    // Helper methods for generating statistics
    async getFacultyStatistics(faculty) {
        return {
            total: faculty.length,
            subjectDistribution: this.getDistribution(faculty, 'subject'),
            emailCount: faculty.filter(f => f.email).length
        };
    }

    async getRoomsStatistics(rooms) {
        return {
            total: rooms.length,
            typeDistribution: this.getDistribution(rooms, 'type'),
            totalCapacity: rooms.reduce((sum, room) => sum + (parseInt(room.capacity) || 0), 0),
            averageCapacity: rooms.length > 0 ? 
                Math.round(rooms.reduce((sum, room) => sum + (parseInt(room.capacity) || 0), 0) / rooms.length) : 0
        };
    }

    async getSubjectsStatistics(subjects) {
        return {
            total: subjects.length,
            totalCredits: subjects.reduce((sum, subject) => sum + (parseInt(subject.credits) || 0), 0),
            averageCredits: subjects.length > 0 ? 
                Math.round(subjects.reduce((sum, subject) => sum + (parseInt(subject.credits) || 0), 0) / subjects.length * 10) / 10 : 0
        };
    }

    async getLeaveStatistics(leaveRequests) {
        const statusDistribution = this.getDistribution(leaveRequests, 'status');
        const facultyDistribution = this.getDistribution(leaveRequests, 'faculty_name');
        
        return {
            total: leaveRequests.length,
            statusDistribution,
            facultyDistribution,
            pending: statusDistribution.pending || 0,
            approved: statusDistribution.approved || 0,
            rejected: statusDistribution.rejected || 0
        };
    }

    // Helper method to get distribution of values
    getDistribution(array, field) {
        return array.reduce((acc, item) => {
            const value = item[field] || 'Unknown';
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});
    }
}

// Initialize admin manager
const adminManager = new AdminManager();

// Export for use in other files
window.adminManager = adminManager;