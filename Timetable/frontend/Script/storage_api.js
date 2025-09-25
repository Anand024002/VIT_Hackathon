// Script/storage_api.js - Replace existing localStorage storage with API calls
class APIStorageAdapter {
    constructor() {
        this.cache = {
            faculty: [],
            rooms: [],
            subjects: [],
            leaveRequests: [],
            timetable: null,
            currentUser: null
        };
    }

    // Initialize and sync with API
    async init() {
        try {
            // Load cached user if exists
            const cachedUser = localStorage.getItem('currentUser');
            if (cachedUser) {
                this.cache.currentUser = JSON.parse(cachedUser);
                apiClient.currentUser = this.cache.currentUser;
            }
        } catch (error) {
            console.error('Error initializing storage adapter:', error);
        }
    }

    // Faculty methods
    async getFaculty() {
        try {
            const response = await apiClient.getFaculty();
            if (response.success) {
                this.cache.faculty = response.data;
                return response.data;
            }
            return this.cache.faculty;
        } catch (error) {
            console.error('Error fetching faculty:', error);
            return this.cache.faculty;
        }
    }

    async addFaculty(facultyData) {
        try {
            const response = await apiClient.addFaculty(facultyData);
            if (response.success) {
                // Refresh cache
                await this.getFaculty();
                return { ...facultyData, id: response.id };
            }
            throw new Error('Failed to add faculty');
        } catch (error) {
            console.error('Error adding faculty:', error);
            throw error;
        }
    }

    async removeFaculty(id) {
        try {
            const response = await apiClient.deleteFaculty(id);
            if (response.success) {
                // Update cache
                this.cache.faculty = this.cache.faculty.filter(f => f.id !== id);
                return this.cache.faculty;
            }
            throw new Error('Failed to remove faculty');
        } catch (error) {
            console.error('Error removing faculty:', error);
            throw error;
        }
    }

    getFacultyByName(name) {
        return this.cache.faculty.find(f => f.name === name);
    }

    // Room methods
    async getRooms() {
        try {
            const response = await apiClient.getRooms();
            if (response.success) {
                this.cache.rooms = response.data;
                return response.data;
            }
            return this.cache.rooms;
        } catch (error) {
            console.error('Error fetching rooms:', error);
            return this.cache.rooms;
        }
    }

    async addRoom(roomData) {
        try {
            const response = await apiClient.addRoom(roomData);
            if (response.success) {
                await this.getRooms();
                return { ...roomData, id: response.id };
            }
            throw new Error('Failed to add room');
        } catch (error) {
            console.error('Error adding room:', error);
            throw error;
        }
    }

    // Subject methods
    async getSubjects() {
        try {
            const response = await apiClient.getSubjects();
            if (response.success) {
                this.cache.subjects = response.data;
                return response.data;
            }
            return this.cache.subjects;
        } catch (error) {
            console.error('Error fetching subjects:', error);
            return this.cache.subjects;
        }
    }

    async addSubject(subjectData) {
        try {
            const response = await apiClient.addSubject(subjectData);
            if (response.success) {
                await this.getSubjects();
                return { ...subjectData, id: response.id };
            }
            throw new Error('Failed to add subject');
        } catch (error) {
            console.error('Error adding subject:', error);
            throw error;
        }
    }

    // Leave request methods
    async getLeaveRequests() {
        try {
            const response = await apiClient.getLeaveRequests();
            if (response.success) {
                this.cache.leaveRequests = response.data;
                return response.data;
            }
            return this.cache.leaveRequests;
        } catch (error) {
            console.error('Error fetching leave requests:', error);
            return this.cache.leaveRequests;
        }
    }

    async addLeaveRequest(requestData) {
        try {
            const response = await apiClient.addLeaveRequest(requestData);
            if (response.success) {
                await this.getLeaveRequests();
                return { ...requestData, id: response.id, status: 'pending', createdAt: new Date().toISOString() };
            }
            throw new Error('Failed to add leave request');
        } catch (error) {
            console.error('Error adding leave request:', error);
            throw error;
        }
    }

    async updateLeaveRequest(id, updates) {
        try {
            const response = await apiClient.updateLeaveRequest(id, updates.status);
            if (response.success) {
                await this.getLeaveRequests();
                const request = this.cache.leaveRequests.find(r => r.id === id);
                return request;
            }
            throw new Error('Failed to update leave request');
        } catch (error) {
            console.error('Error updating leave request:', error);
            throw error;
        }
    }

    getPendingLeaveRequests() {
        return this.cache.leaveRequests.filter(r => r.status === 'pending');
    }

    // Timetable methods
    async getTimetable() {
        try {
            const response = await apiClient.getTimetable();
            if (response.success && response.data) {
                this.cache.timetable = response.data.timetable;
                return response.data.timetable;
            }
            return this.cache.timetable || this.getDefaultTimetable();
        } catch (error) {
            console.error('Error fetching timetable:', error);
            return this.cache.timetable || this.getDefaultTimetable();
        }
    }

    async generateTimetable(constraints = {}) {
        try {
            const response = await apiClient.generateTimetable(constraints);
            if (response.success) {
                return response.data;
            }
            throw new Error('Failed to generate timetable');
        } catch (error) {
            console.error('Error generating timetable:', error);
            throw error;
        }
    }

    async publishTimetable(timetableId) {
        try {
            const response = await apiClient.publishTimetable(timetableId);
            if (response.success) {
                // Refresh timetable cache
                await this.getTimetable();
                return true;
            }
            throw new Error('Failed to publish timetable');
        } catch (error) {
            console.error('Error publishing timetable:', error);
            throw error;
        }
    }

    getTimetableSettings() {
        return {
            published: true,
            lastGenerated: new Date().toISOString(),
            lastPublished: new Date().toISOString()
        };
    }

    getDefaultTimetable() {
        const defaultTimetable = {};
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const periods = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-1:00', '2:00-3:00', '3:00-4:00'];
        
        days.forEach(day => {
            defaultTimetable[day] = {};
            periods.forEach(period => {
                defaultTimetable[day][period] = null;
            });
        });
        
        return defaultTimetable;
    }

    // Authentication methods
    async authenticateUser(username, password, role) {
        try {
            const response = await apiClient.login(username, password, role);
            if (response.success) {
                this.cache.currentUser = response.user;
                return response.user;
            }
            throw new Error('Authentication failed');
        } catch (error) {
            console.error('Error authenticating user:', error);
            throw error;
        }
    }

    getCurrentUser() {
        return this.cache.currentUser;
    }

    setCurrentUser(user) {
        this.cache.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
    }

    clearCurrentUser() {
        this.cache.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    // Backwards compatibility methods for existing frontend code
    setFaculty(faculty) {
        this.cache.faculty = faculty;
    }

    setRooms(rooms) {
        this.cache.rooms = rooms;
    }

    setSubjects(subjects) {
        this.cache.subjects = subjects;
    }

    setLeaveRequests(requests) {
        this.cache.leaveRequests = requests;
    }

    setTimetable(timetable) {
        this.cache.timetable = timetable;
    }
}

// Replace the existing storage manager
const storage = new APIStorageAdapter();

// Initialize storage
storage.init();

// Export for use in other files
window.storage = storage;