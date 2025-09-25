// rooms.js (apiClient Integrated)

class RoomsManager {
    constructor() {
        this.rooms = [];
        this.init();
    }

    async init() {
        await this.loadRooms();
        this.setupEventListeners();
    }

    async loadRooms() {
        try {
            this.rooms = await apiClient.getRooms();
            this.renderRoomsList();
            this.updateDropdowns();
        } catch (error) {
            console.error('Error loading rooms:', error);
            toastManager.show('Failed to load room data', 'error');
        }
    }

    setupEventListeners() {
        const addRoomBtn = document.getElementById('addRoomBtn');
        if (addRoomBtn) {
            addRoomBtn.addEventListener('click', () => this.addRoom());
        }

        const roomInputs = ['roomName', 'roomCapacity', 'roomType'];
        roomInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.addRoom();
                    }
                });
            }
        });
    }

    async addRoom() {
        const name = document.getElementById('roomName').value.trim();
        const capacity = document.getElementById('roomCapacity').value.trim();
        const type = document.getElementById('roomType').value;

        const errors = utils.validateRequired({ name, capacity, type });
        if (errors.length > 0) {
            toastManager.show(errors[0], 'error');
            return;
        }

        const capacityNum = parseInt(capacity);
        if (isNaN(capacityNum) || capacityNum <= 0) {
            toastManager.show('Capacity must be a positive number', 'error');
            return;
        }

        if (this.rooms.some(r => r.name.toLowerCase() === name.toLowerCase())) {
            toastManager.show('Room with this name already exists', 'error');
            return;
        }

        try {
            const newRoom = await apiClient.addRoom({ name, capacity: capacityNum, type });
            this.rooms.push(newRoom);

            this.renderRoomsList();
            this.updateDropdowns();
            this.clearForm();

            toastManager.show('Room added successfully!', 'success');
        } catch (error) {
            toastManager.show('Error adding room', 'error');
        }
    }

    async removeRoom(id) {
        try {
            await window.apiClient.removeRoom(id);
            this.rooms = this.rooms.filter(r => r.id !== id);

            this.renderRoomsList();
            this.updateDropdowns();

            toastManager.show('Room removed successfully!', 'success');
        } catch (error) {
            toastManager.show('Error removing room', 'error');
        }
    }

    renderRoomsList() {
        const roomList = document.getElementById('roomList');
        if (!roomList) return;

        if (this.rooms.length === 0) {
            roomList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="building"></i>
                    <p>No rooms found</p>
                </div>
            `;
        } else {
            roomList.innerHTML = this.rooms.map(room => `
                <div class="item-card">
                    <div class="item-info">
                        <div class="item-title">${utils.escapeHtml(room.name)}</div>
                        <div class="item-subtitle">
                            <span class="room-type">${utils.escapeHtml(room.type)}</span>
                            <span>Capacity: ${room.capacity}</span>
                        </div>
                    </div>
                    <button class="btn btn-outline btn-delete" onclick="roomsManager.removeRoom(${room.id})">
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
        const practicalRoomSelect = document.getElementById('practicalRoom');
        if (practicalRoomSelect) {
            const currentValue = practicalRoomSelect.value;
            practicalRoomSelect.innerHTML = '<option value="">Select room</option>' +
                this.rooms.map(room =>
                    `<option value="${utils.escapeHtml(room.name)}" ${currentValue === room.name ? 'selected' : ''}>${utils.escapeHtml(room.name)} (${room.capacity})</option>`
                ).join('');
        }
        if (window.practicalsManager) {
            practicalsManager.updateRoomDropdown();
        }
    }

    clearForm() {
        document.getElementById('roomName').value = '';
        document.getElementById('roomCapacity').value = '';
        document.getElementById('roomType').value = '';
    }

    getRooms() {
        return this.rooms;
    }
    
    async updateRoom(id, updates) {
        try {
            const updatedRoom = await apiClient.updateRoom(id, updates);
            if (updatedRoom) {
                const index = this.rooms.findIndex(r => r.id === id);
                if (index !== -1) {
                    this.rooms[index] = updatedRoom;
                }
                this.renderRoomsList();
                this.updateDropdowns();
                toastManager.show('Room updated successfully!', 'success');
                return updatedRoom;
            }
            return null;
        } catch (error) {
            toastManager.show('Error updating room', 'error');
            return null;
        }
    }

    async getRoomUtilization() {
        try {
            // This calculation should ideally happen on the backend.
            // For now, we fetch the timetable and process it client-side.
            const timetable = await apiClient.getTimetable(); 
            const utilization = {};

            this.rooms.forEach(room => {
                utilization[room.name] = { usedSlots: 0, totalSlots: 30 }; // Assuming 5 days * 6 periods
            });

            Object.values(timetable).forEach(day => {
                Object.values(day).forEach(slot => {
                    if (slot.room && utilization[slot.room]) {
                        utilization[slot.room].usedSlots++;
                    }
                });
            });

            Object.keys(utilization).forEach(roomName => {
                const data = utilization[roomName];
                data.utilizationRate = data.totalSlots > 0 ? Math.round((data.usedSlots / data.totalSlots) * 100) : 0;
            });
            return utilization;
        } catch (error) {
            toastManager.show('Error calculating room utilization', 'error');
            return {};
        }
    }

    async importRooms(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.rooms && Array.isArray(data.rooms)) {
                await apiClient.importRooms(data.rooms); // Assumes bulk import endpoint
                await this.loadRooms(); // Reload from server
                toastManager.show('Rooms data imported successfully!', 'success');
                return true;
            } else {
                throw new Error('Invalid rooms data format');
            }
        } catch (error) {
            toastManager.show('Error importing rooms data: ' + error.message, 'error');
            return false;
        }
    }

    // Other methods (getRoomById, searchRooms, etc.) remain largely the same as they operate on the local `this.rooms` array.
}

const roomsManager = new RoomsManager();
window.roomsManager = roomsManager;