// subjects.js (apiClient Integrated)

class SubjectsManager {
    constructor() {
        this.subjects = [];
        this.init();
    }

    async init() {
        await this.loadSubjects();
        this.setupEventListeners();
    }

    async loadSubjects() {
        try {
            this.subjects = await apiClient.getSubjects();
            this.renderSubjectsList();
            this.updateDropdowns();
        } catch (error) {
            console.error('Error loading subjects:', error);
            toastManager.show('Failed to load subject data', 'error');
        }
    }

    setupEventListeners() {
        const addSubjectBtn = document.getElementById('addSubjectBtn');
        if (addSubjectBtn) {
            addSubjectBtn.addEventListener('click', () => this.addSubject());
        }
        const subjectInputs = ['subjectName', 'subjectCode', 'subjectCredits'];
        subjectInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.addSubject();
                    }
                });
            }
        });
    }

    async addSubject() {
        const name = document.getElementById('subjectName').value.trim();
        const code = document.getElementById('subjectCode').value.trim();
        const credits = document.getElementById('subjectCredits').value.trim();

        const errors = utils.validateRequired({ name, code, credits });
        if (errors.length > 0) {
            toastManager.show(errors[0], 'error');
            return;
        }
        const creditsNum = parseInt(credits);
        if (isNaN(creditsNum) || creditsNum <= 0) {
            toastManager.show('Credits must be a positive number', 'error');
            return;
        }
        if (this.subjects.some(s => s.name === name || s.code === code)) {
            toastManager.show('Subject with this name or code already exists', 'error');
            return;
        }

        try {
            const newSubject = await apiClient.addSubject({ name, code, credits: creditsNum });
            this.subjects.push(newSubject);

            this.renderSubjectsList();
            this.updateDropdowns();
            this.clearForm();

            toastManager.show('Subject added successfully!', 'success');
        } catch (error) {
            toastManager.show('Error adding subject', 'error');
        }
    }

    async removeSubject(id) {
        try {
            await window.apiClient.removeSubject(id);
            this.subjects = this.subjects.filter(s => s.id !== id);

            this.renderSubjectsList();
            this.updateDropdowns();

            toastManager.show('Subject removed successfully!', 'success');
        } catch (error) {
            toastManager.show('Error removing subject', 'error');
        }
    }

    renderSubjectsList() {
        const subjectList = document.getElementById('subjectList');
        if (!subjectList) return;

        if (this.subjects.length === 0) {
            subjectList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="book"></i>
                    <p>No subjects found</p>
                </div>
            `;
        } else {
            subjectList.innerHTML = this.subjects.map(subject => `
                <div class="item-card">
                    <div class="item-info">
                        <div class="item-title">${utils.escapeHtml(subject.name)}</div>
                        <div class="item-subtitle">
                            <span class="subject-code">${utils.escapeHtml(subject.code)}</span>
                            <span>${subject.credits} Credits</span>
                        </div>
                    </div>
                    <button class="btn btn-outline btn-delete" onclick="subjectsManager.removeSubject(${subject.id})">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `).join('');
        }

        setTimeout(() => {
            if (window.lucide) {
                lucide.createIcons();
            }
        }, 0);
    }

    updateDropdowns() {
        const practicalSubjectSelect = document.getElementById('practicalSubject');
        if (practicalSubjectSelect) {
            const currentValue = practicalSubjectSelect.value;
            practicalSubjectSelect.innerHTML = '<option value="">Select subject</option>' +
                this.subjects.map(subject =>
                    `<option value="${utils.escapeHtml(subject.name)}" ${currentValue === subject.name ? 'selected' : ''}>${utils.escapeHtml(subject.name)}</option>`
                ).join('');
        }
        if (window.practicalsManager) {
            practicalsManager.updateSubjectDropdown();
        }
    }

    clearForm() {
        document.getElementById('subjectName').value = '';
        document.getElementById('subjectCode').value = '';
        document.getElementById('subjectCredits').value = '';
    }

    getSubjects() {
        return this.subjects;
    }
    
    async updateSubject(id, updates) {
        try {
            const updatedSubject = await apiClient.updateSubject(id, updates);
            if (updatedSubject) {
                const index = this.subjects.findIndex(s => s.id === id);
                if (index !== -1) {
                    this.subjects[index] = updatedSubject;
                }
                this.renderSubjectsList();
                this.updateDropdowns();
                toastManager.show('Subject updated successfully!', 'success');
                return updatedSubject;
            }
            return null;
        } catch (error) {
            toastManager.show('Error updating subject', 'error');
            return null;
        }
    }

    async importSubjects(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.subjects && Array.isArray(data.subjects)) {
                await apiClient.importSubjects(data.subjects); // Assumes bulk import endpoint
                await this.loadSubjects();
                toastManager.show('Subjects data imported successfully!', 'success');
                return true;
            } else {
                throw new Error('Invalid subjects data format');
            }
        } catch (error) {
            toastManager.show('Error importing subjects data: ' + error.message, 'error');
            return false;
        }
    }

    async importFromCSV(csvData) {
        try {
            const lines = csvData.split('\n').slice(1); // Skip header
            const newSubjects = [];
            
            for (const line of lines) {
                const [name, code, credits] = line.split(',').map(v => v.trim());
                if (name && code && credits) {
                    newSubjects.push({ name, code, credits: parseInt(credits) });
                }
            }

            // A real implementation should use a bulk endpoint.
            // Here we add them one by one for simplicity.
            let importedCount = 0;
            for (const subject of newSubjects) {
                // Basic validation before sending to apiClient
                const errors = this.validateSubject(subject);
                if (errors.length === 0) {
                   await apiClient.addSubject(subject);
                   importedCount++;
                }
            }
            
            await this.loadSubjects();
            toastManager.show(`Imported ${importedCount} subjects successfully!`, 'success');
            return true;
        } catch (error) {
            toastManager.show('Error importing CSV: ' + error.message, 'error');
            return false;
        }
    }
    
    // Other methods (getSubjectById, searchSubjects, etc.) remain largely the same.
    validateSubject(subjectData) {
        const errors = [];
        if (!subjectData.name || subjectData.name.trim() === '') errors.push('Name is required');
        if (!subjectData.code || subjectData.code.trim() === '') errors.push('Code is required');
        if (!subjectData.credits || isNaN(parseInt(subjectData.credits))) errors.push('Valid credits are required');
        if (this.subjects.some(s => s.name === subjectData.name || s.code === subjectData.code)) errors.push('Duplicate subject');
        return errors;
    }
}

const subjectsManager = new SubjectsManager();
window.subjectsManager = subjectsManager;