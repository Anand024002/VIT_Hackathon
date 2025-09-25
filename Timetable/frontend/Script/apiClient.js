// apiClient.js - Enhanced API Integration with proper breaks and practicals support

class APIClient {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.headers = {
            'Content-Type': 'application/json'
        };
        this.initialized = false;
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.headers,
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            if (!data.success) {
                throw new Error(data.error || 'API request failed');
            }

            // Return data.data if it exists, otherwise return the whole data object
            return data.data !== undefined ? data.data : data;
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    // Faculty methods
    async getFaculty() {
        return await this.makeRequest('/faculty');
    }

    async addFaculty(facultyData) {
        const id = await this.makeRequest('/faculty', {
            method: 'POST',
            body: JSON.stringify(facultyData)
        });
        return { id, ...facultyData };
    }

    async updateFaculty(id, updates) {
        await this.makeRequest(`/faculty/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        return { id, ...updates };
    }

    async removeFaculty(id) {
        return await this.makeRequest(`/faculty/${id}`, {
            method: 'DELETE'
        });
    }

    // Room methods
    async getRooms() {
        return await this.makeRequest('/rooms');
    }

    async addRoom(roomData) {
        const id = await this.makeRequest('/rooms', {
            method: 'POST',
            body: JSON.stringify(roomData)
        });
        return { id, ...roomData };
    }

    async updateRoom(id, updates) {
        await this.makeRequest(`/rooms/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        return { id, ...updates };
    }

    async removeRoom(id) {
        return await this.makeRequest(`/rooms/${id}`, {
            method: 'DELETE'
        });
    }

    // Subject methods
    async getSubjects() {
        return await this.makeRequest('/subjects');
    }

    async addSubject(subjectData) {
        const id = await this.makeRequest('/subjects', {
            method: 'POST',
            body: JSON.stringify(subjectData)
        });
        return { id, ...subjectData };
    }

    async updateSubject(id, updates) {
        await this.makeRequest(`/subjects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        return { id, ...updates };
    }

    async removeSubject(id) {
        return await this.makeRequest(`/subjects/${id}`, {
            method: 'DELETE'
        });
    }

    // Leave request methods  
    async getLeaveRequests() {
        return await this.makeRequest('/leave-requests');
    }

    async addLeaveRequest(leaveData) {
        // Map frontend field names to backend expected names
        const backendData = {
            faculty: leaveData.faculty || leaveData.faculty_name,
            date: leaveData.date,
            period: leaveData.period,
            reason: leaveData.reason
        };
        
        const id = await this.makeRequest('/leave-requests', {
            method: 'POST',
            body: JSON.stringify(backendData)
        });
        return { 
            id, 
            ...leaveData, 
            status: 'pending', 
            created_at: new Date().toISOString() 
        };
    }

    async updateLeaveRequest(id, updates) {
        await this.makeRequest(`/leave-requests/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        return updates;
    }

    // Enhanced timetable methods with breaks and practicals support
    async getTimetable() {
        try {
            const data = await this.makeRequest('/timetable');
            return data;
        } catch (error) {
            // Return null if no timetable exists yet
            if (error.message.includes('not found')) {
                return null;
            }
            throw error;
        }
    }

    async generateTimetable(requestData = {}) {
        console.log('API Client: Generating timetable with data:', requestData);
        
        // Ensure we have the required structure
        const payload = {
            constraints: requestData.constraints || {
                maxClassesPerDay: 6,
                preferredRoomTypes: ['Classroom', 'Laboratory'],
                workloadBalance: true,
                diversifySubjects: true
            },
            breaks: requestData.breaks || [],
            practicals: requestData.practicals || []
        };
        
        console.log('API Client: Sending payload:', JSON.stringify(payload, null, 2));
        
        try {
            const response = await this.makeRequest('/generate-timetable', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            console.log('API Client: Received response:', response);
            return response;
        } catch (error) {
            console.error('API Client: Generate timetable failed:', error);
            throw error;
        }
    }

    async publishTimetable(timetableId) {
        console.log('API Client: Publishing timetable with ID:', timetableId);
        
        try {
            const response = await this.makeRequest('/publish-timetable', {
                method: 'POST',
                body: JSON.stringify({ timetable_id: timetableId })
            });
            
            console.log('API Client: Publish response:', response);
            return response;
        } catch (error) {
            console.error('API Client: Publish timetable failed:', error);
            throw error;
        }
    }

    async autoReschedule(leaveRequestId) {
        console.log('API Client: Auto-rescheduling for leave request:', leaveRequestId);
        
        try {
            const response = await this.makeRequest('/auto-reschedule', {
                method: 'POST',
                body: JSON.stringify({ leave_request_id: leaveRequestId })
            });
            
            console.log('API Client: Auto-reschedule response:', response);
            return response;
        } catch (error) {
            console.error('API Client: Auto-reschedule failed:', error);
            throw error;
        }
    }

    // Debug method to check timetable structure
    async debugTimetableStructure() {
        try {
            const response = await this.makeRequest('/debug/timetable-structure');
            console.log('Timetable structure debug:', response);
            return response;
        } catch (error) {
            console.error('Debug timetable structure failed:', error);
            throw error;
        }
    }

    // Authentication methods
    async login(username, password, role) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ username, password, role })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Authentication failed');
            }

            console.log('Login successful:', data.data);
            return data.data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    // Statistics
    async getStatistics() {
        return await this.makeRequest('/statistics');
    }

