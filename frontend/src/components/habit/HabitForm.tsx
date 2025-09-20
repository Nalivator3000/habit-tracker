import React, { useState, useEffect } from 'react';
import { Habit, CreateHabitRequest } from '../../types/habit';
import { Button, Input, Card } from '../ui';
import { useAppDispatch } from '../../store';
import { createHabit, updateHabit } from '../../store/slices/habitSlice';

interface HabitFormProps {
  habit?: Habit | null;
  onSuccess?: (habit: Habit) => void;
  onCancel?: () => void;
  className?: string;
}

const defaultColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

const HabitForm: React.FC<HabitFormProps> = ({
  habit,
  onSuccess,
  onCancel,
  className = ''
}) => {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateHabitRequest>({
    name: '',
    description: '',
    color: defaultColors[0],
    frequency_type: 'daily',
    frequency_value: 1,
    target_count: 1,
    difficulty_level: 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with habit data for editing
  useEffect(() => {
    if (habit) {
      setFormData({
        name: habit.name,
        description: habit.description || '',
        color: habit.color || defaultColors[0],
        frequency_type: habit.frequency_type,
        frequency_value: habit.frequency_value || 1,
        target_count: habit.target_count || 1,
        difficulty_level: habit.difficulty_level || 1,
      });
    }
  }, [habit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? parseInt(value) || 0 : value;

    setFormData(prev => ({ ...prev, [name]: finalValue }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Habit name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Habit name must be at least 2 characters';
    }

    if (formData.frequency_value < 1) {
      newErrors.frequency_value = 'Frequency must be at least 1';
    }

    if (formData.target_count < 1) {
      newErrors.target_count = 'Target count must be at least 1';
    }

    if (formData.difficulty_level && (formData.difficulty_level < 1 || formData.difficulty_level > 5)) {
      newErrors.difficulty_level = 'Difficulty must be between 1 and 5';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      let resultHabit: Habit;

      if (habit) {
        // Update existing habit
        const response = await dispatch(updateHabit({
          id: habit.id,
          data: formData
        })).unwrap();
        resultHabit = response;
      } else {
        // Create new habit
        const response = await dispatch(createHabit(formData)).unwrap();
        resultHabit = response;
      }

      onSuccess?.(resultHabit);

      // Reset form if creating new habit
      if (!habit) {
        setFormData({
          name: '',
          description: '',
          color: defaultColors[0],
          frequency_type: 'daily',
          frequency_value: 1,
          target_count: 1,
          difficulty_level: 1,
        });
      }
    } catch (error: any) {
      console.error('Failed to save habit:', error);
      // Error is handled by Redux slice
    } finally {
      setIsLoading(false);
    }
  };

  const getFrequencyOptions = () => {
    return [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'custom', label: 'Custom (every N days)' },
    ];
  };

  const getFrequencyLabel = () => {
    switch (formData.frequency_type) {
      case 'daily':
        return 'Times per day';
      case 'weekly':
        return 'Times per week';
      case 'monthly':
        return 'Times per month';
      case 'custom':
        return 'Every N days';
      default:
        return 'Frequency';
    }
  };

  return (
    <Card className={className}>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {habit ? 'Edit Habit' : 'Create New Habit'}
          </h2>
          <p className="text-gray-600 mt-1">
            {habit ? 'Update your habit details' : 'Add a new habit to track your progress'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Habit Name */}
          <Input
            label="Habit Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="e.g., Morning Exercise, Read for 30 minutes"
            required
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              placeholder="Describe your habit and why it's important to you..."
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Color
            </label>
            <div className="flex items-center space-x-3">
              {defaultColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? 'border-gray-400 scale-110'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Frequency Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frequency Type
            </label>
            <select
              name="frequency_type"
              value={formData.frequency_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              {getFrequencyOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency Value */}
          <Input
            label={getFrequencyLabel()}
            name="frequency_value"
            type="number"
            min="1"
            value={formData.frequency_value.toString()}
            onChange={handleChange}
            error={errors.frequency_value}
            required
          />

          {/* Target Count */}
          {formData.frequency_type !== 'custom' && (
            <Input
              label="Daily Target"
              name="target_count"
              type="number"
              min="1"
              value={formData.target_count.toString()}
              onChange={handleChange}
              error={errors.target_count}
              placeholder="How many times per day?"
              required
            />
          )}

          {/* Difficulty Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Difficulty Level (Optional)
            </label>
            <div className="flex items-center space-x-3">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, difficulty_level: level }))}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all ${
                    formData.difficulty_level === level
                      ? 'border-orange-400 bg-orange-50 text-orange-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                  title={`Difficulty ${level}/5`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              1 = Very Easy, 5 = Very Challenging
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {habit ? 'Update Habit' : 'Create Habit'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};

export default HabitForm;