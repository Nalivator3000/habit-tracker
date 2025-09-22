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
            // For now, load from localStorage or use demo data
            const savedHabits = localStorage.getItem('demo_habits');
            if (savedHabits) {
                this.habits = JSON.parse(savedHabits);
            } else {
                // Demo habits for testing
                this.habits = [
                    {
                        id: 1,
                        name: 'Morning Exercise',
                        description: 'Daily morning workout',
                        frequency: 'daily',
                        target_count: 1,
                        difficulty: 3,
                        category: 'health',
                        color: '#10B981',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 2,
                        name: 'Read Books',
                        description: 'Read for 30 minutes',
                        frequency: 'daily',
                        target_count: 1,
                        difficulty: 2,
                        category: 'education',
                        color: '#3B82F6',
                        created_at: new Date().toISOString()
                    }
                ];
                localStorage.setItem('demo_habits', JSON.stringify(this.habits));
            }
            this.renderHabits();
        } catch (error) {
            console.error('Failed to load habits:', error);
            this.showMessage('habitsList', 'Failed to load habits', 'error');
        }
    }

    async loadTodayHabits() {
        try {
            // Simulate today's habit completion status
            const todayLogs = this.habits.map(habit => ({
                habit_id: habit.id,
                habit_name: habit.name,
                completed: Math.random() > 0.5, // Random completion for demo
                color: habit.color
            }));
            this.renderTodayHabits(todayLogs);
        } catch (error) {
            console.error('Failed to load today habits:', error);
        }
    }

    async loadStats() {
        // Calculate stats from habits data
        const totalHabits = this.habits.length;
        const activeStreaks = Math.floor(Math.random() * totalHabits); // Random for demo
        const completedToday = Math.floor(Math.random() * totalHabits); // Random for demo
        const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

        this.renderStats({
            totalHabits,
            completedToday,
            activeStreaks,
            completionRate
        });
    }

    // Habit management
    async saveHabit() {
        const habitData = {
            id: this.editingHabit ? this.editingHabit.id : Date.now(), // Use timestamp as ID for new habits
            name: document.getElementById('habitName').value,
            description: document.getElementById('habitDescription').value,
            frequency: document.getElementById('habitFrequency').value,
            target_count: parseInt(document.getElementById('habitTarget').value),
            difficulty: parseInt(document.getElementById('habitDifficulty').value),
            category: document.getElementById('habitCategory').value,
            color: this.selectedColor,
            created_at: this.editingHabit ? this.editingHabit.created_at : new Date().toISOString()
        };

        try {
            this.showMessage('habitModalMessage', 'Saving habit...', 'info');

            if (this.editingHabit) {
                // Update existing habit
                const index = this.habits.findIndex(h => h.id === this.editingHabit.id);
                if (index !== -1) {
                    this.habits[index] = habitData;
                }
            } else {
                // Add new habit
                this.habits.push(habitData);
            }

            // Save to localStorage
            localStorage.setItem('demo_habits', JSON.stringify(this.habits));

            this.showMessage('habitModalMessage', 'Habit saved successfully!', 'success');
            setTimeout(() => {
                this.closeHabitModal();
                this.loadData();
            }, 1000);
        } catch (error) {
            console.error('Save habit error:', error);
            this.showMessage('habitModalMessage', 'Failed to save habit. Please try again.', 'error');
        }
    }

    async deleteHabit(habitId) {
        if (!confirm('Are you sure you want to delete this habit?')) return;

        try {
            // Remove from habits array
            this.habits = this.habits.filter(h => h.id !== habitId);

            // Save to localStorage
            localStorage.setItem('demo_habits', JSON.stringify(this.habits));

            this.loadData();
        } catch (error) {
            console.error('Delete habit error:', error);
            alert('Failed to delete habit');
        }
    }

    async logHabit(habitId, status = 'completed') {
        try {
            // For demo mode, just show success message
            const habit = this.habits.find(h => h.id === habitId);
            if (habit) {
                alert(`✅ Logged "${habit.name}" as ${status}!`);
                this.loadData(); // Refresh data to show updated stats
            }
        } catch (error) {
            console.error('Log habit error:', error);
            alert('Failed to log habit');
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