    // Health check
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
            const data = await response.json();
            return data.status === 'healthy';
        } catch (error) {
            console.warn('Health check failed:', error);
            return false;
        }
    }

    // Batch operations
    async importFaculty(facultyList) {
        const results = [];
        for (const faculty of facultyList) {
            try {
                const result = await this.addFaculty(faculty);
                results.push(result);
            } catch (error) {
                console.error(`Failed to import faculty: ${faculty.name}`, error);
            }
        }
        return results;
    }

    async importRooms(roomsList) {
        const results = [];
        for (const room of roomsList) {
            try {
                const result = await this.addRoom(room);
                results.push(result);
            } catch (error) {
                console.error(`Failed to import room: ${room.name}`, error);
            }
        }
        return results;
    }

    async importSubjects(subjectsList) {
        const results = [];
        for (const subject of subjectsList) {
            try {
                const result = await this.addSubject(subject);
                results.push(result);
            } catch (error) {
                console.error(`Failed to import subject: ${subject.name}`, error);
            }
        }
        return results;
    }

    async importLeaveRequests(leaveRequestsList) {
        const results = [];
        for (const leave of leaveRequestsList) {
            try {
                const result = await this.addLeaveRequest(leave);
                results.push(result);
            } catch (error) {
                console.error('Failed to import leave request', error);
            }
        }
        return results;
    }

    // Enhanced validation methods
    async validateTimetableGeneration() {
        try {
            const [faculty, rooms, subjects] = await Promise.all([
                this.getFaculty(),
                this.getRooms(),
                this.getSubjects()
            ]);
            
            const validation = {
                valid: true,
                issues: [],
                warnings: []
            };
            
            if (faculty.length === 0) {
                validation.valid = false;
                validation.issues.push('No faculty members found. Add at least one faculty member.');
            }
            
            if (rooms.length === 0) {
                validation.valid = false;
                validation.issues.push('No rooms found. Add at least one room.');
            }
            
            if (subjects.length === 0) {
                validation.valid = false;
                validation.issues.push('No subjects found. Add at least one subject.');
            }
            
            // Check for subject-faculty mismatches
            const subjectNames = subjects.map(s => s.name.toLowerCase());
            const facultySubjects = faculty.map(f => f.subject.toLowerCase());
            
            const unmatchedSubjects = subjectNames.filter(subjectName => 
                !facultySubjects.some(facultySubject => 
                    facultySubject === subjectName || 
                    facultySubject.includes(subjectName) || 
                    subjectName.includes(facultySubject)
                )
            );
            
            if (unmatchedSubjects.length > 0) {
                validation.warnings.push(
                    `Some subjects may not have matching faculty: ${unmatchedSubjects.join(', ')}`
                );
            }
            
            // Check room capacity vs expected class sizes
            const smallRooms = rooms.filter(r => r.capacity < 20);
            if (smallRooms.length === rooms.length && rooms.length > 0) {
                validation.warnings.push('All rooms have small capacity (<20). Consider adding larger rooms.');
            }
            
            return validation;
        } catch (error) {
            console.error('Validation failed:', error);
            return {
                valid: false,
                issues: ['Failed to validate data: ' + error.message],
                warnings: []
            };
        }
    }

    // Development methods
    async resetDatabase() {
        try {
            const response = await this.makeRequest('/dev/reset-db', {
                method: 'POST'
            });
            console.log('Database reset successfully');
            return response;
        } catch (error) {
            console.error('Failed to reset database:', error);
            throw error;
        }
    }

    // Initialize API client
    async init() {
        try {
            const isHealthy = await this.healthCheck();
            this.initialized = true;
            console.log(`API Client initialized. Health check: ${isHealthy ? 'PASS' : 'FAIL'}`);
            return isHealthy;
        } catch (error) {
            console.error('API client initialization failed:', error);
            this.initialized = false;
            return false;
        }
    }

    // Utility methods
    isInitialized() {
        return this.initialized;
    }

    getBaseURL() {
        return this.baseURL;
    }

    setBaseURL(url) {
        this.baseURL = url;
    }

    // Request interceptor for debugging
    async debugRequest(endpoint, options = {}) {
        console.log(`API Debug - Request to ${endpoint}:`, options);
        try {
            const result = await this.makeRequest(endpoint, options);
            console.log(`API Debug - Response from ${endpoint}:`, result);
            return result;
        } catch (error) {
            console.error(`API Debug - Error from ${endpoint}:`, error);
            throw error;
        }
    }
}

// Create global instance
const apiClient = new APIClient();

// Initialize immediately with better error handling
apiClient.init().then(isHealthy => {
    if (isHealthy) {
        console.log('✅ API Client ready and backend is healthy');
    } else {
        console.warn('⚠️ API Client initialized but backend health check failed');
        console.log('The system will fall back to localStorage for data management');
    }
}).catch(error => {
    console.error('❌ API Client initialization failed:', error);
    console.log('The system will fall back to localStorage for data management');
});

// Export for use in other files
window.apiClient = apiClient;

// Development utilities
if (typeof window !== 'undefined') {
    window.apiDebug = {
        client: apiClient,
        validateTimetable: () => apiClient.validateTimetableGeneration(),
        debugTimetable: () => apiClient.debugTimetableStructure(),
        resetDB: () => apiClient.resetDatabase(),
        healthCheck: () => apiClient.healthCheck()
    };
}