// auth.js - Authentication Manager with API Integration
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.initialized = false;
    }

    async init() {
        // Check if user is already logged in from localStorage
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.isAuthenticated = true;
        }
        
        this.setupEventListeners();
        this.initialized = true;
        
        // Show appropriate dashboard
        if (this.isAuthenticated) {
            this.showDashboard();
        } else {
            this.showLogin();
        }
    }

    async login(username, password, role) {
        try {
            // Try API first
            if (window.apiClient && window.apiClient.initialized) {
                const response = await window.apiClient.login(username, password, role);
                this.currentUser = response;
            } else {
                // Fallback to localStorage authentication
                const users = this.getDefaultUsers();
                const user = users.find(u => 
                    u.username === username && 
                    u.password === password && 
                    u.role === role
                );
                
                if (!user) {
                    throw new Error('Invalid credentials');
                }
                
                this.currentUser = {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    name: user.name,
                    email: user.email
                };
            }
            
            this.currentUser.loginTime = new Date().toISOString();
            this.isAuthenticated = true;
            
            // Save to localStorage
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            return this.currentUser;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('currentUser');
        this.showLogin();
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    showDashboard() {
        if (!this.isAuthenticated || !this.currentUser) {
            this.showLogin();
            return;
        }

        // Hide all views
        this.hideAllViews();

        // Show appropriate dashboard
        switch (this.currentUser.role) {
            case 'admin':
                window.utils.show('adminDashboard');
                break;
            case 'faculty':
                window.utils.show('facultyDashboard');
                break;
            case 'student':
                window.utils.show('studentDashboard');
                break;
            default:
                this.showLogin();
        }
    }

    showLogin() {
        this.hideAllViews();
        window.utils.show('loginPage');
        window.utils.clearForm('loginForm');
    }

    hideAllViews() {
        const views = ['loginPage', 'adminDashboard', 'facultyDashboard', 'studentDashboard'];
        views.forEach(view => window.utils.hide(view));
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');
        
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        // Setup logout buttons
        const logoutButtons = document.querySelectorAll('[id$="Logout"]');
        logoutButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.logout();
                window.toastManager?.show('Logged out successfully', 'success');
            });
        });
    }

    async handleLogin() {
        const username = document.getElementById('username')?.value.trim();
        const password = document.getElementById('password')?.value.trim();
        const role = document.getElementById('role')?.value;
        const loginBtn = document.getElementById('loginBtn');

        if (!username || !password || !role) {
            window.toastManager?.show('Please fill in all fields', 'error');
            return;
        }

        try {
            window.utils.setLoading(loginBtn, true);
            
            await this.login(username, password, role);
            
            window.toastManager?.show(`Welcome, ${this.currentUser.name}!`, 'success');
            
            // Small delay before showing dashboard to ensure all components are ready
            setTimeout(() => {
                this.showDashboard();
                
                // Trigger a refresh of the timetable for the new user
                if (window.timetableManager) {
                    window.timetableManager.loadTimetable().catch(error => {
                        console.error('Error loading timetable after login:', error);
                    });
                }
            }, 500);
            
        } catch (error) {
            window.toastManager?.show(error.message || 'Login failed', 'error');
        } finally {
            window.utils.setLoading(loginBtn, false);
        }
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
                email: 'shinde@avcoe.edu'
            },
            {
                id: 3,
                username: 'student1',
                password: 'student123',
                role: 'student',
                name: 'Sujay',
                email: 'sujay@college.edu'
            }
        ];
    }

    // Compatibility methods for existing code
    addFacultyUser(facultyData) {
        // This is handled by the database now
        console.log('Faculty user available for login after database addition');
    }

    removeFacultyUser(facultyName) {
        // If current user is being removed, logout
        if (this.currentUser && this.currentUser.name === facultyName) {
            this.logout();
        }
    }

    updateFacultyUserData(facultyName, updates) {
        if (this.currentUser && this.currentUser.role === 'faculty' && this.currentUser.name === facultyName) {
            this.currentUser = { ...this.currentUser, ...updates };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
    }
}

// Initialize and export
const authManager = new AuthManager();
window.authManager = authManager;