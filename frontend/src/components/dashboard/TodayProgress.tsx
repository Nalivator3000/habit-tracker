import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTodayLogs } from '../../store/slices/habitSlice';
import { Card, Button, Spinner } from '../ui';
import { HabitCard } from '../habit';

const TodayProgress: React.FC = () => {
  const dispatch = useAppDispatch();
  const { todayLogs, habits, isLoading } = useAppSelector(state => state.habits);

  useEffect(() => {
    dispatch(fetchTodayLogs());
  }, [dispatch]);

  const getProgressStats = () => {
    if (!todayLogs) return { completed: 0, total: 0, percentage: 0 };

    const completed = todayLogs.logged_count || 0;
    const total = todayLogs.total_habits || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  };

  const { completed, total, percentage } = getProgressStats();

  const getProgressColor = () => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressBgColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getMotivationalMessage = () => {
    if (percentage === 100) return "Perfect day! 🎉 You've completed all your habits!";
    if (percentage >= 80) return "Almost there! 💪 Just a few more to go!";
    if (percentage >= 60) return "Great progress! 🌟 Keep it up!";
    if (percentage >= 40) return "Good start! 🚀 You can do this!";
    if (percentage > 0) return "Every step counts! 👟 Let's keep going!";
    return "Ready to start your day? 🌅 Your habits are waiting!";
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Today's Progress</h3>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getProgressColor()}`}>
              {percentage}%
            </div>
            <div className="text-sm text-gray-500">
              {completed} of {total} habits
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{completed}/{total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${getProgressBgColor()}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Motivational Message */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700">
            {getMotivationalMessage()}
          </p>
        </div>
      </Card>

      {/* Pending Habits */}
      {todayLogs?.unlogged_habits && todayLogs.unlogged_habits.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Pending Habits ({todayLogs.unlogged_habits.length})
            </h3>
            <Button size="sm" variant="outline">
              Mark All Done
            </Button>
          </div>

          <div className="space-y-3">
            {todayLogs.unlogged_habits.slice(0, 5).map((habit: any) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                compact={true}
                showActions={false}
              />
            ))}

            {todayLogs.unlogged_habits.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm">
                  View {todayLogs.unlogged_habits.length - 5} more habits
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Completed Habits */}
      {todayLogs?.logged_habits && todayLogs.logged_habits.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Completed Today ({todayLogs.logged_habits.length})
            </h3>
            <div className="text-sm text-green-600 font-medium">
              ✓ Well done!
            </div>
          </div>

          <div className="space-y-2">
            {todayLogs.logged_habits.slice(0, 3).map((log: any) => {
              const habit = habits.find(h => h.id === log.habit_id);
              if (!habit) return null;

              return (
                <div key={log.id} className="flex items-center p-3 bg-green-50 rounded-lg">
                  <div
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: habit.color || '#10B981' }}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{habit.name}</span>
                    {log.notes && (
                      <p className="text-xs text-gray-600 mt-1">{log.notes}</p>
                    )}
                  </div>
                  <div className="text-xs text-green-600 font-medium">
                    {new Date(log.completed_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              );
            })}

            {todayLogs.logged_habits.length > 3 && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm">
                  View all completed habits
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {(!todayLogs || (todayLogs.total_habits === 0)) && (
        <Card className="p-8">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No habits for today</h3>
            <p className="text-gray-600 mb-4">
              Create your first habit to start tracking your progress!
            </p>
            <Button variant="primary">
              Create Your First Habit
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TodayProgress;