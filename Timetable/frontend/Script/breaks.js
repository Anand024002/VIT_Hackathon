// Breaks Management

class BreaksManager {
    constructor() {
        this.breaks = [];
        this.init();
    }

    init() {
        this.loadBreaks();
        this.setupEventListeners();
    }

    loadBreaks() {
        this.breaks = storage.getBreaks();
        this.renderBreaksList();
    }

    setupEventListeners() {
        const addBreakBtn = document.getElementById('addBreakBtn');
        if (addBreakBtn) {
            addBreakBtn.addEventListener('click', () => this.addBreak());
        }

        // Add enter key support for form inputs
        const breakInputs = ['breakName', 'breakStartTime', 'breakDuration'];
        breakInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && inputId !== 'breakType') {
                        this.addBreak();
                    }
                });
            }
        });
    }

    addBreak() {
        const name = document.getElementById('breakName').value.trim();
        const startTime = document.getElementById('breakStartTime').value;
        const duration = document.getElementById('breakDuration').value.trim();
        const type = document.getElementById('breakType').value;

        // Validate inputs
        const errors = utils.validateRequired({ name, startTime, duration, type });
        if (errors.length > 0) {
            toastManager.show(errors[0], 'error');
            return;
        }

        // Validate duration
        const durationNum = parseInt(duration);
        if (isNaN(durationNum) || durationNum < 5 || durationNum > 180) {
            toastManager.show('Duration must be between 5 and 180 minutes', 'error');
            return;
        }

        // Check if break with same name already exists
        if (this.breaks.some(b => b.name === name)) {
            toastManager.show('Break with this name already exists', 'error');
            return;
        }

        // Validate time format
        if (!this.isValidTime(startTime)) {
            toastManager.show('Please enter a valid start time', 'error');
            return;
        }

        try {
            const newBreak = storage.addBreak({ 
                name, 
                startTime, 
                duration: durationNum, 
                type 
            });
            this.breaks = storage.getBreaks();
            
            this.renderBreaksList();
            this.clearForm();
            
            toastManager.show('Break added successfully!', 'success');
        } catch (error) {
            toastManager.show('Error adding break', 'error');
        }
    }

    removeBreak(id) {
        try {
            storage.removeBreak(id);
            this.breaks = storage.getBreaks();
            
            this.renderBreaksList();
            
            toastManager.show('Break removed successfully!', 'success');
        } catch (error) {
            toastManager.show('Error removing break', 'error');
        }
    }

    renderBreaksList() {
        const breaksList = document.getElementById('breaksList');
        if (!breaksList) return;

        if (this.breaks.length === 0) {
            breaksList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="timer"></i>
                    <p>No breaks configured yet</p>
                </div>
            `;
        } else {
            // Sort breaks by start time
            const sortedBreaks = [...this.breaks].sort((a, b) => a.startTime.localeCompare(b.startTime));
            
            breaksList.innerHTML = sortedBreaks.map(breakItem => `
                <div class="break-card">
                    <div class="break-info">
                        <div class="break-header">
                            <i data-lucide="timer" class="w-5 h-5 text-green-600"></i>
                            <div class="break-title">${utils.escapeHtml(breakItem.name)}</div>
                            <span class="badge bg-green-100 text-green-800">${this.formatBreakType(breakItem.type)}</span>
                        </div>
                        <div class="break-details">
                            <div class="break-detail">
                                <i data-lucide="clock" class="w-4 h-4"></i>
                                <span>${this.formatTime(breakItem.startTime)}</span>
                            </div>
                            <div class="break-detail">
                                <i data-lucide="timer" class="w-4 h-4"></i>
                                <span>${breakItem.duration} minutes</span>
                            </div>
                            <div class="break-detail">
                                <i data-lucide="arrow-right" class="w-4 h-4"></i>
                                <span>Ends at ${this.calculateEndTime(breakItem.startTime, breakItem.duration)}</span>
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-outline btn-delete" onclick="breaksManager.removeBreak(${breakItem.id})">
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

    formatBreakType(type) {
        const types = {
            'meal': 'Meal Break',
            'short': 'Short Break',
            'assembly': 'Assembly',
            'other': 'Other'
        };
        return types[type] || type;
    }

    formatTime(timeString) {
        if (!timeString) return '';
        
        try {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours);
            const min = parseInt(minutes);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
            return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
        } catch (error) {
            return timeString;
        }
    }

    calculateEndTime(startTime, duration) {
        try {
            const [hours, minutes] = startTime.split(':');
            const startDate = new Date();
            startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            const endDate = new Date(startDate.getTime() + duration * 60000);
            const endHours = endDate.getHours();
            const endMinutes = endDate.getMinutes();
            
            const ampm = endHours >= 12 ? 'PM' : 'AM';
            const displayHour = endHours === 0 ? 12 : (endHours > 12 ? endHours - 12 : endHours);
            return `${displayHour}:${endMinutes.toString().padStart(2, '0')} ${ampm}`;
        } catch (error) {
            return 'Invalid time';
        }
    }

    isValidTime(timeString) {
        if (!timeString) return false;
        
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(timeString);
    }

    clearForm() {
        document.getElementById('breakName').value = '';
        document.getElementById('breakStartTime').value = '';
        document.getElementById('breakDuration').value = '';
        document.getElementById('breakType').value = '';
    }

    getBreaks() {
        return this.breaks;
    }

    getBreakById(id) {
        return this.breaks.find(b => b.id === id);
    }

    getBreaksByType(type) {
        return this.breaks.filter(b => b.type === type);
    }

    getBreaksInTimeRange(startTime, endTime) {
        return this.breaks.filter(breakItem => {
            const breakStart = this.timeToMinutes(breakItem.startTime);
            const breakEnd = breakStart + breakItem.duration;
            const rangeStart = this.timeToMinutes(startTime);
            const rangeEnd = this.timeToMinutes(endTime);
            
            return (breakStart >= rangeStart && breakStart < rangeEnd) ||
                   (breakEnd > rangeStart && breakEnd <= rangeEnd) ||
                   (breakStart <= rangeStart && breakEnd >= rangeEnd);
        });
    }

    timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':');
        return parseInt(hours) * 60 + parseInt(minutes);
    }

    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    updateBreak(id, updates) {
        try {
            const breakIndex = this.breaks.findIndex(b => b.id === id);
            if (breakIndex !== -1) {
                this.breaks[breakIndex] = { ...this.breaks[breakIndex], ...updates };
                storage.setBreaks(this.breaks);
                
                this.renderBreaksList();
                
                toastManager.show('Break updated successfully!', 'success');
                return this.breaks[breakIndex];
            }
            return null;
        } catch (error) {
            toastManager.show('Error updating break', 'error');
            return null;
        }
    }

    // Search breaks
    searchBreaks(query) {
        if (!query) return this.breaks;
        
        const searchTerm = query.toLowerCase();
        return this.breaks.filter(breakItem => 
            breakItem.name.toLowerCase().includes(searchTerm) ||
            breakItem.type.toLowerCase().includes(searchTerm) ||
            this.formatBreakType(breakItem.type).toLowerCase().includes(searchTerm)
        );
    }

    // Filter breaks by type
    filterByType(type) {
        if (!type) return this.breaks;
        return this.breaks.filter(breakItem => breakItem.type === type);
    }

    // Filter breaks by duration range
    filterByDuration(minDuration, maxDuration) {
        return this.breaks.filter(breakItem => 
            breakItem.duration >= minDuration && breakItem.duration <= maxDuration
        );
    }

    // Get break statistics
    getStatistics() {
        const stats = {
            total: this.breaks.length,
            types: {},
            durations: {},
            totalDuration: 0,
            averageDuration: 0,
            dailyBreakTime: 0
        };

        this.breaks.forEach(breakItem => {
            // Count by type
            if (stats.types[breakItem.type]) {
                stats.types[breakItem.type].count++;
                stats.types[breakItem.type].totalDuration += breakItem.duration;
            } else {
                stats.types[breakItem.type] = {
                    count: 1,
                    totalDuration: breakItem.duration
                };
            }

            // Count by duration ranges
            const durationRange = this.getDurationRange(breakItem.duration);
            if (stats.durations[durationRange]) {
                stats.durations[durationRange]++;
            } else {
                stats.durations[durationRange] = 1;
            }

            stats.totalDuration += breakItem.duration;
        });

        stats.averageDuration = this.breaks.length > 0 ? 
            Math.round(stats.totalDuration / this.breaks.length) : 0;
        
        stats.dailyBreakTime = stats.totalDuration;

        return stats;
    }

    getDurationRange(duration) {
        if (duration <= 15) return '5-15 mins';
        if (duration <= 30) return '16-30 mins';
        if (duration <= 60) return '31-60 mins';
        if (duration <= 120) return '61-120 mins';
        return '121+ mins';
    }

    // Check for time conflicts
    checkTimeConflicts(startTime, duration, excludeId = null) {
        const newBreakStart = this.timeToMinutes(startTime);
        const newBreakEnd = newBreakStart + duration;
        
        const conflicts = this.breaks.filter(breakItem => {
            if (excludeId && breakItem.id === excludeId) return false;
            
            const existingStart = this.timeToMinutes(breakItem.startTime);
            const existingEnd = existingStart + breakItem.duration;
            
            return (newBreakStart < existingEnd && newBreakEnd > existingStart);
        });
        
        return conflicts;
    }

    // Generate break schedule
    generateSchedule() {
        const sortedBreaks = [...this.breaks].sort((a, b) => 
            this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
        );
        
        return sortedBreaks.map(breakItem => ({
            ...breakItem,
            startTimeFormatted: this.formatTime(breakItem.startTime),
            endTime: this.calculateEndTime(breakItem.startTime, breakItem.duration),
            typeFormatted: this.formatBreakType(breakItem.type)
        }));
    }

    // Export breaks data
    exportBreaks() {
        const data = {
            breaks: this.breaks,
            schedule: this.generateSchedule(),
            statistics: this.getStatistics(),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `breaks_data_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        toastManager.show('Breaks data exported successfully!', 'success');
    }

    // Import breaks data
    importBreaks(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.breaks && Array.isArray(data.breaks)) {
                storage.setBreaks(data.breaks);
                this.loadBreaks();
                
                toastManager.show('Breaks data imported successfully!', 'success');
                return true;
            } else {
                throw new Error('Invalid breaks data format');
            }
        } catch (error) {
            toastManager.show('Error importing breaks data: ' + error.message, 'error');
            return false;
        }
    }

    // Validate break data
    validateBreak(breakData) {
        const errors = [];
        
        if (!breakData.name || breakData.name.trim() === '') {
            errors.push('Break name is required');
        }
        
        if (!breakData.startTime || !this.isValidTime(breakData.startTime)) {
            errors.push('Valid start time is required');
        }
        
        if (!breakData.duration || isNaN(parseInt(breakData.duration)) || 
            parseInt(breakData.duration) < 5 || parseInt(breakData.duration) > 180) {
            errors.push('Duration must be between 5 and 180 minutes');
        }
        
        if (!breakData.type || breakData.type.trim() === '') {
            errors.push('Break type is required');
        }
        
        // Check for name conflicts
        if (this.breaks.some(b => b.name === breakData.name)) {
            errors.push('Break with this name already exists');
        }
        
        // Check for time conflicts
        if (breakData.startTime && breakData.duration) {
            const conflicts = this.checkTimeConflicts(breakData.startTime, parseInt(breakData.duration));
            if (conflicts.length > 0) {
                errors.push(`Time conflict with existing break: ${conflicts[0].name}`);
            }
        }
        
        return errors;
    }
}

// Initialize breaks manager
const breaksManager = new BreaksManager();

// Export for use in other files
window.breaksManager = breaksManager;