// faculty.js - Fixed Faculty Manager with proper API integration

class FacultyManager {
    constructor() {
        this.faculty = [];
        this.initialized = false;
    }

    async init() {
        try {
            await this.loadFaculty();
            this.setupEventListeners();
            this.initialized = true;
        } catch (error) {
            console.error('Faculty manager initialization error:', error);
            // Fallback to empty faculty list
            this.faculty = [];
            this.renderFacultyList();
            this.setupEventListeners();
            this.initialized = true;
        }
    }

    async loadFaculty() {
        try {
            // Wait for storage to be initialized
            if (!window.storage.initialized) {
                await window.storage.init();
            }
            
            this.faculty = await window.storage.getFaculty();
            console.log('Faculty loaded:', this.faculty.length);
            
            this.renderFacultyList();
            this.updateDropdowns();
        } catch (error) {
            console.error('Error loading faculty:', error);
            // Fallback to empty array
            this.faculty = [];
            this.renderFacultyList();
            throw error;
        }
    }

    setupEventListeners() {
        const addFacultyBtn = document.getElementById('addFacultyBtn');
        if (addFacultyBtn) {
            addFacultyBtn.addEventListener('click', () => this.addFaculty());
        }

        const facultyInputs = ['facultyName', 'facultySubject', 'facultyEmail'];
        facultyInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.addFaculty();
                    }
                });
            }
        });
    }

    async addFaculty() {
        const nameInput = document.getElementById('facultyName');
        const subjectInput = document.getElementById('facultySubject');
        const emailInput = document.getElementById('facultyEmail');

        if (!nameInput || !subjectInput || !emailInput) {
            console.error('Faculty form inputs not found');
            window.toastManager?.show('Form inputs not found', 'error');
            return;
        }

        const name = nameInput.value.trim();
        const subject = subjectInput.value.trim();
        const email = emailInput.value.trim();

        // Validation
        if (!name || !subject || !email) {
            window.toastManager?.show('All fields are required', 'error');
            return;
        }

        if (!this.validateEmail(email)) {
            window.toastManager?.show('Please enter a valid email address', 'error');
            return;
        }

        if (this.faculty.some(f => f.name === name || f.email === email)) {
            window.toastManager?.show('Faculty with this name or email already exists', 'error');
            return;
        }

        try {
            const facultyData = { name, subject, email };
            let newFaculty;
            
            if (window.storage.useLocalStorage) {
                newFaculty = window.storage.addFaculty(facultyData);
            } else {
                newFaculty = await window.storage.addFaculty(facultyData);
            }

            this.faculty.push(newFaculty);

            // Add faculty user for authentication if authManager exists
            if (window.authManager) {
                window.authManager.addFacultyUser(newFaculty);
            }

            this.renderFacultyList();
            this.updateDropdowns();
            this.clearForm();

            window.toastManager?.show('Faculty added successfully!', 'success');
        } catch (error) {
            console.error('Error adding faculty:', error);
            window.toastManager?.show('Error adding faculty: ' + error.message, 'error');
        }
    }

    async removeFaculty(id) {
        try {
            const facultyMember = this.faculty.find(f => f.id === id);
            if (!facultyMember) {
                window.toastManager?.show('Faculty member not found', 'error');
                return;
            }

            if (window.storage.useLocalStorage) {
                window.storage.removeFaculty(id);
            } else {
                await window.storage.removeFaculty(id);
            }

            this.faculty = this.faculty.filter(f => f.id !== id);

            // Remove from authentication if authManager exists
            if (window.authManager) {
                window.authManager.removeFacultyUser(facultyMember.name);
            }

            this.renderFacultyList();
            this.updateDropdowns();

            window.toastManager?.show('Faculty removed successfully!', 'success');
        } catch (error) {
            console.error('Error removing faculty:', error);
            window.toastManager?.show('Error removing faculty: ' + error.message, 'error');
        }
    }

    renderFacultyList() {
        const facultyList = document.getElementById('facultyList');
        if (!facultyList) {
            console.log('Faculty list element not found');
            return;
        }

        if (this.faculty.length === 0) {
            facultyList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="users"></i>
                    <p>No faculty members found</p>
                    <small>Add faculty members to get started</small>
                </div>
            `;
        } else {
            facultyList.innerHTML = this.faculty.map(faculty => `
                <div class="item-card">
                    <div class="item-info">
                        <div class="item-title">${this.escapeHtml(faculty.name)}</div>
                        <div class="item-subtitle">${this.escapeHtml(faculty.subject)} • ${this.escapeHtml(faculty.email)}</div>
                    </div>
                    <button class="btn btn-outline btn-delete" onclick="facultyManager.removeFaculty(${faculty.id})" title="Remove Faculty">
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

    updateDropdowns() {
        // Update practical faculty dropdown
        const practicalFacultySelect = document.getElementById('practicalFaculty');
        if (practicalFacultySelect) {
            const currentValue = practicalFacultySelect.value;
            practicalFacultySelect.innerHTML = '<option value="">Select faculty</option>' +
                this.faculty.map(faculty =>
                    `<option value="${this.escapeHtml(faculty.name)}" ${currentValue === faculty.name ? 'selected' : ''}>${this.escapeHtml(faculty.name)}</option>`
                ).join('');
        }

        // Update other dropdowns that might use faculty data
        if (window.practicalsManager && window.practicalsManager.updateFacultyDropdown) {
            window.practicalsManager.updateFacultyDropdown();
        }

        // Update faculty dashboard if logged in as faculty
        if (window.authManager?.isAuthenticated && window.authManager.currentUser.role === 'faculty') {
            const currentFacultyData = this.faculty.find(f => f.name === window.authManager.currentUser.name);
            if (currentFacultyData && window.authManager.updateFacultyUserData) {
                window.authManager.updateFacultyUserData(currentFacultyData.name, {
                    subject: currentFacultyData.subject,
                    email: currentFacultyData.email
                });
            }
            
            if (window.facultyDashboardManager?.updateFacultyInfo) {
                window.facultyDashboardManager.updateFacultyInfo();
            }
        }
    }

    clearForm() {
        const inputs = ['facultyName', 'facultySubject', 'facultyEmail'];
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) input.value = '';
        });
    }

    // Utility methods
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Getter methods
    getFaculty() {
        return this.faculty;
    }

    getFacultyById(id) {
        return this.faculty.find(f => f.id === id);
    }

    getFacultyByName(name) {
        return this.faculty.find(f => f.name === name);
    }

    // Search and filter methods
    searchFaculty(query) {
        if (!query) return this.faculty;
        const searchTerm = query.toLowerCase();
        return this.faculty.filter(f =>
            f.name.toLowerCase().includes(searchTerm) ||
            f.subject.toLowerCase().includes(searchTerm) ||
            f.email.toLowerCase().includes(searchTerm)
        );
    }

    getFacultyBySubject(subject) {
        return this.faculty.filter(f => f.subject === subject);
    }

    // Statistics
    getStatistics() {
        const stats = {
            total: this.faculty.length,
            subjects: {},
            subjectCount: 0
        };
        
        this.faculty.forEach(faculty => {
            if (stats.subjects[faculty.subject]) {
                stats.subjects[faculty.subject]++;
            } else {
                stats.subjects[faculty.subject] = 1;
                stats.subjectCount++;
            }
        });
        
        return stats;
    }

    // Export/Import methods
    exportFaculty() {
        const data = {
            faculty: this.faculty,
            statistics: this.getStatistics(),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `faculty_data_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        window.toastManager?.show('Faculty data exported successfully!', 'success');
    }

    async importFaculty(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.faculty && Array.isArray(data.faculty)) {
                let importedCount = 0;
                let errorCount = 0;
                
                for (const facultyData of data.faculty) {
                    try {
                        // Check for duplicates
                        if (!this.faculty.some(f => f.name === facultyData.name || f.email === facultyData.email)) {
                            if (window.storage.useLocalStorage) {
                                const newFaculty = window.storage.addFaculty(facultyData);
                                this.faculty.push(newFaculty);
                            } else {
                                const newFaculty = await window.storage.addFaculty(facultyData);
                                this.faculty.push(newFaculty);
                            }
                            
                            if (window.authManager) {
                                window.authManager.addFacultyUser(facultyData);
                            }
                            
                            importedCount++;
                        }
                    } catch (error) {
                        console.error('Error importing faculty member:', facultyData.name, error);
                        errorCount++;
                    }
                }

                this.renderFacultyList();
                this.updateDropdowns();
                
                let message = `Imported ${importedCount} faculty members successfully!`;
                if (errorCount > 0) {
                    message += ` (${errorCount} failed)`;
                }
                
                window.toastManager?.show(message, 'success');
                return true;
            } else {
                throw new Error('Invalid faculty data format');
            }
        } catch (error) {
            console.error('Import error:', error);
            window.toastManager?.show('Error importing faculty data: ' + error.message, 'error');
            return false;
        }
    }

    // Update faculty member
    async updateFaculty(id, updates) {
        try {
            let updatedFaculty;
            
            if (window.storage.useLocalStorage) {
                const index = this.faculty.findIndex(f => f.id === id);
                if (index !== -1) {
                    this.faculty[index] = { ...this.faculty[index], ...updates };
                    window.storage.setFaculty(this.faculty);
                    updatedFaculty = this.faculty[index];
                }
            } else {
                updatedFaculty = await window.storage.updateFaculty(id, updates);
                if (updatedFaculty) {
                    const index = this.faculty.findIndex(f => f.id === id);
                    if (index !== -1) {
                        this.faculty[index] = updatedFaculty;
                    }
                }
            }

            if (updatedFaculty) {
                this.renderFacultyList();
                this.updateDropdowns();
                
                if (window.authManager) {
                    window.authManager.updateFacultyUserData(updatedFaculty.name, updates);
                }
                
                window.toastManager?.show('Faculty updated successfully!', 'success');
                return updatedFaculty;
            }
            return null;
        } catch (error) {
            console.error('Error updating faculty:', error);
            window.toastManager?.show('Error updating faculty: ' + error.message, 'error');
            return null;
        }
    }

    // Validation
    validateFaculty(facultyData) {
        const errors = [];
        
        if (!facultyData.name || facultyData.name.trim() === '') {
            errors.push('Name is required');
        }
        
        if (!facultyData.subject || facultyData.subject.trim() === '') {
            errors.push('Subject is required');
        }
        
        if (!facultyData.email || facultyData.email.trim() === '') {
            errors.push('Email is required');
        } else if (!this.validateEmail(facultyData.email)) {
            errors.push('Valid email is required');
        }
        
        // Check for duplicates
        if (this.faculty.some(f => f.name === facultyData.name)) {
            errors.push('Faculty with this name already exists');
        }
        
        if (this.faculty.some(f => f.email === facultyData.email)) {
            errors.push('Faculty with this email already exists');
        }
        
        return errors;
    }
}

// Initialize faculty manager when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.facultyManager = new FacultyManager();
        await window.facultyManager.init();
        console.log('Faculty manager initialized successfully');
    } catch (error) {
        console.error('Failed to initialize faculty manager:', error);
        // Create a basic instance even if initialization fails
        window.facultyManager = new FacultyManager();
        window.facultyManager.initialized = true;
    }
});

// Also create it immediately for cases where DOMContentLoaded has already fired
if (!window.facultyManager) {
    window.facultyManager = new FacultyManager();
}