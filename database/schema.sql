-- Habit Tracker Database Schema
-- PostgreSQL Database Schema for Habit Tracking Application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    telegram_id BIGINT UNIQUE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE
);

-- Habit categories (predefined and custom)
CREATE TABLE habit_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7), -- hex color
    is_default BOOLEAN DEFAULT false,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habits table
CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES habit_categories(id) ON DELETE SET NULL,
    color VARCHAR(7) DEFAULT '#3B82F6', -- hex color
    icon VARCHAR(50),

    -- Frequency configuration
    frequency_type VARCHAR(20) NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'monthly', 'custom')),
    frequency_value INTEGER DEFAULT 1, -- times per period or days interval
    target_count INTEGER DEFAULT 1, -- how many times per day/week/month

    -- Timing
    reminder_times TIME[], -- array of reminder times
    preferred_time_start TIME,
    preferred_time_end TIME,

    -- Status and tracking
    is_active BOOLEAN DEFAULT true,
    streak_count INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE,

    -- Additional settings
    notes TEXT,
    difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    is_public BOOLEAN DEFAULT false
);

-- Habit completion logs
CREATE TABLE habit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Completion details
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date DATE NOT NULL, -- date of completion (for timezone handling)
    status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'partial', 'skipped', 'failed')),
    completion_count INTEGER DEFAULT 1, -- how many times completed that day
    target_count INTEGER DEFAULT 1, -- what was the target for that day

    -- Quality and notes
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 10),
    notes TEXT,
    mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 10),
    mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 10),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate entries for same habit on same date
    UNIQUE(habit_id, date)
);

-- Custom metrics that users can track
CREATE TABLE custom_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Scale configuration
    scale_min INTEGER DEFAULT 1,
    scale_max INTEGER DEFAULT 10,
    scale_type VARCHAR(20) DEFAULT 'numeric' CHECK (scale_type IN ('numeric', 'boolean', 'text')),
    unit VARCHAR(20), -- e.g., 'hours', 'glasses', 'kg'

    -- Categorization
    category VARCHAR(50), -- e.g., 'health', 'mood', 'productivity'
    icon VARCHAR(50),
    color VARCHAR(7),

    -- Settings
    is_active BOOLEAN DEFAULT true,
    track_daily BOOLEAN DEFAULT true,
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_time TIME,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Custom metric logs
CREATE TABLE metric_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_id UUID NOT NULL REFERENCES custom_metrics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Value tracking
    value DECIMAL(10,2), -- for numeric values
    text_value TEXT, -- for text values
    boolean_value BOOLEAN, -- for boolean values
    date DATE NOT NULL,

    -- Additional data
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- One entry per metric per day
    UNIQUE(metric_id, date)
);

-- User achievements and gamification
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    badge_color VARCHAR(7),
    points INTEGER DEFAULT 0,
    type VARCHAR(50), -- 'streak', 'completion', 'consistency', etc.
    criteria JSONB, -- flexible criteria storage
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User achievements (earned badges)
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    progress DECIMAL(5,2) DEFAULT 100.00, -- percentage of completion

    UNIQUE(user_id, achievement_id)
);

-- User statistics (for performance optimization)
CREATE TABLE user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Habit statistics
    total_habits INTEGER DEFAULT 0,
    active_habits INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    current_streaks INTEGER DEFAULT 0,

    -- Points and levels
    total_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,

    -- Time tracking
    days_active INTEGER DEFAULT 0,
    last_activity_date DATE,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habit templates (for quick habit creation)
CREATE TABLE habit_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    frequency_type VARCHAR(20) NOT NULL,
    frequency_value INTEGER DEFAULT 1,
    target_count INTEGER DEFAULT 1,
    difficulty_level INTEGER,
    icon VARCHAR(50),
    color VARCHAR(7),
    is_popular BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_is_active ON habits(is_active);
CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_user_id ON habit_logs(user_id);
CREATE INDEX idx_habit_logs_date ON habit_logs(date);
CREATE INDEX idx_habit_logs_completed_at ON habit_logs(completed_at);
CREATE INDEX idx_custom_metrics_user_id ON custom_metrics(user_id);
CREATE INDEX idx_metric_logs_metric_id ON metric_logs(metric_id);
CREATE INDEX idx_metric_logs_date ON metric_logs(date);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_habit_logs_updated_at BEFORE UPDATE ON habit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_metrics_updated_at BEFORE UPDATE ON custom_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metric_logs_updated_at BEFORE UPDATE ON metric_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();