// leave.js (apiClient Integrated)

class LeaveManager {
    constructor() {
        this.leaveRequests = [];
        this.init();
    }

    // Add this method to your LeaveManager class in leave.js
    getPendingLeaveRequests() {
        return this.leaveRequests.filter(r => r.status === 'pending');
    }

    async init() {
        await this.loadLeaveRequests();
    }

    async loadLeaveRequests() {
        try {
            this.leaveRequests = await apiClient.getLeaveRequests();
            // Assuming render methods are on pages where the elements exist
            if (document.getElementById('leaveRequestsList')) {
                this.renderLeaveRequestsList();
            }
        } catch (error) {
            console.error('Error loading leave requests:', error);
            toastManager.show('Failed to load leave requests', 'error');
        }
    }

    async addLeaveRequest(requestData) {
        try {
            // ✅ Transform requestData to match backend field expectations
            const leaveData = {
                faculty_name: requestData.faculty, // Backend expects 'faculty_name'
                date: requestData.date,
                period: requestData.period,
                reason: requestData.reason
            };

            const newRequest = await apiClient.addLeaveRequest(leaveData);
            this.leaveRequests.push(newRequest);
            return newRequest;
        } catch (error) {
            console.error('Error adding leave request:', error);
            throw new Error('Error adding leave request');
        }
    }

    async updateLeaveRequest(id, updates) {
        try {
            const updatedRequest = await apiClient.updateLeaveRequest(id, updates);
            if (updatedRequest) {
                const index = this.leaveRequests.findIndex(r => r.id === id);
                if (index !== -1) {
                    this.leaveRequests[index] = { ...this.leaveRequests[index], ...updatedRequest };
                }
                return updatedRequest;
            }
            return null;
        } catch (error) {
            console.error('Error updating leave request:', error);
            throw new Error('Error updating leave request');
        }
    }

    async approveLeaveRequest(id) {
        return this.updateLeaveRequest(id, {
            status: 'approved',
            approvedAt: new Date().toISOString()
        });
    }

    async rejectLeaveRequest(id) {
        return this.updateLeaveRequest(id, {
            status: 'rejected',
            rejectedAt: new Date().toISOString()
        });
    }
    
    async handleApprove(id) {
        try {
            const request = await this.approveLeaveRequest(id);
            if (request) {
                this.renderLeaveRequestsList();
                toastManager.show(`Leave request approved for ${request.faculty}`, 'success');

                if (window.timetableManager) {
                    // This method must also handle async logic now
                    await timetableManager.handleLeaveApproval(request);
                }
            }
        } catch (error) {
            toastManager.show('Error approving leave request', 'error');
            // Optionally, revert UI changes here
        }
    }

    async handleReject(id) {
        try {
            const request = await this.rejectLeaveRequest(id);
            if (request) {
                this.renderLeaveRequestsList();
                toastManager.show(`Leave request rejected for ${request.faculty}`, 'warning');
            }
        } catch (error) {
            toastManager.show('Error rejecting leave request', 'error');
        }
    }

    async importLeaveData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.leaveRequests && Array.isArray(data.leaveRequests)) {
                await apiClient.importLeaveRequests(data.leaveRequests); // Assumes bulk import endpoint
                await this.loadLeaveRequests();
                toastManager.show('Leave data imported successfully!', 'success');
                return true;
            } else {
                throw new Error('Invalid leave data format');
            }
        } catch (error) {
            toastManager.show('Error importing leave data: ' + error.message, 'error');
            return false;
        }
    }

    renderLeaveRequestsList() {
        const leaveRequestsList = document.getElementById('leaveRequestsList');
        if (!leaveRequestsList) return;

        const pendingRequests = this.getPendingLeaveRequests();

        if (pendingRequests.length === 0) {
            leaveRequestsList.innerHTML = `...`; // empty state HTML
        } else {
            leaveRequestsList.innerHTML = pendingRequests.map(request => `
                <div class="leave-card pending">
                    ...
                    <div class="leave-actions">
                        <button class="btn btn-approve" onclick="leaveManager.handleApprove(${request.id})">
                            Approve
                        </button>
                        <button class="btn btn-reject" onclick="leaveManager.handleReject(${request.id})">
                            Reject
                        </button>
                    </div>
                    ...
                </div>
            `).join(''); // Simplified for brevity
        }

        setTimeout(() => lucide && lucide.createIcons(), 0);
    }
}

const leaveManager = new LeaveManager();
window.leaveManager = leaveManager;
