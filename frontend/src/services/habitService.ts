import apiService from './api';
import {
  Habit,
  HabitLog,
  CreateHabitRequest,
  LogHabitRequest,
  HabitStats,
  HabitOverview,
} from '../types/habit';
import { PaginationParams, SortParams, DateRangeParams } from '../types/api';

interface GetHabitsParams extends PaginationParams, SortParams {
  is_active?: boolean;
  category_id?: string;
}

interface GetLogsParams extends PaginationParams, SortParams, DateRangeParams {
  status?: string;
  habit_ids?: string[];
}

class HabitService {
  // Habit CRUD operations
  async getHabits(params?: GetHabitsParams): Promise<{ habits: Habit[]; count: number; has_more?: boolean }> {
    return apiService.get('/habits', params);
  }

  async getHabit(id: string, includeeLogs = false): Promise<{ habit: Habit }> {
    return apiService.get(`/habits/${id}`, { include_logs: includeeLogs });
  }

  async createHabit(habitData: CreateHabitRequest): Promise<{ message: string; habit: Habit }> {
    return apiService.post('/habits', habitData);
  }

  async updateHabit(id: string, updateData: Partial<Habit>): Promise<{ message: string; habit: Habit }> {
    return apiService.put(`/habits/${id}`, updateData);
  }

  async deleteHabit(id: string, permanent = false): Promise<{ message: string }> {
    return apiService.delete(`/habits/${id}${permanent ? '?permanent=true' : ''}`);
  }

  async restoreHabit(id: string): Promise<{ message: string; habit: Habit }> {
    return apiService.post(`/habits/${id}/restore`);
  }

  // Habit statistics
  async getHabitStats(id: string, dateRange?: DateRangeParams): Promise<{ habit_id: string; stats: HabitStats; date_range?: DateRangeParams }> {
    return apiService.get(`/habits/${id}/stats`, dateRange);
  }

  async getHabitOverview(): Promise<{ overview: HabitOverview; habits_due_today: Habit[]; recent_habits: Habit[] }> {
    return apiService.get('/habits/overview');
  }

  // Habit logging
  async logHabitCompletion(habitId: string, logData: LogHabitRequest): Promise<{ message: string; log: HabitLog; habit: any }> {
    return apiService.post(`/habits/${habitId}/log`, logData);
  }

  async getHabitLogs(habitId: string, params?: GetLogsParams): Promise<{ habit_id: string; logs: HabitLog[]; count: number }> {
    return apiService.get(`/habits/${habitId}/logs`, params);
  }

  async getHabitLog(logId: string): Promise<{ log: HabitLog }> {
    return apiService.get(`/habits/logs/${logId}`);
  }

  async updateHabitLog(logId: string, updateData: Partial<HabitLog>): Promise<{ message: string; log: HabitLog }> {
    return apiService.put(`/habits/logs/${logId}`, updateData);
  }

  async deleteHabitLog(logId: string): Promise<{ message: string }> {
    return apiService.delete(`/habits/logs/${logId}`);
  }

  // User log summaries
  async getAllUserLogs(params?: GetLogsParams): Promise<{ logs: HabitLog[]; count: number }> {
    return apiService.get('/habits/logs', params);
  }

  async getTodayLogs(): Promise<{
    date: string;
    logged_habits: HabitLog[];
    unlogged_habits: Habit[];
    total_habits: number;
    logged_count: number;
    completion_rate: number;
  }> {
    return apiService.get('/habits/logs/today');
  }

  async getWeeklySummary(startDate?: string, endDate?: string): Promise<{
    start_date: string;
    end_date: string;
    daily_summaries: any[];
  }> {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    return apiService.get('/habits/logs/weekly', params);
  }

  // Utility methods
  async quickLogHabit(habitId: string, status: 'completed' | 'skipped' = 'completed'): Promise<{ message: string; log: HabitLog; habit: any }> {
    return this.logHabitCompletion(habitId, {
      status,
      date: new Date().toISOString().split('T')[0],
    });
  }

  async getHabitsWithTodayStatus(): Promise<Array<Habit & { todayStatus?: 'completed' | 'partial' | 'skipped' | 'failed' | 'pending' }>> {
    const [habitsResponse, todayResponse] = await Promise.all([
      this.getHabits({ is_active: true }),
      this.getTodayLogs(),
    ]);

    const habits = habitsResponse.habits;
    const todayLogs = todayResponse.logged_habits;

    return habits.map(habit => {
      const todayLog = todayLogs.find(log => log.habit_id === habit.id);
      return {
        ...habit,
        todayStatus: todayLog ? todayLog.status : 'pending',
      };
    });
  }
}

// Export singleton instance
const habitService = new HabitService();
export default habitService;