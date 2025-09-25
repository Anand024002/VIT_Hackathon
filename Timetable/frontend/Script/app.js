// Main Application Controller

class App {
    constructor() {
        this.isInitialized = false;
        this.managers = {};
        this.init();
    }

    init() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeApp());
            } else {
                this.initializeApp();
            }
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showErrorMessage('Failed to initialize application');
        }
    }

    initializeApp() {
        try {
            // Initialize Lucide icons
            if (window.lucide) {
                lucide.createIcons();
            }

            // Initialize managers
            this.initializeManagers();

            // Initialize authentication
            this.initializeAuth();

            // Set up global event listeners
            this.setupGlobalEventListeners();

            // Mark as initialized
            this.isInitialized = true;

            console.log('Smart Classroom Timetable App initialized successfully');
        } catch (error) {
            console.error('Error during app initialization:', error);
            this.showErrorMessage('Failed to initialize application components');
        }
    }

    initializeManagers() {
        // Store manager references
        this.managers = {
            storage: window.storage,
            auth: window.authManager,
            faculty: window.facultyManager,
            rooms: window.roomsManager,
            subjects: window.subjectsManager,
            practicals: window.practicalsManager,
            breaks: window.breaksManager,
            leave: window.leaveManager,
            timetable: window.timetableManager,
            admin: window.adminManager,
            facultyDashboard: window.facultyDashboardManager,
            student: window.studentManager,
            utils: window.utils,
            toast: window.toastManager
        };

        // Validate all managers are initialized
        const missingManagers = Object.entries(this.managers)
            .filter(([name, manager]) => !manager)
            .map(([name]) => name);

        if (missingManagers.length > 0) {
            console.warn('Missing managers:', missingManagers);
        }
    }

    initializeAuth() {
        if (this.managers.auth) {
            this.managers.auth.init();
        }
    }

    setupGlobalEventListeners() {
        // Handle app-wide keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));

        // Handle window resize
        window.addEventListener('resize', () => this.handleWindowResize());

        // Handle visibility change (tab focus/blur)
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());

        // Handle beforeunload (page refresh/close)
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));

        // Handle uncaught errors
        window.addEventListener('error', (e) => this.handleGlobalError(e));
        window.addEventListener('unhandledrejection', (e) => this.handleUnhandledRejection(e));
    }

    handleGlobalKeydown(e) {
        // Ctrl/Cmd + R: Refresh current view
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            this.refreshCurrentView();
        }

        // Ctrl/Cmd + L: Logout
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            if (this.managers.auth && this.managers.auth.isUserAuthenticated()) {
                this.managers.auth.logout();
            }
        }

        // Escape: Close modals/cancel operations
        if (e.key === 'Escape') {
            this.handleEscapeKey();
        }
    }

    handleWindowResize() {
        // Handle responsive layout changes
        this.updateLayout();
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Tab hidden - pause non-essential operations
            this.pauseOperations();
        } else {
            // Tab visible - resume operations and refresh data
            this.resumeOperations();
            this.refreshCurrentView();
        }
    }

    handleBeforeUnload(e) {
        // Check for unsaved changes
        if (this.hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    }

    handleGlobalError(e) {
        console.error('Global error:', e.error);
        this.managers.toast?.show('An unexpected error occurred', 'error');
    }

    handleUnhandledRejection(e) {
        console.error('Unhandled promise rejection:', e.reason);
        this.managers.toast?.show('An unexpected error occurred', 'error');
    }

    refreshCurrentView() {
        try {
            const user = this.managers.auth?.getCurrentUser();
            if (!user) return;

            switch (user.role) {
                case 'admin':
                    if (this.managers.admin) {
                        const activeSection = this.managers.admin.getActiveSection();
                        this.managers.admin.initializeSection(activeSection);
                    }
                    break;
                case 'faculty':
                    if (this.managers.facultyDashboard) {
                        this.managers.facultyDashboard.refreshDashboard();
                    }
                    break;
                case 'student':
                    if (this.managers.student) {
                        this.managers.student.refreshDashboard();
                    }
                    break;
            }

            this.managers.toast?.show('View refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing view:', error);
            this.managers.toast?.show('Error refreshing view', 'error');
        }
    }

    handleEscapeKey() {
        // Close any open modals or cancel operations
        // This would be expanded based on specific modal implementations
    }

    updateLayout() {
        // Handle responsive layout updates
        // Re-initialize Lucide icons after layout changes
        setTimeout(() => {
            if (window.lucide) {
                lucide.createIcons();
            }
        }, 100);
    }

    pauseOperations() {
        // Pause any polling or real-time updates
        console.log('App paused');
    }

    resumeOperations() {
        // Resume polling or real-time updates
        console.log('App resumed');
    }

    hasUnsavedChanges() {
        // Check if there are any unsaved changes
        // This would be implemented based on specific form states
        return false;
    }

    showErrorMessage(message) {
        if (this.managers.toast) {
            this.managers.toast.show(message, 'error');
        } else {
            alert(message);
        }
    }

    // Public API methods

    // Get current user
    getCurrentUser() {
        return this.managers.auth?.getCurrentUser();
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.managers.auth?.isUserAuthenticated() || false;
    }

    // Get current role
    getCurrentRole() {
        const user = this.getCurrentUser();
        return user?.role || null;
    }

    // Export application data
    exportData(type = 'all') {
        try {
            switch (type) {
                case 'all':
                    if (this.managers.admin) {
                        this.managers.admin.exportAllData();
                    }
                    break;
                case 'faculty':
                    if (this.managers.faculty) {
                        this.managers.faculty.exportFaculty();
                    }
                    break;
                case 'rooms':
                    if (this.managers.rooms) {
                        this.managers.rooms.exportRooms();
                    }
                    break;
                case 'subjects':
                    if (this.managers.subjects) {
                        this.managers.subjects.exportSubjects();
                    }
                    break;
                case 'timetable':
                    if (this.managers.timetable) {
                        this.managers.timetable.exportTimetable();
                    }
                    break;
                case 'leave':
                    if (this.managers.leave) {
                        this.managers.leave.exportLeaveData();
                    }
                    break;
                default:
                    throw new Error('Invalid export type');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.managers.toast?.show('Export failed: ' + error.message, 'error');
        }
    }

    // Import application data
    importData(jsonData, type = 'all') {
        try {
            switch (type) {
                case 'all':
                    if (this.managers.admin) {
                        return this.managers.admin.importAllData(jsonData);
                    }
                    break;
                case 'faculty':
                    if (this.managers.faculty) {
                        return this.managers.faculty.importFaculty(jsonData);
                    }
                    break;
                case 'rooms':
                    if (this.managers.rooms) {
                        return this.managers.rooms.importRooms(jsonData);
                    }
                    break;
                case 'subjects':
                    if (this.managers.subjects) {
                        return this.managers.subjects.importSubjects(jsonData);
                    }
                    break;
                case 'timetable':
                    if (this.managers.timetable) {
                        return this.managers.timetable.importTimetable(jsonData);
                    }
                    break;
                case 'leave':
                    if (this.managers.leave) {
                        return this.managers.leave.importLeaveData(jsonData);
                    }
                    break;
                default:
                    throw new Error('Invalid import type');
            }
        } catch (error) {
            console.error('Import error:', error);
            this.managers.toast?.show('Import failed: ' + error.message, 'error');
            return false;
        }
    }

    // Get application statistics
    getStatistics() {
        try {
            const stats = {
                system: {
                    version: '1.0.0',
                    initialized: this.isInitialized,
                    currentUser: this.getCurrentUser()?.name || 'Not logged in',
                    currentRole: this.getCurrentRole() || 'None'
                }
            };

            if (this.managers.admin) {
                stats.dashboard = this.managers.admin.getDashboardStats();
            }

            if (this.managers.faculty) {
                stats.faculty = this.managers.faculty.getStatistics();
            }

            if (this.managers.rooms) {
                stats.rooms = this.managers.rooms.getStatistics();
            }

            if (this.managers.subjects) {
                stats.subjects = this.managers.subjects.getStatistics();
            }

            if (this.managers.timetable) {
                stats.timetable = this.managers.timetable.getStatistics();
            }

            if (this.managers.leave) {
                stats.leave = this.managers.leave.getStatistics();
            }

            return stats;
        } catch (error) {
            console.error('Error getting statistics:', error);
            return { error: error.message };
        }
    }

    // Reset application
    reset() {
        if (confirm('Are you sure you want to reset the entire application? This will clear all data and log you out.')) {
            try {
                // Clear all data
                this.managers.storage?.clearAll();
                
                // Logout
                this.managers.auth?.logout();
                
                // Reload page
                window.location.reload();
            } catch (error) {
                console.error('Reset error:', error);
                this.managers.toast?.show('Reset failed: ' + error.message, 'error');
            }
        }
    }

    // Get manager by name
    getManager(name) {
        return this.managers[name] || null;
    }

    // Check if app is ready
    isReady() {
        return this.isInitialized;
    }
}

// Initialize the application
const app = new App();

// Export app instance for global access
window.app = app;

// Development helper functions (can be removed in production)
if (typeof window !== 'undefined') {
    window.appDebug = {
        getApp: () => app,
        getManagers: () => app.managers,
        getStats: () => app.getStatistics(),
        exportData: (type) => app.exportData(type),
        importData: (data, type) => app.importData(data, type),
        reset: () => app.reset(),
        refresh: () => app.refreshCurrentView()
    };
}

console.log('Smart Classroom Timetable Scheduler - Version 1.0.0');
console.log('Use window.appDebug for development utilities');

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}