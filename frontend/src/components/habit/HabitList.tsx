import React, { useState, useEffect } from 'react';
import { Habit } from '../../types/habit';
import { Button, Spinner } from '../ui';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchHabits } from '../../store/slices/habitSlice';
import HabitCard from './HabitCard';
import HabitForm from './HabitForm';

interface HabitListProps {
  showCreateButton?: boolean;
  compact?: boolean;
  className?: string;
  onHabitSelect?: (habit: Habit) => void;
}

const HabitList: React.FC<HabitListProps> = ({
  showCreateButton = true,
  compact = false,
  className = '',
  onHabitSelect
}) => {
  const dispatch = useAppDispatch();
  const { habits, isLoading, error } = useAppSelector(state => state.habits);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'streak' | 'frequency'>('created');

  useEffect(() => {
    dispatch(fetchHabits({ is_active: true }));
  }, [dispatch]);

  const filteredAndSortedHabits = React.useMemo(() => {
    let filtered = [...habits];
    const today = new Date().toISOString().split('T')[0];

    // Apply filter
    switch (filter) {
      case 'active':
        filtered = filtered.filter(habit => habit.is_active);
        break;
      case 'completed':
        filtered = filtered.filter(habit =>
          habit.logs?.some(log => log.date === today && log.status === 'completed')
        );
        break;
      case 'pending':
        filtered = filtered.filter(habit =>
          !habit.logs?.some(log => log.date === today && log.status === 'completed')
        );
        break;
      default:
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'streak':
          return (b.streak_count || 0) - (a.streak_count || 0);
        case 'frequency':
          return a.frequency_type.localeCompare(b.frequency_type);
        case 'created':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [habits, filter, sortBy]);

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setShowCreateForm(false);
  };

  const handleFormSuccess = (habit: Habit) => {
    setShowCreateForm(false);
    setEditingHabit(null);
    // Refresh habits list
    dispatch(fetchHabits({ is_active: true }));
  };

  const handleFormCancel = () => {
    setShowCreateForm(false);
    setEditingHabit(null);
  };

  const getFilterCount = (filterType: typeof filter) => {
    const today = new Date().toISOString().split('T')[0];

    switch (filterType) {
      case 'all':
        return habits.length;
      case 'active':
        return habits.filter(h => h.is_active).length;
      case 'completed':
        return habits.filter(h =>
          h.logs?.some(log => log.date === today && log.status === 'completed')
        ).length;
      case 'pending':
        return habits.filter(h =>
          !h.logs?.some(log => log.date === today && log.status === 'completed')
        ).length;
      default:
        return 0;
    }
  };

  if (isLoading && habits.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">Failed to load habits</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => dispatch(fetchHabits({ is_active: true }))}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with controls */}
      {!compact && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Habits</h2>
              <p className="text-gray-600">Track and manage your daily habits</p>
            </div>

            {showCreateButton && (
              <Button
                variant="primary"
                onClick={() => setShowCreateForm(true)}
                className="sm:w-auto"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Habit
              </Button>
            )}
          </div>

          {/* Filters and sorting */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Filter tabs */}
            <div className="flex border-b border-gray-200">
              {(['all', 'pending', 'completed'] as const).map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                    filter === filterOption
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {filterOption} ({getFilterCount(filterOption)})
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="sm:ml-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="created">Sort by Created</option>
                <option value="name">Sort by Name</option>
                <option value="streak">Sort by Streak</option>
                <option value="frequency">Sort by Frequency</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingHabit) && (
        <div className="mb-6">
          <HabitForm
            habit={editingHabit}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      {/* Habits List */}
      {filteredAndSortedHabits.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No habits yet' : `No ${filter} habits`}
            </h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all'
                ? 'Start building better habits by creating your first one!'
                : `You don't have any ${filter} habits right now.`
              }
            </p>
            {filter === 'all' && showCreateButton && (
              <Button
                variant="primary"
                onClick={() => setShowCreateForm(true)}
              >
                Create Your First Habit
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className={`grid gap-4 ${compact ? 'gap-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredAndSortedHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onEdit={handleEditHabit}
              onViewDetails={onHabitSelect}
              compact={compact}
              showActions={!compact}
            />
          ))}
        </div>
      )}

      {/* Load more button if needed */}
      {isLoading && habits.length > 0 && (
        <div className="flex justify-center mt-6">
          <Spinner />
        </div>
      )}
    </div>
  );
};

export default HabitList;