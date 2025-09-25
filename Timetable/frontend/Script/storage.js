// storage.js - Unified Storage Manager with API and Local Storage fallback

class StorageManager {
    constructor() {
        this.useLocalStorage = false;
        this.localStoragePrefix = 'timetable_';
        this.initialized = false;
        this.apiAvailable = false;
    }

    async init() {
        try {
            // Wait for apiClient to be available
            await this.waitForAPIClient();
            
            // Test if API is available
            this.apiAvailable = await window.apiClient.healthCheck();
            
            if (this.apiAvailable) {
                this.useLocalStorage = false;
                console.log('✓ Using API storage');
            } else {
                throw new Error('API health check failed');
            }
        } catch (error) {
            console.log('⚠ API not available, falling back to localStorage:', error.message);
            this.useLocalStorage = true;
            this.initLocalStorage();
        }
        
        this.initialized = true;
        console.log(`Storage manager initialized. Mode: ${this.useLocalStorage ? 'LocalStorage' : 'API'}`);
    }

    async waitForAPIClient(maxAttempts = 50, interval = 100) {
        let attempts = 0;
        
        while (!window.apiClient && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, interval));
            attempts++;
        }
        
        if (!window.apiClient) {
            throw new Error('API client not available after waiting');
        }
        
        // Wait for API client to be initialized
        while (!window.apiClient.initialized && attempts < maxAttempts * 2) {
            await new Promise(resolve => setTimeout(resolve, interval));
            attempts++;
        }
    }

    initLocalStorage() {
        const defaultData = {
            faculty: [],
            rooms: [],
            subjects: [],
            breaks: [],
            leaveRequests: [],
            users: this.getDefaultUsers()
        };

        Object.entries(defaultData).forEach(([key, defaultValue]) => {
            if (!localStorage.getItem(this.localStoragePrefix + key)) {
                localStorage.setItem(this.localStoragePrefix + key, JSON.stringify(defaultValue));
            }
        });
    }

    // Faculty methods
    async getFaculty() {
        if (!this.initialized) await this.init();
        
        if (this.useLocalStorage) {
            const data = localStorage.getItem(this.localStoragePrefix + 'faculty');
            return data ? JSON.parse(data) : [];
        } else {
            try {
                return await window.apiClient.getFaculty();
            } catch (error) {
                console.error('API getFaculty failed, falling back to localStorage:', error);
                return this.getFacultyFromLocalStorage();
            }
        }
    }

    getFacultyFromLocalStorage() {
        const data = localStorage.getItem(this.localStoragePrefix + 'faculty');
        return data ? JSON.parse(data) : [];
    }

    setFaculty(faculty) {
        if (this.useLocalStorage) {
            localStorage.setItem(this.localStoragePrefix + 'faculty', JSON.stringify(faculty));
        }
    }

    async addFaculty(facultyData) {
        if (this.useLocalStorage) {
            const faculty = this.getFacultyFromLocalStorage();
            const newFaculty = {
                id: Date.now(),
                ...facultyData
            };
            faculty.push(newFaculty);
            this.setFaculty(faculty);
            return newFaculty;
        } else {
            try {
                return await window.apiClient.addFaculty(facultyData);
            } catch (error) {
                console.error('API addFaculty failed:', error);
                throw error;
            }
        }
    }

    async removeFaculty(id) {
        if (this.useLocalStorage) {
            const faculty = this.getFacultyFromLocalStorage();
            const filtered = faculty.filter(f => f.id !== id);
            this.setFaculty(filtered);
        } else {
            try {
                return await window.apiClient.removeFaculty(id);
            } catch (error) {
                console.error('API removeFaculty failed:', error);
                throw error;
            }
        }
    }

    getFacultyByName(name) {
        const faculty = this.getFacultyFromLocalStorage();
        return faculty.find(f => f.name === name);
    }

    // Room methods
    async getRooms() {
        if (!this.initialized) await this.init();
        
        if (this.useLocalStorage) {
            const data = localStorage.getItem(this.localStoragePrefix + 'rooms');
            return data ? JSON.parse(data) : [];
        } else {
            try {
                return await window.apiClient.getRooms();
            } catch (error) {
                console.error('API getRooms failed, falling back to localStorage:', error);
                return this.getRoomsFromLocalStorage();
            }
        }
    }

    getRoomsFromLocalStorage() {
        const data = localStorage.getItem(this.localStoragePrefix + 'rooms');
        return data ? JSON.parse(data) : [];
    }

    setRooms(rooms) {
        if (this.useLocalStorage) {
            localStorage.setItem(this.localStoragePrefix + 'rooms', JSON.stringify(rooms));
        }
    }

    async addRoom(roomData) {
        if (this.useLocalStorage) {
            const rooms = this.getRoomsFromLocalStorage();
            const newRoom = {
                id: Date.now(),
                ...roomData
            };
            rooms.push(newRoom);
            this.setRooms(rooms);
            return newRoom;
        } else {
            try {
                return await window.apiClient.addRoom(roomData);
            } catch (error) {
                console.error('API addRoom failed:', error);
                throw error;
            }
        }
    }

    async removeRoom(id) {
        if (this.useLocalStorage) {
            const rooms = this.getRoomsFromLocalStorage();
            const filtered = rooms.filter(r => r.id !== id);
            this.setRooms(filtered);
        } else {
            try {
                return await window.apiClient.removeRoom(id);
            } catch (error) {
                console.error('API removeRoom failed:', error);
                throw error;
            }
        }
    }

    // Subject methods
    async getSubjects() {
        if (!this.initialized) await this.init();
        
        if (this.useLocalStorage) {
            const data = localStorage.getItem(this.localStoragePrefix + 'subjects');
            return data ? JSON.parse(data) : [];
        } else {
            try {
                return await window.apiClient.getSubjects();
            } catch (error) {
                console.error('API getSubjects failed, falling back to localStorage:', error);
                return this.getSubjectsFromLocalStorage();
            }
        }
    }

    getSubjectsFromLocalStorage() {
        const data = localStorage.getItem(this.localStoragePrefix + 'subjects');
        return data ? JSON.parse(data) : [];
    }

    setSubjects(subjects) {
        if (this.useLocalStorage) {
            localStorage.setItem(this.localStoragePrefix + 'subjects', JSON.stringify(subjects));
        }
    }

    async addSubject(subjectData) {
        if (this.useLocalStorage) {
            const subjects = this.getSubjectsFromLocalStorage();
            const newSubject = {
                id: Date.now(),
                ...subjectData
            };
            subjects.push(newSubject);
            this.setSubjects(subjects);
            return newSubject;
        } else {
            try {
                return await window.apiClient.addSubject(subjectData);
            } catch (error) {
                console.error('API addSubject failed:', error);
                throw error;
            }
        }
    }

    async removeSubject(id) {
        if (this.useLocalStorage) {
            const subjects = this.getSubjectsFromLocalStorage();
            const filtered = subjects.filter(s => s.id !== id);
            this.setSubjects(filtered);
        } else {
            try {
                return await window.apiClient.removeSubject(id);
            } catch (error) {
                console.error('API removeSubject failed:', error);
                throw error;
            }
        }
    }

    // Leave requests methods
    async getLeaveRequests() {
        if (!this.initialized) await this.init();
        
        if (this.useLocalStorage) {
            const data = localStorage.getItem(this.localStoragePrefix + 'leaveRequests');
            return data ? JSON.parse(data) : [];
        } else {
            try {
                return await window.apiClient.getLeaveRequests();
            } catch (error) {
                console.error('API getLeaveRequests failed, falling back to localStorage:', error);
                return this.getLeaveRequestsFromLocalStorage();
            }
        }
    }

    getLeaveRequestsFromLocalStorage() {
        const data = localStorage.getItem(this.localStoragePrefix + 'leaveRequests');
        return data ? JSON.parse(data) : [];
    }

    setLeaveRequests(requests) {
        if (this.useLocalStorage) {
            localStorage.setItem(this.localStoragePrefix + 'leaveRequests', JSON.stringify(requests));
        }
    }

    async addLeaveRequest(requestData) {
        if (this.useLocalStorage) {
            const requests = this.getLeaveRequestsFromLocalStorage();
            const newRequest = {
                id: Date.now(),
                status: 'pending',
                created_at: new Date().toISOString(),
                ...requestData
            };
            requests.push(newRequest);
            this.setLeaveRequests(requests);
            return newRequest;
        } else {
            try {
                return await window.apiClient.addLeaveRequest(requestData);
            } catch (error) {
                console.error('API addLeaveRequest failed:', error);
                throw error;
            }
        }
    }

    async updateLeaveRequest(id, updates) {
        if (this.useLocalStorage) {
            const requests = this.getLeaveRequestsFromLocalStorage();
            const index = requests.findIndex(r => r.id === id);
            if (index !== -1) {
                requests[index] = { ...requests[index], ...updates };
                this.setLeaveRequests(requests);
                return requests[index];
            }
            return null;
        } else {
            try {
                return await window.apiClient.updateLeaveRequest(id, updates);
            } catch (error) {
                console.error('API updateLeaveRequest failed:', error);
                throw error;
            }
        }
    }

    // Breaks methods (localStorage only for now)
    getBreaks() {
        const data = localStorage.getItem(this.localStoragePrefix + 'breaks');
        return data ? JSON.parse(data) : [];
    }

    setBreaks(breaks) {
        localStorage.setItem(this.localStoragePrefix + 'breaks', JSON.stringify(breaks));
    }

    addBreak(breakData) {
        const breaks = this.getBreaks();
        const newBreak = {
            id: Date.now(),
            ...breakData
        };
        breaks.push(newBreak);
        this.setBreaks(breaks);
        return newBreak;
    }

    removeBreak(id) {
        const breaks = this.getBreaks();
        const filtered = breaks.filter(b => b.id !== id);
        this.setBreaks(filtered);
    }

    // Practicals methods
    getPracticals() {
        const data = localStorage.getItem(this.localStoragePrefix + 'practicals');
        return data ? JSON.parse(data) : [];
    }

    setPracticals(practicals) {
        localStorage.setItem(this.localStoragePrefix + 'practicals', JSON.stringify(practicals));
    }

    addPractical(practicalData) {
        const practicals = this.getPracticals();
        const newPractical = {
            id: Date.now(),
            ...practicalData
        };
        practicals.push(newPractical);
        this.setPracticals(practicals);
        return newPractical;
    }

    removePractical(id) {
        const practicals = this.getPracticals();
        const filtered = practicals.filter(p => p.id !== id);
        this.setPracticals(filtered);
    }

    // Timetable methods
    async getTimetable() {
        if (!this.initialized) await this.init();
        
        if (this.useLocalStorage) {
            const data = localStorage.getItem(this.localStoragePrefix + 'timetable');
            return data ? JSON.parse(data) : null;
        } else {
            try {
                return await window.apiClient.getTimetable();
            } catch (error) {
                console.error('API getTimetable failed, falling back to localStorage:', error);
                const data = localStorage.getItem(this.localStoragePrefix + 'timetable');
                return data ? JSON.parse(data) : null;
            }
        }
    }

    setTimetable(timetable) {
        if (this.useLocalStorage) {
            localStorage.setItem(this.localStoragePrefix + 'timetable', JSON.stringify(timetable));
        }
    }

    // Authentication methods
    getUsers() {
        const data = localStorage.getItem(this.localStoragePrefix + 'users');
        return data ? JSON.parse(data) : this.getDefaultUsers();
    }

    setUsers(users) {
        localStorage.setItem(this.localStoragePrefix + 'users', JSON.stringify(users));
    }

    getDefaultUsers() {
        return [
            {
                id: 1,
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                name: 'System Administrator',
                email: 'admin@college.edu'
            },
            {
                id: 2,
                username: 'faculty1',
                password: 'faculty123',
                role: 'faculty',
                name: 'S. P. Shinde',
                email: 'shinde@avoce.edu'
            },
            {
                id: 3,
                username: 'student1',
                password: 'student123',
                role: 'student',
                name: 'Sujay Patil',
                email: 'sujay@college.edu'
            }
        ];
    }

    async authenticateUser(username, password, role) {
        if (!this.useLocalStorage && this.apiAvailable) {
            try {
                return await window.apiClient.login(username, password, role);
            } catch (error) {
                console.log('API login failed, trying localStorage:', error.message);
            }
        }
        
        // Fallback to localStorage authentication
        const users = this.getUsers();
        const user = users.find(u => 
            u.username === username && 
            u.password === password && 
            u.role === role
        );
        
        if (user) {
            return {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name,
                email: user.email
            };
        }
        
        throw new Error('Invalid credentials');
    }

    // Current user management
    getCurrentUser() {
        const data = localStorage.getItem('currentUser');
        return data ? JSON.parse(data) : null;
    }

    setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    }

    clearCurrentUser() {
        localStorage.removeItem('currentUser');
    }

    // Utility methods
    clearAll() {
        const keys = Object.keys(localStorage).filter(key => 
            key.startsWith(this.localStoragePrefix) || key === 'currentUser'
        );
        keys.forEach(key => localStorage.removeItem(key));
        this.initLocalStorage();
    }

    // Statistics
    async getStatistics() {
        if (!this.useLocalStorage && this.apiAvailable) {
            try {
                return await window.apiClient.getStatistics();
            } catch (error) {
                console.log('API statistics failed, calculating locally');
            }
        }
        
        // Fallback to local calculation
        const faculty = await this.getFaculty();
        const rooms = await this.getRooms();
        const subjects = await this.getSubjects();
        const leaveRequests = await this.getLeaveRequests();
        
        return {
            faculty_count: faculty.length,
            room_count: rooms.length,
            subject_count: subjects.length,
            pending_leaves: leaveRequests.filter(r => r.status === 'pending').length,
            timetable_published: false
        };
    }

    // Export/Import functionality
    exportData() {
        const data = {
            faculty: this.getFacultyFromLocalStorage(),
            rooms: this.getRoomsFromLocalStorage(),
            subjects: this.getSubjectsFromLocalStorage(),
            breaks: this.getBreaks(),
            leaveRequests: this.getLeaveRequestsFromLocalStorage(),
            users: this.getUsers(),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timetable_data_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.faculty) this.setFaculty(data.faculty);
            if (data.rooms) this.setRooms(data.rooms);
            if (data.subjects) this.setSubjects(data.subjects);
            if (data.breaks) this.setBreaks(data.breaks);
            if (data.leaveRequests) this.setLeaveRequests(data.leaveRequests);
            if (data.users) this.setUsers(data.users);
            
            return true;
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
    }
}

// Create global instance
const storage = new StorageManager();

// Initialize storage manager
storage.init().then(() => {
    console.log('✓ Storage manager ready');
    
    // Notify other components that storage is ready
    window.dispatchEvent(new CustomEvent('storageReady'));
}).catch(error => {
    console.error('Storage manager initialization failed:', error);
});

// Export for use in other files
window.storage = storage;