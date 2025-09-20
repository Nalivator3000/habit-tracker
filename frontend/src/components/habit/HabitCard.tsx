import React, { useState } from 'react';
import { Habit } from '../../types/habit';
import { Button, Card } from '../ui';
import { useAppDispatch } from '../../store';
import { logHabitCompletion, deleteHabit } from '../../store/slices/habitSlice';

interface HabitCardProps {
  habit: Habit;
  onEdit?: (habit: Habit) => void;
  onViewDetails?: (habit: Habit) => void;
  showActions?: boolean;
  compact?: boolean;
}

const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  onEdit,
  onViewDetails,
  showActions = true,
  compact = false
}) => {
  const dispatch = useAppDispatch();
  const [isLogging, setIsLogging] = useState(false);

  // Calculate completion status for today
  const today = new Date().toISOString().split('T')[0];
  const todayLog = habit.logs?.find(log =>
    log.date === today && log.status === 'completed'
  );
  const isCompletedToday = !!todayLog;

  // Get frequency text
  const getFrequencyText = () => {
    switch (habit.frequency_type) {
      case 'daily':
        return habit.frequency_value === 1 ? 'Daily' : `${habit.frequency_value} times daily`;
      case 'weekly':
        return habit.frequency_value === 1 ? 'Weekly' : `${habit.frequency_value} times weekly`;
      case 'monthly':
        return habit.frequency_value === 1 ? 'Monthly' : `${habit.frequency_value} times monthly`;
      case 'custom':
        return `Every ${habit.frequency_value} days`;
      default:
        return 'Daily';
    }
  };

  // Get streak color
  const getStreakColor = () => {
    if (habit.streak_count === 0) return 'text-gray-500';
    if (habit.streak_count < 7) return 'text-yellow-600';
    if (habit.streak_count < 30) return 'text-orange-600';
    return 'text-green-600';
  };

  const handleQuickLog = async (status: 'completed' | 'skipped') => {
    setIsLogging(true);
    try {
      await dispatch(logHabitCompletion({
        habitId: habit.id,
        logData: {
          status,
          date: today,
        }
      })).unwrap();
    } catch (error) {
      console.error('Failed to log habit:', error);
    } finally {
      setIsLogging(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to archive this habit?')) {
      try {
        await dispatch(deleteHabit(habit.id)).unwrap();
      } catch (error) {
        console.error('Failed to delete habit:', error);
      }
    }
  };

  if (compact) {
    return (
      <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
        <div
          className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
          style={{ backgroundColor: habit.color || '#3B82F6' }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{habit.name}</h3>
          <p className="text-sm text-gray-500">{getFrequencyText()}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${getStreakColor()}`}>
            {habit.streak_count} day{habit.streak_count !== 1 ? 's' : ''}
          </span>
          {!isCompletedToday && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleQuickLog('completed')}
              isLoading={isLogging}
              disabled={isLogging}
            >
              ✓
            </Button>
          )}
          {isCompletedToday && (
            <span className="text-green-600 text-sm font-medium">✓ Done</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div
              className="w-6 h-6 rounded-full flex-shrink-0 mt-1"
              style={{ backgroundColor: habit.color || '#3B82F6' }}
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {habit.name}
              </h3>
              {habit.description && (
                <p className="text-gray-600 text-sm line-clamp-2">
                  {habit.description}
                </p>
              )}
            </div>
          </div>

          {showActions && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit?.(habit)}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Edit habit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                className="text-gray-400 hover:text-red-600 p-1"
                title="Archive habit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-600">
              <strong className={getStreakColor()}>
                {habit.streak_count}
              </strong> day streak
            </span>
            <span className="text-gray-600">
              <strong className="text-gray-900">
                {habit.total_completions || 0}
              </strong> total
            </span>
            <span className="text-gray-600">
              {getFrequencyText()}
            </span>
          </div>

          {habit.difficulty_level && (
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < habit.difficulty_level! ? 'bg-orange-400' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Today's status and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isCompletedToday ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓ Completed today
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Pending today
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isCompletedToday && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickLog('skipped')}
                  isLoading={isLogging}
                  disabled={isLogging}
                >
                  Skip
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleQuickLog('completed')}
                  isLoading={isLogging}
                  disabled={isLogging}
                >
                  Mark Done
                </Button>
              </>
            )}

            {onViewDetails && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewDetails(habit)}
              >
                Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default HabitCard;