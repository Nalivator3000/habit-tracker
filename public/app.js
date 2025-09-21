// Habit Tracker Web App
class HabitTrackerApp {
    constructor() {
        this.apiBase = window.location.origin + '/api';
        this.token = localStorage.getItem('habitTracker_token');
        this.user = null;
        this.habits = [];
        this.selectedColor = '#3B82F6';
        this.editingHabit = null;

        this.init();
    }

    init() {
        this.setupEventListeners();

        if (this.token) {
            this.checkAuth();
        } else {
            this.showAuth();
        }
    }

    setupEventListeners() {
        // Auth forms
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

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
    async checkAuth() {
        try {
            const response = await this.fetchAPI('/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.success) {
                this.user = response.user;
                this.showApp();
                this.loadData();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.logout();
        }
    }

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            this.showMessage('authMessage', 'Logging in...', 'info');

            const response = await this.fetchAPI('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (response.success) {
                this.token = response.token;
                this.user = response.user;
                localStorage.setItem('habitTracker_token', this.token);
                this.showApp();
                this.loadData();
                this.showMessage('authMessage', 'Login successful!', 'success');
            } else {
                this.showMessage('authMessage', response.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('authMessage', 'Login failed. Please try again.', 'error');
        }
    }

    async register() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            this.showMessage('authMessage', 'Creating account...', 'info');

            const response = await this.fetchAPI('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });

            if (response.success) {
                this.token = response.token;
                this.user = response.user;
                localStorage.setItem('habitTracker_token', this.token);
                this.showApp();
                this.loadData();
                this.showMessage('authMessage', 'Account created successfully!', 'success');
            } else {
                this.showMessage('authMessage', response.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage('authMessage', 'Registration failed. Please try again.', 'error');
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        this.habits = [];
        localStorage.removeItem('habitTracker_token');
        this.showAuth();
    }

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
            const response = await this.fetchAPI('/habits', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.success) {
                this.habits = response.habits;
                this.renderHabits();
            }
        } catch (error) {
            console.error('Failed to load habits:', error);
            this.showMessage('habitsList', 'Failed to load habits', 'error');
        }
    }

    async loadTodayHabits() {
        try {
            const response = await this.fetchAPI('/habits/logs/today', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.success) {
                this.renderTodayHabits(response.logs);
            }
        } catch (error) {
            console.error('Failed to load today habits:', error);
        }
    }

    async loadStats() {
        // Calculate stats from habits data
        const totalHabits = this.habits.length;
        const activeStreaks = this.habits.filter(h => h.streak_count > 0).length;

        // Get today's logs for completion rate
        try {
            const response = await this.fetchAPI('/habits/logs/today', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const completedToday = response.success ? response.logs.filter(l => l.status === 'completed').length : 0;
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
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
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
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
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
            const today = new Date().toISOString().split('T')[0];

            const response = await this.fetchAPI(`/habits/${habitId}/log`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    date: today,
                    status,
                    completion_count: 1
                })
            });

            if (response.success) {
                this.loadData(); // Refresh all data
            } else {
                alert(response.message || 'Failed to log habit');
            }
        } catch (error) {
            console.error('Log habit error:', error);
            alert('Failed to log habit');
        }
    }

    // UI Management
    showAuth() {
        document.getElementById('authSection').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }

    showApp() {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('userEmail').textContent = this.user?.email || '';
    }

    showLogin() {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('authMessage').innerHTML = '';
    }

    showRegister() {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
        document.getElementById('authMessage').innerHTML = '';
    }

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
        const container = document.getElementById('habitsList');

        if (this.habits.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <p>No habits yet. Create your first habit to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.habits.map(habit => `
            <div class="habit-item" style="border-left-color: ${habit.color}">
                <div class="habit-info">
                    <div class="habit-name">${habit.name}</div>
                    <div class="habit-meta">
                        <span>🔥 ${habit.streak_count} streak</span>
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
        `).join('');
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

    // Handle logout button
    if (e.target.matches('button[data-action="logout"]')) {
        app.logout();
    }

    // Handle show login button
    if (e.target.matches('button[data-action="show-login"]')) {
        app.showLogin();
    }

    // Handle show register button
    if (e.target.matches('button[data-action="show-register"]')) {
        app.showRegister();
    }

    // Handle add habit button
    if (e.target.matches('button[data-action="add-habit"]')) {
        app.openHabitModal();
    }

    // Handle close modal button
    if (e.target.matches('button[data-action="close-modal"]')) {
        app.closeHabitModal();
    }
});