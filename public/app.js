// Habit Tracker Web App
class HabitTrackerApp {
    constructor() {
        this.apiBase = window.location.origin + '/api';
        this.token = localStorage.getItem('habitTracker_token');
        this.user = null;
        this.habits = [];
        this.selectedColor = '#3B82F6';
        this.editingHabit = null;

        // Load completed habits from localStorage
        this.completedToday = JSON.parse(localStorage.getItem('habitTracker_completedToday') || '{}');
        console.log('🔍 Constructor: Loaded completed habits:', this.completedToday);

        this.init();
    }

    init() {
        this.setupEventListeners();

        // Skip authentication - directly show main app
        this.showApp();
        this.loadHabits();
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
        await Promise.all([
            this.loadHabits(),
            this.loadTodayHabits(),
            this.loadStats()
        ]);
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
                this.renderTodayHabits(response.logs);
            }
        } catch (error) {
            console.error('🔍 loadTodayHabits: ERROR:', error);
        }
    }

    async loadStats() {
        try {
            // Get today's logs for completion rate
            const response = await this.fetchAPI('/habits/logs/today');

            const totalHabits = this.habits.length;
            const activeStreaks = this.habits.filter(h => h.streak_count > 0).length;

            // Count completed from API + localStorage
            const apiCompleted = response.success ? response.logs.filter(l => l.status === 'completed').length : 0;
            const today = new Date().toISOString().split('T')[0];
            const localCompleted = this.completedToday[today] ? Object.keys(this.completedToday[today]).filter(habitId =>
                this.completedToday[today][habitId].status === 'completed'
            ).length : 0;

            const completedToday = Math.max(apiCompleted, localCompleted); // Take the higher count
            const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

            this.renderStats({
                totalHabits,
                completedToday,
                activeStreaks,
                completionRate
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
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
            const response = await this.fetchAPI(`/habits/${habitId}`, {
                method: 'DELETE'
            });

            if (response.success) {
                this.loadData();
            } else {
                alert('Failed to delete habit');
            }
        } catch (error) {
            console.error('Delete habit error:', error);
            alert('Failed to delete habit');
        }
    }

    async logHabit(habitId, status = 'completed') {
        try {
            console.log('🔍 logHabit: Starting for habit', habitId, 'with status', status);
            const today = new Date().toISOString().split('T')[0];

            // Save to localStorage immediately
            if (!this.completedToday[today]) {
                this.completedToday[today] = {};
            }
            this.completedToday[today][habitId] = {
                status,
                timestamp: new Date().toISOString(),
                completion_count: 1
            };
            localStorage.setItem('habitTracker_completedToday', JSON.stringify(this.completedToday));
            console.log('🔍 logHabit: Saved to localStorage:', this.completedToday);

            // Try to save to API
            const response = await this.fetchAPI(`/habits/${habitId}/log`, {
                method: 'POST',
                body: JSON.stringify({
                    date: today,
                    status,
                    completion_count: 1
                })
            });

            console.log('🔍 logHabit: API response:', response);

            if (response.success) {
                console.log('🔍 logHabit: API success, refreshing data...');
                this.loadData(); // Refresh all data
            } else {
                console.log('🔍 logHabit: API failed, but localStorage saved');
                // Still refresh to show localStorage data
                this.loadData();
            }
        } catch (error) {
            console.error('🔍 logHabit: ERROR:', error);
            // Even if API fails, refresh to show localStorage data
            this.loadData();
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
            const today = new Date().toISOString().split('T')[0];

            // Check localStorage for completion status
            const localCompleted = this.completedToday[today] && this.completedToday[today][habit.id];
            const completed = (log && log.status === 'completed') || (localCompleted && localCompleted.status === 'completed');

            console.log('🔍 renderTodayHabits: Habit', habit.id, habit.name, 'log:', log, 'localCompleted:', localCompleted, 'final completed:', completed);

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
                            <span style="color: #10B981; font-weight: 500;">Completed! 🎉</span>
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
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        return await response.json();
    }

    showMessage(containerId, message, type = 'info') {
        const container = document.getElementById(containerId);
        const alertClass = type === 'error' ? 'alert-error' :
                          type === 'success' ? 'alert-success' :
                          'alert-info';

        container.innerHTML = `
            <div class="alert ${alertClass}">
                ${message}
            </div>
        `;

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