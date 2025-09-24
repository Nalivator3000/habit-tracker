// Habit Tracker Web App
class HabitTrackerApp {
    constructor() {
        this.apiBase = window.location.origin + '/api';
        this.token = localStorage.getItem('habitTracker_token');
        this.user = null;
        this.habits = [];
        this.selectedColor = '#3B82F6';
        this.editingHabit = null;

        // No localStorage - everything goes to database

        this.init();
    }

    init() {
        this.setupEventListeners();

        // Skip authentication - directly show main app
        this.showApp();

        // Load all data including today's logs on initialization
        this.loadData();
    }

    setupEventListeners() {

        // Habit form
        document.getElementById('habitForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHabit();
        });

        // Difficulty slider
        document.getElementById('habitDifficulty').addEventListener('input', (e) => {
            document.getElementById('difficultyValue').textContent = e.target.value;
        });

        // Color picker
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedColor = option.dataset.color;
            });
        });

        // Modal close on background click
        document.getElementById('habitModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('habitModal')) {
                this.closeHabitModal();
            }
        });
    }

    // Authentication
    // Authentication functions removed for demo mode

    // Logout function removed for demo mode

    // Data loading
    async loadData() {
        console.log('🔍 loadData: Starting complete data reload...');

        // Load in sequence to ensure data consistency
        await this.loadHabits();
        await this.loadTodayHabits();
        await this.loadStats();

        console.log('🔍 loadData: All data loaded successfully');
    }

    async loadHabits() {
        try {
            console.log('🔍 loadHabits: Starting...');
            const response = await this.fetchAPI('/habits');
            console.log('🔍 loadHabits: Response received:', response);

            if (response.success) {
                console.log('🔍 loadHabits: Success! Setting habits:', response.habits);
                this.habits = response.habits;
                console.log('🔍 loadHabits: Calling renderHabits...');
                this.renderHabits();
                console.log('🔍 loadHabits: renderHabits completed');
            } else {
                console.log('🔍 loadHabits: Response not successful:', response);
                this.showMessage('habitsList', 'Failed to load habits', 'error');
            }
        } catch (error) {
            console.error('🔍 loadHabits: ERROR:', error);
            this.showMessage('habitsList', 'Failed to load habits', 'error');
        }
    }

    async loadTodayHabits() {
        try {
            console.log('🔍 loadTodayHabits: Starting...');
            const response = await this.fetchAPI('/habits/logs/today');
            console.log('🔍 loadTodayHabits: Response:', response);

            if (response.success) {
                console.log('🔍 loadTodayHabits: Calling renderTodayHabits with logs:', response.logs);
                console.log('🔍 loadTodayHabits: Current habits count:', this.habits.length);
                this.renderTodayHabits(response.logs);
            } else {
                console.log('🔍 loadTodayHabits: Response not successful:', response);
                // Still render with empty logs to show habits
                this.renderTodayHabits([]);
            }
        } catch (error) {
            console.error('🔍 loadTodayHabits: ERROR:', error);
            // Render with empty logs in case of error
            this.renderTodayHabits([]);
        }
    }

    async loadStats() {
        try {
            console.log('🔍 loadStats: Starting stats calculation...');

            // Get today's logs for completion rate
            const response = await this.fetchAPI('/habits/logs/today');
            console.log('🔍 loadStats: Today logs response:', response);

            const totalHabits = this.habits.length;
            const activeStreaks = this.habits.filter(h => h.streak_count > 0).length;

            // Count completed from database only
            const completedToday = response.success ? response.logs.filter(l => l.status === 'completed').length : 0;
            const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

            console.log('🔍 loadStats: Calculated stats:', {
                totalHabits,
                completedToday,
                activeStreaks,
                completionRate,
                totalLogsToday: response.success ? response.logs.length : 0
            });

            this.renderStats({
                totalHabits,
                completedToday,
                activeStreaks,
                completionRate
            });
        } catch (error) {
            console.error('🔍 loadStats: ERROR:', error);
        }
    }

    // Habit management
    async saveHabit() {
        const habitData = {
            name: document.getElementById('habitName').value,
            description: document.getElementById('habitDescription').value,
            frequency_type: document.getElementById('habitFrequency').value,
            target_count: parseInt(document.getElementById('habitTarget').value),
            difficulty_level: parseInt(document.getElementById('habitDifficulty').value),
            category: document.getElementById('habitCategory').value,
            color: this.selectedColor
        };

        try {
            this.showMessage('habitModalMessage', 'Saving habit...', 'info');

            const url = this.editingHabit ? `/habits/${this.editingHabit.id}` : '/habits';
            const method = this.editingHabit ? 'PUT' : 'POST';

            const response = await this.fetchAPI(url, {
                method,
                body: JSON.stringify(habitData)
            });

            if (response.success) {
                this.showMessage('habitModalMessage', 'Habit saved successfully!', 'success');
                setTimeout(() => {
                    this.closeHabitModal();
                    this.loadData();
                }, 1000);
            } else {
                this.showMessage('habitModalMessage', response.message || 'Failed to save habit', 'error');
            }
        } catch (error) {
            console.error('Save habit error:', error);
            this.showMessage('habitModalMessage', 'Failed to save habit. Please try again.', 'error');
        }
    }

    async deleteHabit(habitId) {
        if (!confirm('Are you sure you want to delete this habit?')) return;

        try {
            console.log('🔍 deleteHabit: Starting deletion of habit', habitId);

            const response = await this.fetchAPI(`/habits/${habitId}`, {
                method: 'DELETE'
            });

            console.log('🔍 deleteHabit: Delete response:', response);

            if (response.success) {
                console.log('🔍 deleteHabit: Success! Deleted logs:', response.deletedLogs);
                console.log('🔍 deleteHabit: Refreshing all data...');

                // Force complete data refresh
                await this.loadData();

                // Show success message with log count
                const message = response.deletedLogs > 0
                    ? `Habit deleted successfully! Removed ${response.deletedLogs} today's log(s) to fix statistics.`
                    : 'Habit deleted successfully!';

                console.log('🔍 deleteHabit: Showing success message:', message);
                alert(message);
            } else {
                alert(response.message || 'Failed to delete habit');
            }
        } catch (error) {
            console.error('🔍 deleteHabit: ERROR:', error);
            alert('Failed to delete habit: ' + error.message);
        }
    }

    async logHabit(habitId, status = 'completed') {
        try {
            console.log('🔍 logHabit: Starting for habit', habitId, 'with status', status);
            const today = new Date().toISOString().split('T')[0];

            // Save directly to database via API
            const response = await this.fetchAPI(`/habits/${habitId}/log`, {
                method: 'POST',
                body: JSON.stringify({
                    date: today,
                    status,
                    completion_count: 1
                })
            });

            console.log('🔍 logHabit: Database response:', response);

            if (response.success) {
                console.log('🔍 logHabit: Saved to database successfully!');
                this.loadData(); // Refresh all data from database
            } else {
                alert(response.message || 'Failed to save habit to database');
            }
        } catch (error) {
            console.error('🔍 logHabit: Database ERROR:', error);
            alert('Failed to save habit to database');
        }
    }

    async undoHabit(habitId) {
        try {
            console.log('🔄 undoHabit: Starting undo for habit', habitId);

            // Confirm the undo action
            if (!confirm('Are you sure you want to undo this habit completion?')) {
                return;
            }

            // Remove log from database via DELETE API
            const response = await this.fetchAPI(`/habits/${habitId}/log`, {
                method: 'DELETE'
            });

            console.log('🔄 undoHabit: Database response:', response);

            if (response.success) {
                console.log('🔄 undoHabit: Undone successfully!');
                this.loadData(); // Refresh all data from database
                this.showMessage('todayHabits', 'Habit completion undone successfully!', 'success');
            } else {
                alert(response.message || 'Failed to undo habit completion');
            }
        } catch (error) {
            console.error('🔄 undoHabit: Database ERROR:', error);
            alert('Failed to undo habit completion');
        }
    }

    // UI Management - simplified for demo mode

    showApp() {
        // authSection no longer exists, just ensure mainApp is visible
        const mainApp = document.getElementById('mainApp');
        if (mainApp) {
            mainApp.classList.remove('hidden');
        }
    }

    // showLogin and showRegister functions removed for demo mode

    openHabitModal(habit = null) {
        this.editingHabit = habit;

        if (habit) {
            document.getElementById('modalTitle').textContent = 'Edit Habit';
            document.getElementById('habitName').value = habit.name;
            document.getElementById('habitDescription').value = habit.description || '';
            document.getElementById('habitFrequency').value = habit.frequency_type;
            document.getElementById('habitTarget').value = habit.target_count;
            document.getElementById('habitDifficulty').value = habit.difficulty_level;
            document.getElementById('difficultyValue').textContent = habit.difficulty_level;
            document.getElementById('habitCategory').value = habit.category || '';

            // Set color
            this.selectedColor = habit.color || '#3B82F6';
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            const colorOption = document.querySelector(`[data-color="${this.selectedColor}"]`);
            if (colorOption) colorOption.classList.add('selected');
        } else {
            document.getElementById('modalTitle').textContent = 'Add New Habit';
            document.getElementById('habitForm').reset();
            document.getElementById('difficultyValue').textContent = '3';

            // Reset color selection
            this.selectedColor = '#3B82F6';
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            document.querySelector('[data-color="#3B82F6"]').classList.add('selected');
        }

        document.getElementById('habitModalMessage').innerHTML = '';
        document.getElementById('habitModal').classList.add('active');
    }

    closeHabitModal() {
        document.getElementById('habitModal').classList.remove('active');
        this.editingHabit = null;
    }

    // Rendering
    renderHabits() {
        console.log('🔍 renderHabits: Starting with habits:', this.habits);
        const container = document.getElementById('habitsList');
        console.log('🔍 renderHabits: Container found:', container);

        if (this.habits.length === 0) {
            console.log('🔍 renderHabits: No habits, showing empty message');
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <p>No habits yet. Create your first habit to get started!</p>
                </div>
            `;
            return;
        }

        console.log('🔍 renderHabits: Rendering', this.habits.length, 'habits');

        container.innerHTML = this.habits.map(habit => {
            console.log('🔍 renderHabits: Processing habit:', habit.id, habit.name);
            return `
            <div class="habit-item" style="border-left-color: ${habit.color}">
                <div class="habit-info">
                    <div class="habit-name">${habit.name}</div>
                    <div class="habit-meta">
                        <span>🔥 ${habit.streak_count || 0} streak</span>
                        <span>📅 ${habit.frequency_type}</span>
                        <span>⭐ ${habit.difficulty_level}/5</span>
                        ${habit.category ? `<span>🏷️ ${habit.category}</span>` : ''}
                    </div>
                </div>
                <div class="habit-actions">
                    <button class="btn btn-small" data-action="complete-habit" data-habit-id="${habit.id}">
                        ✅ Complete
                    </button>
                    <button class="btn btn-secondary btn-small" data-action="edit-habit" data-habit='${JSON.stringify(habit).replace(/'/g, "&#39;")}'>
                        ✏️ Edit
                    </button>
                    <button class="btn btn-danger btn-small" data-action="delete-habit" data-habit-id="${habit.id}">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
        }).join('');
    }

    renderTodayHabits(logs) {
        const container = document.getElementById('todayHabits');
        const today = new Date().toISOString().split('T')[0];

        // Get habits that should be done today
        const dailyHabits = this.habits.filter(h => h.frequency_type === 'daily');
        const todayLogs = logs || [];

        if (dailyHabits.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 1rem; color: #666;">
                    <p>No daily habits configured.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = dailyHabits.map(habit => {
            const log = todayLogs.find(l => l.habit_id === habit.id);
            const completed = log && log.status === 'completed';

            console.log('🔍 renderTodayHabits: Habit', habit.id, habit.name, 'log:', log, 'completed:', completed);

            return `
                <div class="habit-item" style="border-left-color: ${habit.color}; ${completed ? 'opacity: 0.7;' : ''}">
                    <div class="habit-info">
                        <div class="habit-name">
                            ${completed ? '✅' : '⭕'} ${habit.name}
                        </div>
                        <div class="habit-meta">
                            <span>🔥 ${habit.streak_count} streak</span>
                            <span>⭐ ${habit.difficulty_level}/5</span>
                        </div>
                    </div>
                    <div class="habit-actions">
                        ${!completed ? `
                            <button class="btn btn-small" data-action="complete-habit" data-habit-id="${habit.id}">
                                ✅ Complete
                            </button>
                            <button class="btn btn-secondary btn-small" data-action="skip-habit" data-habit-id="${habit.id}">
                                ⏭️ Skip
                            </button>
                        ` : `
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="color: #10B981; font-weight: 500;">Completed! 🎉</span>
                                <button class="btn btn-secondary btn-small" data-action="undo-habit" data-habit-id="${habit.id}" title="Undo completion">
                                    ↶ Undo
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderStats(stats) {
        document.getElementById('totalHabits').textContent = stats.totalHabits;
        document.getElementById('completedToday').textContent = stats.completedToday;
        document.getElementById('activeStreaks').textContent = stats.activeStreaks;
        document.getElementById('completionRate').textContent = `${stats.completionRate}%`;
    }

    // Utility methods
    async fetchAPI(endpoint, options = {}) {
        const url = this.apiBase + endpoint;
        console.log('🔍 fetchAPI: Making request to:', url);
        console.log('🔍 fetchAPI: Options:', options);

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            console.log('🔍 fetchAPI: Response status:', response.status, response.statusText);

            if (!response.ok) {
                console.error('🔍 fetchAPI: Response not OK:', response.status, response.statusText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('🔍 fetchAPI: Response data:', data);
            return data;
        } catch (error) {
            console.error('🔍 fetchAPI: ERROR:', error);
            throw error;
        }
    }

    showMessage(containerId, message, type = 'info') {
        console.log('🔍 showMessage: Showing message in', containerId, ':', message, '(type:', type, ')');
        const container = document.getElementById(containerId);
        console.log('🔍 showMessage: Container found:', container);

        const alertClass = type === 'error' ? 'alert-error' :
                          type === 'success' ? 'alert-success' :
                          'alert-info';

        if (container) {
            container.innerHTML = `
                <div class="alert ${alertClass}">
                    ${message}
                </div>
            `;
        } else {
            console.error('🔍 showMessage: Container not found:', containerId);
        }

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                container.innerHTML = '';
            }, 3000);
        }
    }
}

// Initialize the app
const app = new HabitTrackerApp();

// Setup global event handlers for dynamic content
window.app = app;

// Add event delegation for dynamically created buttons
document.addEventListener('click', function(e) {
    // Handle habit completion buttons
    if (e.target.matches('button[data-action="complete-habit"]')) {
        const habitId = parseInt(e.target.dataset.habitId);
        app.logHabit(habitId);
    }

    // Handle habit skip buttons
    if (e.target.matches('button[data-action="skip-habit"]')) {
        const habitId = parseInt(e.target.dataset.habitId);
        app.logHabit(habitId, 'skipped');
    }

    // Handle habit undo buttons
    if (e.target.matches('button[data-action="undo-habit"]')) {
        const habitId = parseInt(e.target.dataset.habitId);
        app.undoHabit(habitId);
    }

    // Handle habit edit buttons
    if (e.target.matches('button[data-action="edit-habit"]')) {
        const habitData = JSON.parse(e.target.dataset.habit);
        app.openHabitModal(habitData);
    }

    // Handle habit delete buttons
    if (e.target.matches('button[data-action="delete-habit"]')) {
        const habitId = parseInt(e.target.dataset.habitId);
        app.deleteHabit(habitId);
    }

    // Authentication button handlers removed for demo mode

    // Handle add habit button
    if (e.target.matches('button[data-action="add-habit"]')) {
        app.openHabitModal();
    }

    // Handle close modal button
    if (e.target.matches('button[data-action="close-modal"]')) {
        app.closeHabitModal();
    }
});