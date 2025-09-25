// Practicals Management

class PracticalsManager {
    constructor() {
        this.practicals = [];
        this.init();
    }

    init() {
        this.loadPracticals();
        this.setupEventListeners();
    }

    loadPracticals() {
        this.practicals = storage.getPracticals();
        this.renderPracticalsList();
    }

    setupEventListeners() {
        const addPracticalBtn = document.getElementById('addPracticalBtn');
        if (addPracticalBtn) {
            addPracticalBtn.addEventListener('click', () => this.addPractical());
        }

        // Add enter key support for form inputs
        const practicalInputs = ['practicalDuration', 'practicalDescription'];
        practicalInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.addPractical();
                    }
                });
            }
        });
    }

    addPractical() {
        const subject = document.getElementById('practicalSubject').value;
        const faculty = document.getElementById('practicalFaculty').value;
        const room = document.getElementById('practicalRoom').value;
        const duration = document.getElementById('practicalDuration').value.trim();
        const description = document.getElementById('practicalDescription').value.trim();

        // Validate inputs
        const errors = utils.validateRequired({ subject, faculty, room, duration, description });
        if (errors.length > 0) {
            toastManager.show(errors[0], 'error');
            return;
        }

        // Validate duration
        const durationNum = parseInt(duration);
        if (isNaN(durationNum) || durationNum < 30 || durationNum > 240) {
            toastManager.show('Duration must be between 30 and 240 minutes', 'error');
            return;
        }

        try {
            const newPractical = storage.addPractical({ 
                subject, 
                faculty, 
                room, 
                duration: durationNum, 
                description 
            });
            this.practicals = storage.getPracticals();
            
            this.renderPracticalsList();
            this.clearForm();
            
            toastManager.show('Practical session added successfully!', 'success');
        } catch (error) {
            toastManager.show('Error adding practical session', 'error');
        }
    }

    removePractical(id) {
        try {
            storage.removePractical(id);
            this.practicals = storage.getPracticals();
            
            this.renderPracticalsList();
            
            toastManager.show('Practical session removed successfully!', 'success');
        } catch (error) {
            toastManager.show('Error removing practical session', 'error');
        }
    }

    renderPracticalsList() {
        const practicalsList = document.getElementById('practicalsList');
        if (!practicalsList) return;

        if (this.practicals.length === 0) {
            practicalsList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="beaker"></i>
                    <p>No practical sessions configured yet</p>
                </div>
            `;
        } else {
            practicalsList.innerHTML = this.practicals.map(practical => `
                <div class="practical-card">
                    <div class="practical-info">
                        <div class="practical-header">
                            <i data-lucide="beaker" class="w-5 h-5 text-purple-600"></i>
                            <div class="practical-title">${utils.escapeHtml(practical.subject)}</div>
                            <span class="badge bg-purple-100 text-purple-800">${practical.duration} mins</span>
                        </div>
                        <div class="practical-details">
                            <div class="practical-detail">
                                <span class="practical-label">Faculty:</span>
                                <span>${utils.escapeHtml(practical.faculty)}</span>
                            </div>
                            <div class="practical-detail">
                                <span class="practical-label">Room:</span>
                                <span>${utils.escapeHtml(practical.room)}</span>
                            </div>
                            <div class="practical-detail">
                                <span class="practical-label">Description:</span>
                                <span>${utils.escapeHtml(practical.description)}</span>
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-outline btn-delete" onclick="practicalsManager.removePractical(${practical.id})">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `).join('');
        }

        // Initialize Lucide icons
        setTimeout(() => {
            if (window.lucide) {
                lucide.createIcons();
            }
        }, 0);
    }

    updateSubjectDropdown() {
        const practicalSubjectSelect = document.getElementById('practicalSubject');
        if (practicalSubjectSelect && window.subjectsManager) {
            const currentValue = practicalSubjectSelect.value;
            const subjects = subjectsManager.getSubjects();
            practicalSubjectSelect.innerHTML = '<option value="">Select subject</option>' +
                subjects.map(subject => 
                    `<option value="${utils.escapeHtml(subject.name)}" ${currentValue === subject.name ? 'selected' : ''}>${utils.escapeHtml(subject.name)}</option>`
                ).join('');
        }
    }

    updateFacultyDropdown() {
        const practicalFacultySelect = document.getElementById('practicalFaculty');
        if (practicalFacultySelect && window.facultyManager) {
            const currentValue = practicalFacultySelect.value;
            const faculty = facultyManager.getFaculty();
            practicalFacultySelect.innerHTML = '<option value="">Select faculty</option>' +
                faculty.map(f => 
                    `<option value="${utils.escapeHtml(f.name)}" ${currentValue === f.name ? 'selected' : ''}>${utils.escapeHtml(f.name)}</option>`
                ).join('');
        }
    }

    updateRoomDropdown() {
        const practicalRoomSelect = document.getElementById('practicalRoom');
        if (practicalRoomSelect && window.roomsManager) {
            const currentValue = practicalRoomSelect.value;
            const rooms = roomsManager.getRooms();
            practicalRoomSelect.innerHTML = '<option value="">Select room</option>' +
                rooms.map(room => 
                    `<option value="${utils.escapeHtml(room.name)}" ${currentValue === room.name ? 'selected' : ''}>${utils.escapeHtml(room.name)} (${room.capacity})</option>`
                ).join('');
        }
    }

    clearForm() {
        document.getElementById('practicalSubject').value = '';
        document.getElementById('practicalFaculty').value = '';
        document.getElementById('practicalRoom').value = '';
        document.getElementById('practicalDuration').value = '';
        document.getElementById('practicalDescription').value = '';
    }

    getPracticals() {
        return this.practicals;
    }

    getPracticalById(id) {
        return this.practicals.find(p => p.id === id);
    }

    getPracticalsBySubject(subject) {
        return this.practicals.filter(p => p.subject === subject);
    }

    getPracticalsByFaculty(faculty) {
        return this.practicals.filter(p => p.faculty === faculty);
    }

    getPracticalsByRoom(room) {
        return this.practicals.filter(p => p.room === room);
    }

    updatePractical(id, updates) {
        try {
            const practicalIndex = this.practicals.findIndex(p => p.id === id);
            if (practicalIndex !== -1) {
                this.practicals[practicalIndex] = { ...this.practicals[practicalIndex], ...updates };
                storage.setPracticals(this.practicals);
                
                this.renderPracticalsList();
                
                toastManager.show('Practical session updated successfully!', 'success');
                return this.practicals[practicalIndex];
            }
            return null;
        } catch (error) {
            toastManager.show('Error updating practical session', 'error');
            return null;
        }
    }

    // Search practicals
    searchPracticals(query) {
        if (!query) return this.practicals;
        
        const searchTerm = query.toLowerCase();
        return this.practicals.filter(practical => 
            practical.subject.toLowerCase().includes(searchTerm) ||
            practical.faculty.toLowerCase().includes(searchTerm) ||
            practical.room.toLowerCase().includes(searchTerm) ||
            practical.description.toLowerCase().includes(searchTerm)
        );
    }

    // Filter practicals by duration range
    filterByDuration(minDuration, maxDuration) {
        return this.practicals.filter(practical => 
            practical.duration >= minDuration && practical.duration <= maxDuration
        );
    }

    // Get practical statistics
    getStatistics() {
        const stats = {
            total: this.practicals.length,
            subjects: {},
            faculty: {},
            rooms: {},
            durations: {},
            totalDuration: 0,
            averageDuration: 0
        };

        this.practicals.forEach(practical => {
            // Count by subject
            if (stats.subjects[practical.subject]) {
                stats.subjects[practical.subject]++;
            } else {
                stats.subjects[practical.subject] = 1;
            }

            // Count by faculty
            if (stats.faculty[practical.faculty]) {
                stats.faculty[practical.faculty]++;
            } else {
                stats.faculty[practical.faculty] = 1;
            }

            // Count by room
            if (stats.rooms[practical.room]) {
                stats.rooms[practical.room]++;
            } else {
                stats.rooms[practical.room] = 1;
            }

            // Count by duration ranges
            const durationRange = this.getDurationRange(practical.duration);
            if (stats.durations[durationRange]) {
                stats.durations[durationRange]++;
            } else {
                stats.durations[durationRange] = 1;
            }

            stats.totalDuration += practical.duration;
        });

        stats.averageDuration = this.practicals.length > 0 ? 
            Math.round(stats.totalDuration / this.practicals.length) : 0;

        return stats;
    }

    getDurationRange(duration) {
        if (duration <= 60) return '30-60 mins';
        if (duration <= 90) return '61-90 mins';
        if (duration <= 120) return '91-120 mins';
        if (duration <= 180) return '121-180 mins';
        return '181+ mins';
    }

    // Export practicals data
    exportPracticals() {
        const data = {
            practicals: this.practicals,
            statistics: this.getStatistics(),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `practicals_data_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        toastManager.show('Practicals data exported successfully!', 'success');
    }

    // Import practicals data
    importPracticals(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.practicals && Array.isArray(data.practicals)) {
                storage.setPracticals(data.practicals);
                this.loadPracticals();
                
                toastManager.show('Practicals data imported successfully!', 'success');
                return true;
            } else {
                throw new Error('Invalid practicals data format');
            }
        } catch (error) {
            toastManager.show('Error importing practicals data: ' + error.message, 'error');
            return false;
        }
    }

    // Validate practical data
    validatePractical(practicalData) {
        const errors = [];
        
        if (!practicalData.subject || practicalData.subject.trim() === '') {
            errors.push('Subject is required');
        }
        
        if (!practicalData.faculty || practicalData.faculty.trim() === '') {
            errors.push('Faculty is required');
        }
        
        if (!practicalData.room || practicalData.room.trim() === '') {
            errors.push('Room is required');
        }
        
        if (!practicalData.duration || isNaN(parseInt(practicalData.duration)) || 
            parseInt(practicalData.duration) < 30 || parseInt(practicalData.duration) > 240) {
            errors.push('Duration must be between 30 and 240 minutes');
        }
        
        if (!practicalData.description || practicalData.description.trim() === '') {
            errors.push('Description is required');
        }
        
        return errors;
    }

    // Check for conflicts
    checkConflicts(practicalData) {
        const conflicts = [];
        
        // Check if faculty is already assigned to another practical at the same time
        // This would require integration with timetable scheduling
        
        // Check if room is already booked
        // This would require integration with timetable scheduling
        
        return conflicts;
    }

    // Generate practical schedule
    generateSchedule() {
        const schedule = [];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
        this.practicals.forEach(practical => {
            // Calculate how many slots this practical needs based on duration
            const slotsNeeded = Math.ceil(practical.duration / 60); // Assuming 60-minute slots
            
            // Find available time slots for this practical
            // This would integrate with the main timetable
            for (let day of days) {
                schedule.push({
                    day,
                    practical,
                    slotsNeeded,
                    suggested: true
                });
                break; // For now, just assign to first day
            }
        });
        
        return schedule;
    }
}

// Initialize practicals manager
const practicalsManager = new PracticalsManager();

// Export for use in other files
window.practicalsManager = practicalsManager;