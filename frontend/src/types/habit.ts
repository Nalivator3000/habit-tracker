export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category_id?: string;
  color: string;
  icon?: string;
  frequency_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  frequency_value: number;
  target_count: number;
  reminder_times?: string[];
  preferred_time_start?: string;
  preferred_time_end?: string;
  is_active: boolean;
  streak_count: number;
  best_streak: number;
  total_completions: number;
  created_at: string;
  updated_at: string;
  notes?: string;
  difficulty_level?: number;
  is_public: boolean;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  date: string;
  status: 'completed' | 'partial' | 'skipped' | 'failed';
  completion_count: number;
  target_count: number;
  quality_rating?: number;
  notes?: string;
  mood_before?: number;
  mood_after?: number;
  created_at: string;
  updated_at: string;
}

export interface HabitStats {
  total_logs: number;
  completed_count: number;
  partial_count: number;
  skipped_count: number;
  failed_count: number;
  avg_quality?: number;
  avg_mood_before?: number;
  avg_mood_after?: number;
  first_log_date?: string;
  last_log_date?: string;
  completion_rate: number;
  current_streak: number;
  best_streak: number;
  total_completions: number;
}

export interface HabitOverview {
  total_active_habits: number;
  total_current_streaks: number;
  best_streak: number;
  total_completions: number;
  habits_due_today: number;
}

export interface CreateHabitRequest {
  name: string;
  description?: string;
  category_id?: string;
  color?: string;
  icon?: string;
  frequency_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  frequency_value?: number;
  target_count?: number;
  reminder_times?: string[];
  preferred_time_start?: string;
  preferred_time_end?: string;
  notes?: string;
  difficulty_level?: number;
  is_public?: boolean;
}

export interface LogHabitRequest {
  status: 'completed' | 'partial' | 'skipped' | 'failed';
  date?: string;
  completion_count?: number;
  target_count?: number;
  quality_rating?: number;
  notes?: string;
  mood_before?: number;
  mood_after?: number;
}

export interface HabitCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  is_default: boolean;
  user_id?: string;
  created_at: string;
}