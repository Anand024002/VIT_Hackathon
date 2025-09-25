// Fixed timetable.js - Corrected break handling and optimization
class TimetableManager {
    constructor() {
        this.timetable = {};
        this.settings = {
            published: false,
            lastGenerated: null,
            lastPublished: null
        };
        this.periods = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-1:00', '2:00-3:00', '3:00-4:00'];
        this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        this.availableTimetables = [];
        this.refreshInterval = null;
        this.init();
    }

    init() {
        this.loadTimetable();
        this.setupEventListeners();
        this.setupPeriodicRefresh();
    }

    setupPeriodicRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            const timetableGrid = document.getElementById('timetableGrid') || 
                                document.getElementById('facultyTimetableGrid') || 
                                document.getElementById('studentTimetableGrid');
            
            if (timetableGrid && timetableGrid.offsetParent !== null) {
                this.loadTimetable().catch(error => {
                    console.error('Periodic timetable refresh failed:', error);
                });
            }
        }, 5 * 60 * 1000);
    }

    async loadTimetable() {
        try {
            const response = await apiClient.getTimetable();
            
            if (response) {
                if (response.timetable) {
                    this.timetable = response.timetable;
                    this.settings = {
                        published: true,
                        lastGenerated: response.created_at || new Date().toISOString(),
                        lastPublished: response.created_at || new Date().toISOString()
                    };
                } else {
                    this.timetable = response;
                    this.settings = {
                        published: true,
                        lastGenerated: new Date().toISOString(),
                        lastPublished: new Date().toISOString()
                    };
                }
            } else {
                this.timetable = this.getDefaultTimetable();
                this.settings = {
                    published: false,
                    lastGenerated: null,
                    lastPublished: null
                };
            }
            
            this.updateStatus();
        } catch (error) {
            console.error('Error loading timetable:', error);
            this.timetable = this.getDefaultTimetable();
            this.settings = {
                published: false,
                lastGenerated: null,
                lastPublished: null
            };
            this.updateStatus();
        }
    }

    setupEventListeners() {
        const generateBtn = document.getElementById('generateTimetableBtn');
        const publishBtn = document.getElementById('publishTimetableBtn');

        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateTimetable());
        }

        if (publishBtn) {
            publishBtn.addEventListener('click', () => this.publishTimetable());
        }
    }

    async generateTimetable() {
        const generateBtn = document.getElementById('generateTimetableBtn');
        const publishBtn = document.getElementById('publishTimetableBtn');

        try {
            utils.setLoading(generateBtn, true);

            // Get current data for validation
            const faculty = await apiClient.getFaculty();
            const rooms = await apiClient.getRooms();
            const subjects = await apiClient.getSubjects();
            
            // Get breaks and practicals from storage - FIXED
            const breaks = storage.getBreaks();
            const practicals = storage.getPracticals();

            if (faculty.length === 0 || rooms.length === 0 || subjects.length === 0) {
                throw new Error('Please add faculty, rooms, and subjects before generating timetable');
            }

            console.log('Sending data to backend:', {
                faculty: faculty.length,
                rooms: rooms.length, 
                subjects: subjects.length,
                breaks: breaks.length,
                practicals: practicals.length
            });

            // Send enhanced request with all data - FIXED
            const response = await apiClient.generateTimetable({
                constraints: {
                    maxClassesPerDay: 6,
                    preferredRoomTypes: ['Classroom', 'Laboratory'],
                    workloadBalance: true,
                    diversifySubjects: true // NEW: Prevent same subject repeating
                },
                breaks: breaks,
                practicals: practicals // NEW: Include practicals
            });

            if (!response || !response.timetables) {
                throw new Error('Invalid response format: timetables property missing');
            }

            this.availableTimetables = response.timetables;
            this.currentTimetableId = response.timetable_id;
            
            const bestTimetable = this.availableTimetables[0];
            this.timetable = bestTimetable.timetable || bestTimetable;
            
            this.settings.lastGenerated = new Date().toISOString();
            this.settings.published = false;

            this.updateStatus();
            this.renderTimetableGrid();
            this.showTimetableOptions();
            
            if (publishBtn) {
                publishBtn.disabled = false;
            }

            toastManager.show(
                `Generated ${this.availableTimetables.length} optimized timetable options! ` +
                `Best score: ${bestTimetable.score}/100`, 
                'success'
            );

        } catch (error) {
            console.error('Timetable generation error:', error);
            toastManager.show(error.message, 'error');
        } finally {
            utils.setLoading(generateBtn, false);
        }
    }

    async publishTimetable() {
        const publishBtn = document.getElementById('publishTimetableBtn');

        if (!this.currentTimetableId) {
            toastManager.show('Please generate a timetable first before publishing.', 'error');
            return;
        }

        try {
            utils.setLoading(publishBtn, true);

            const response = await apiClient.publishTimetable(this.currentTimetableId);

            this.settings.published = true;
            this.settings.lastPublished = new Date().toISOString();

            this.updateStatus();

            toastManager.show('Timetable published successfully! Faculty and students can now view the updated schedule.', 'success');

        } catch (error) {
            console.error('Publish error:', error);
            toastManager.show('Failed to publish timetable. Please try again.', 'error');
        } finally {
            utils.setLoading(publishBtn, false);
        }
    }

    showTimetableOptions() {
        if (this.availableTimetables.length <= 1) return;

        const timetableInfo = document.getElementById('timetableInfo');
        if (timetableInfo) {
            const optionsHtml = `
                <div class="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h5 class="text-blue-600 font-medium mb-2">Generated Options:</h5>
                    ${this.availableTimetables.map((tt, index) => `
                        <div class="text-sm ${index === 0 ? 'font-medium text-blue-800' : 'text-blue-700'}">
                            Option ${index + 1}: Score ${tt.score}/100 
                            (Utilization: ${tt.metrics.utilization_rate}%, 
                            Balance: ${tt.metrics.workload_balance}%)
                            ${index === 0 ? ' ✅ Active' : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            timetableInfo.innerHTML += optionsHtml;
        }
    }

    async handleLeaveApproval(leaveRequest) {
        try {
            const response = await apiClient.autoReschedule({
                leave_request_id: leaveRequest.id
            });

            if (response && !response.success) {
                toastManager.show(
                    response.error || 'Auto-rescheduling failed. Manual intervention may be required.', 
                    'warning'
                );
                return;
            }

            this.timetable = response.data || response;
            this.settings.lastGenerated = new Date().toISOString();
            this.settings.published = true;

            this.renderTimetableGrid();
            this.updateStatus();

            toastManager.show(
                response.message || 'Timetable automatically rescheduled for approved leave', 
                'success'
            );
        } catch (error) {
            console.error('Auto-reschedule error:', error);
            toastManager.show('Error during auto-rescheduling. Please check manually.', 'error');
        }
    }

    renderTimetableGrid(container = 'timetableGrid', highlightFaculty = null) {
        const gridContainer = document.getElementById(container);
        if (!gridContainer) {
            console.warn(`Timetable container '${container}' not found`);
            return;
        }

        gridContainer.innerHTML = '<div class="text-center py-8">Rendering timetable...</div>';

        try {
            // FIXED: Enhanced rendering with proper break and practical handling
            const tableHTML = `
                <div class="timetable-grid">
                    <table class="table">
                        <thead>
                            <tr>
                                <th class="timetable-header">Time</th>
                                ${this.days.map(day => `<th class="timetable-header">${day}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${this.periods.map(period => `
                                <tr>
                                    <td class="timetable-time">${period}</td>
                                    ${this.days.map(day => {
                                        const slot = this.timetable[day] && this.timetable[day][period];
                                        const isHighlighted = highlightFaculty && slot && slot.faculty === highlightFaculty;
                                        
                                        if (slot) {
                                            // Handle break slots - FIXED
                                            if (slot.subject === 'BREAK' || slot.type === 'break') {
                                                return `
                                                    <td class="timetable-cell break-cell">
                                                        <div class="font-medium text-sm text-orange-600">BREAK</div>
                                                        <div class="text-xs text-orange-500">${slot.name || 'Break Time'}</div>
                                                    </td>
                                                `;
                                            } 
                                            // Handle practical slots - FIXED
                                            else if (slot.type === 'practical') {
                                                return `
                                                    <td class="timetable-cell practical-cell ${isHighlighted ? 'faculty-highlight' : ''}">
                                                        <div class="font-medium text-sm text-purple-600">${utils.escapeHtml(slot.subject)} (LAB)</div>
                                                        <div class="text-xs text-purple-500">${utils.escapeHtml(slot.faculty)}</div>
                                                        <div class="text-xs text-purple-400">${utils.escapeHtml(slot.room)}</div>
                                                        <div class="text-xs text-purple-300">${slot.duration}min</div>
                                                    </td>
                                                `;
                                            } 
                                            // Regular class slots
                                            else {
                                                return `
                                                    <td class="timetable-cell ${isHighlighted ? 'faculty-highlight' : ''}">
                                                        <div class="font-medium text-sm">${utils.escapeHtml(slot.subject)}</div>
                                                        <div class="text-xs text-slate-600">${utils.escapeHtml(slot.faculty)}</div>
                                                        <div class="text-xs text-slate-500">${utils.escapeHtml(slot.room)}</div>
                                                    </td>
                                                `;
                                            }
                                        } else {
                                            return `<td class="timetable-cell empty">Free</td>`;
                                        }
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            gridContainer.innerHTML = tableHTML;

            // Add metrics display if available
            if (this.availableTimetables.length > 0 && container === 'timetableGrid') {
                const metrics = this.availableTimetables[0].metrics;
                if (metrics) {
                    const metricsHtml = `
                        <div class="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div class="bg-blue-50 p-3 rounded-lg">
                                <div class="text-blue-600 font-medium">Overall Score</div>
                                <div class="text-2xl font-bold text-blue-800">${metrics.score}/100</div>
                            </div>
                            <div class="bg-green-50 p-3 rounded-lg">
                                <div class="text-green-600 font-medium">Utilization</div>
                                <div class="text-2xl font-bold text-green-800">${metrics.utilization_rate}%</div>
                            </div>
                            <div class="bg-purple-50 p-3 rounded-lg">
                                <div class="text-purple-600 font-medium">Balance</div>
                                <div class="text-2xl font-bold text-purple-800">${metrics.workload_balance}%</div>
                            </div>
                            <div class="bg-orange-50 p-3 rounded-lg">
                                <div class="text-orange-600 font-medium">Classes</div>
                                <div class="text-2xl font-bold text-orange-800">${metrics.filled_slots}/${metrics.total_slots}</div>
                            </div>
                        </div>
                    `;
                    gridContainer.innerHTML += metricsHtml;
                }
            }
            
            console.log(`Timetable rendered successfully in container '${container}'`);
        } catch (error) {
            console.error('Error rendering timetable:', error);
            gridContainer.innerHTML = '<div class="text-center py-8 text-red-500">Error rendering timetable. Please try again.</div>';
        }
    }

    updateStatus() {
        const statusElement = document.getElementById('timetableStatus');
        const infoElement = document.getElementById('timetableInfo');
        
        if (statusElement) {
            if (this.settings.published) {
                statusElement.className = 'badge bg-green-100 text-green-800';
                statusElement.textContent = 'Published';
            } else {
                statusElement.className = 'badge bg-gray-100 text-gray-800';
                statusElement.textContent = 'Draft';
            }
        }
        
        if (infoElement) {
            let infoText = '';
            if (this.settings.lastGenerated) {
                infoText += `Last generated: ${utils.formatDateTime(this.settings.lastGenerated)}`;
            }
            if (this.settings.lastPublished) {
                infoText += ` | Last published: ${utils.formatDateTime(this.settings.lastPublished)}`;
            }
            if (this.availableTimetables.length > 0) {
                infoText += ` | AI-Optimized (${this.availableTimetables.length} options)`;
            }
            infoElement.textContent = infoText;
        }

        this.updateFacultyDashboardStatus();
        this.updateStudentDashboardStatus();
    }

    updateFacultyDashboardStatus() {
        const facultyStatusElement = document.getElementById('facultyTimetableStatus');
        const facultyInfoElement = document.getElementById('facultyTimetableInfo');
        
        if (facultyStatusElement) {
            if (this.settings.published) {
                facultyStatusElement.className = 'badge bg-green-100 text-green-800';
                facultyStatusElement.textContent = 'Published';
            } else {
                facultyStatusElement.className = 'badge bg-gray-100 text-gray-800';
                facultyStatusElement.textContent = 'Draft';
            }
        }
        
        if (facultyInfoElement && this.settings.lastPublished) {
            facultyInfoElement.textContent = `Last updated: ${utils.formatDateTime(this.settings.lastPublished)}`;
        }
    }

    updateStudentDashboardStatus() {
        const studentStatusElement = document.getElementById('studentTimetableStatus');
        const studentInfoElement = document.getElementById('studentTimetableInfo');
        
        if (studentStatusElement) {
            if (this.settings.published) {
                studentStatusElement.className = 'badge bg-green-100 text-green-800';
                studentStatusElement.textContent = 'Published';
            } else {
                studentStatusElement.className = 'badge bg-gray-100 text-gray-800';
                studentStatusElement.textContent = 'Draft';
            }
        }
        
        if (studentInfoElement && this.settings.lastPublished) {
            studentInfoElement.textContent = `AI-optimized schedule | Last updated: ${utils.formatDateTime(this.settings.lastPublished)}`;
        }
    }

    getDefaultTimetable() {
        const defaultTimetable = {};
        this.days.forEach(day => {
            defaultTimetable[day] = {};
            this.periods.forEach(period => {
                defaultTimetable[day][period] = null;
            });
        });
        return defaultTimetable;
    }

    // Rest of the methods remain the same...
    getFacultyTimetable(facultyName) {
        const facultyTimetable = {};
        
        this.days.forEach(day => {
            facultyTimetable[day] = {};
            this.periods.forEach(period => {
                const slot = this.timetable[day] && this.timetable[day][period];
                if (slot && slot.faculty === facultyName) {
                    facultyTimetable[day][period] = slot;
                } else {
                    facultyTimetable[day][period] = null;
                }
            });
        });
        
        return facultyTimetable;
    }

    getStatistics() {
        const stats = {
            totalSlots: this.days.length * this.periods.length,
            filledSlots: 0,
            emptySlots: 0,
            breakSlots: 0,
            practicalSlots: 0,
            utilizationRate: 0,
            facultyLoad: {},
            roomUtilization: {},
            subjectDistribution: {},
            aiOptimized: this.availableTimetables.length > 0,
            optimizationScore: 0,
            workloadBalance: 0
        };

        this.days.forEach(day => {
            this.periods.forEach(period => {
                const slot = this.timetable[day] && this.timetable[day][period];
                if (slot) {
                    if (slot.subject === 'BREAK' || slot.type === 'break') {
                        stats.breakSlots++;
                    } else if (slot.type === 'practical') {
                        stats.practicalSlots++;
                        stats.filledSlots++;
                    } else {
                        stats.filledSlots++;
                    }
                    
                    if (slot.faculty && slot.faculty !== 'N/A') {
                        if (stats.facultyLoad[slot.faculty]) {
                            stats.facultyLoad[slot.faculty]++;
                        } else {
                            stats.facultyLoad[slot.faculty] = 1;
                        }
                    }
                    
                    if (slot.room && slot.room !== 'N/A') {
                        if (stats.roomUtilization[slot.room]) {
                            stats.roomUtilization[slot.room]++;
                        } else {
                            stats.roomUtilization[slot.room] = 1;
                        }
                    }
                    
                    if (slot.subject && slot.subject !== 'BREAK') {
                        if (stats.subjectDistribution[slot.subject]) {
                            stats.subjectDistribution[slot.subject]++;
                        } else {
                            stats.subjectDistribution[slot.subject] = 1;
                        }
                    }
                } else {
                    stats.emptySlots++;
                }
            });
        });

        // Calculate utilization excluding break slots
        const availableSlots = stats.totalSlots - stats.breakSlots;
        stats.utilizationRate = availableSlots > 0 ? Math.round((stats.filledSlots / availableSlots) * 100) : 0;

        // Add AI optimization metrics if available
        if (this.availableTimetables.length > 0) {
            const metrics = this.availableTimetables[0].metrics;
            stats.optimizationScore = metrics.score;
            stats.workloadBalance = metrics.workload_balance;
            stats.aiMetrics = metrics;
        }

        return stats;
    }

    exportTimetable(format = 'json') {
        const data = {
            timetable: this.timetable,
            settings: this.settings,
            statistics: this.getStatistics(),
            aiOptimization: {
                available: this.availableTimetables.length > 0,
                options: this.availableTimetables.length,
                bestScore: this.availableTimetables.length > 0 ? this.availableTimetables[0].score : null
            },
            exportDate: new Date().toISOString()
        };

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai_optimized_timetable_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'csv') {
            this.exportToCSV();
        }

        toastManager.show('AI-optimized timetable exported successfully!', 'success');
    }

    exportToCSV() {
        let csv = 'Day,Period,Subject,Faculty,Room,Type\n';
        
        this.days.forEach(day => {
            this.periods.forEach(period => {
                const slot = this.timetable[day] && this.timetable[day][period];
                if (slot) {
                    const type = slot.type || 'regular';
                    csv += `${day},${period},${slot.subject},${slot.faculty},${slot.room},${type}\n`;
                } else {
                    csv += `${day},${period},,,free,\n`;
                }
            });
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai_optimized_timetable_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importTimetable(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.timetable) {
                this.timetable = data.timetable;
                
                if (data.settings) {
                    this.settings = { ...this.settings, ...data.settings };
                }
                
                if (data.aiOptimization && data.aiOptimization.available) {
                    toastManager.show('Timetable imported. Note: AI optimization data not restored.', 'warning');
                }
                
                this.updateStatus();
                this.renderTimetableGrid();
                
                toastManager.show('Timetable imported successfully!', 'success');
                return true;
            } else {
                throw new Error('Invalid timetable data format');
            }
        } catch (error) {
            toastManager.show('Error importing timetable: ' + error.message, 'error');
            return false;
        }
    }

    getTimetable() {
        return this.timetable;
    }

    getSettings() {
        return this.settings;
    }

    isPublished() {
        return this.settings.published;
    }

    getAvailableOptions() {
        return this.availableTimetables;
    }

    selectTimetableOption(index) {
        if (index >= 0 && index < this.availableTimetables.length) {
            this.timetable = this.availableTimetables[index].timetable;
            this.renderTimetableGrid();
            
            toastManager.show(
                `Switched to timetable option ${index + 1} (Score: ${this.availableTimetables[index].score}/100)`, 
                'info'
            );
        }
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Initialize timetable manager
const timetableManager = new TimetableManager();

// Export for use in other files
window.timetableManager = timetableManager;