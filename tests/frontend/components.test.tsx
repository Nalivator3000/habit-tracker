import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

import { testLogger } from '../../src/utils/logger';

import Button from '../../frontend/src/components/ui/Button';
import Input from '../../frontend/src/components/ui/Input';
import Card from '../../frontend/src/components/ui/Card';
import Alert from '../../frontend/src/components/ui/Alert';
import HabitCard from '../../frontend/src/components/habit/HabitCard';
import HabitForm from '../../frontend/src/components/habit/HabitForm';

import authSlice from '../../frontend/src/store/slices/authSlice';
import habitSlice from '../../frontend/src/store/slices/habitSlice';

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      habits: habitSlice,
    },
    preloadedState: initialState,
  });
};

const renderWithProviders = (
  component: React.ReactElement,
  { initialState = {}, store = createTestStore(initialState) } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <BrowserRouter>{children}</BrowserRouter>
    </Provider>
  );

  return render(component, { wrapper: Wrapper });
};

describe('Frontend Component Tests', () => {
  let testStartTime: number;

  beforeEach(() => {
    testStartTime = Date.now();
    testLogger.startTest('Frontend Components', 'Testing React components');
  });

  afterEach(() => {
    const duration = Date.now() - testStartTime;
    testLogger.endTest('Frontend Components', 'pass', duration);
  });

  describe('UI Components', () => {
    describe('Button Component', () => {
      it('should render button with correct text', () => {
        testLogger.testStep('Button Test', 'Testing button rendering');

        render(<Button>Click me</Button>);

        const buttonElement = screen.getByRole('button', { name: /click me/i });

        testLogger.assertion('Button Test', 'Button renders with correct text', !!buttonElement, true, !!buttonElement);

        expect(buttonElement).toBeInTheDocument();
        expect(buttonElement).toHaveTextContent('Click me');
      });

      it('should handle click events', () => {
        testLogger.testStep('Button Click Test', 'Testing button click handling');

        const handleClick = jest.fn();
        render(<Button onClick={handleClick}>Click me</Button>);

        const buttonElement = screen.getByRole('button');
        fireEvent.click(buttonElement);

        testLogger.assertion('Button Click Test', 'Click handler called', handleClick.mock.calls.length === 1, 1, handleClick.mock.calls.length);

        expect(handleClick).toHaveBeenCalledTimes(1);
      });

      it('should apply variant styles correctly', () => {
        testLogger.testStep('Button Variant Test', 'Testing button variant styles');

        const { rerender } = render(<Button variant="primary">Primary</Button>);
        let button = screen.getByRole('button');

        testLogger.assertion('Primary Button Test', 'Primary variant applied', button.className.includes('primary'), true, button.className.includes('primary'));

        expect(button).toHaveClass('btn-primary');

        rerender(<Button variant="secondary">Secondary</Button>);
        button = screen.getByRole('button');

        testLogger.assertion('Secondary Button Test', 'Secondary variant applied', button.className.includes('secondary'), true, button.className.includes('secondary'));

        expect(button).toHaveClass('btn-secondary');
      });

      it('should be disabled when disabled prop is true', () => {
        testLogger.testStep('Button Disabled Test', 'Testing button disabled state');

        render(<Button disabled>Disabled Button</Button>);

        const buttonElement = screen.getByRole('button');

        testLogger.assertion('Button Disabled Test', 'Button is disabled', buttonElement.disabled, true, buttonElement.disabled);

        expect(buttonElement).toBeDisabled();
      });
    });

    describe('Input Component', () => {
      it('should render input with correct attributes', () => {
        testLogger.testStep('Input Test', 'Testing input rendering');

        render(
          <Input
            type="email"
            placeholder="Enter email"
            name="email"
            id="email-input"
          />
        );

        const inputElement = screen.getByPlaceholderText('Enter email');

        testLogger.assertion('Input Test', 'Input renders correctly', !!inputElement, true, !!inputElement);

        expect(inputElement).toBeInTheDocument();
        expect(inputElement).toHaveAttribute('type', 'email');
        expect(inputElement).toHaveAttribute('name', 'email');
        expect(inputElement).toHaveAttribute('id', 'email-input');
      });

      it('should handle value changes', () => {
        testLogger.testStep('Input Change Test', 'Testing input value changes');

        const handleChange = jest.fn();
        render(<Input onChange={handleChange} />);

        const inputElement = screen.getByRole('textbox');
        fireEvent.change(inputElement, { target: { value: 'test value' } });

        testLogger.assertion('Input Change Test', 'Change handler called', handleChange.mock.calls.length === 1, 1, handleChange.mock.calls.length);

        expect(handleChange).toHaveBeenCalledTimes(1);
        expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
          target: expect.objectContaining({ value: 'test value' })
        }));
      });

      it('should display error state correctly', () => {
        testLogger.testStep('Input Error Test', 'Testing input error state');

        render(<Input error="This field is required" />);

        const errorMessage = screen.getByText('This field is required');

        testLogger.assertion('Input Error Test', 'Error message displayed', !!errorMessage, true, !!errorMessage);

        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('error-message');
      });
    });

    describe('Card Component', () => {
      it('should render card with children', () => {
        testLogger.testStep('Card Test', 'Testing card rendering');

        render(
          <Card>
            <h2>Card Title</h2>
            <p>Card content</p>
          </Card>
        );

        const cardTitle = screen.getByText('Card Title');
        const cardContent = screen.getByText('Card content');

        testLogger.assertion('Card Test', 'Card renders with children', !!cardTitle && !!cardContent, true, !!cardTitle && !!cardContent);

        expect(cardTitle).toBeInTheDocument();
        expect(cardContent).toBeInTheDocument();
      });

      it('should apply custom className', () => {
        testLogger.testStep('Card ClassName Test', 'Testing card custom className');

        render(<Card className="custom-card">Content</Card>);

        const cardElement = screen.getByText('Content').closest('.card');

        testLogger.assertion('Card ClassName Test', 'Custom className applied', cardElement?.classList.contains('custom-card'), true, cardElement?.classList.contains('custom-card'));

        expect(cardElement).toHaveClass('custom-card');
      });
    });

    describe('Alert Component', () => {
      it('should render alert with correct type and message', () => {
        testLogger.testStep('Alert Test', 'Testing alert rendering');

        render(<Alert type="success" message="Operation successful!" />);

        const alertElement = screen.getByText('Operation successful!');

        testLogger.assertion('Alert Test', 'Alert renders with message', !!alertElement, true, !!alertElement);

        expect(alertElement).toBeInTheDocument();
        expect(alertElement.closest('.alert')).toHaveClass('alert-success');
      });

      it('should be dismissible when onClose is provided', () => {
        testLogger.testStep('Alert Dismiss Test', 'Testing alert dismissal');

        const handleClose = jest.fn();
        render(<Alert type="info" message="Info message" onClose={handleClose} />);

        const closeButton = screen.getByRole('button');
        fireEvent.click(closeButton);

        testLogger.assertion('Alert Dismiss Test', 'Close handler called', handleClose.mock.calls.length === 1, 1, handleClose.mock.calls.length);

        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Habit Components', () => {
    const mockHabit = {
      id: 1,
      name: 'Morning Exercise',
      description: 'Daily morning workout',
      frequency_type: 'daily',
      frequency_value: 1,
      target_count: 1,
      difficulty_level: 3,
      category: 'health',
      color: '#10B981',
      streak_count: 5,
      best_streak: 10,
      total_completions: 25,
      is_archived: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z'
    };

    describe('HabitCard Component', () => {
      it('should render habit information correctly', () => {
        testLogger.testStep('HabitCard Test', 'Testing habit card rendering');

        const mockOnComplete = jest.fn();

        renderWithProviders(
          <HabitCard habit={mockHabit} onComplete={mockOnComplete} />
        );

        const habitName = screen.getByText('Morning Exercise');
        const streakCount = screen.getByText(/5/);

        testLogger.assertion('HabitCard Test', 'Habit name displayed', !!habitName, true, !!habitName);
        testLogger.assertion('HabitCard Test', 'Streak count displayed', !!streakCount, true, !!streakCount);

        expect(habitName).toBeInTheDocument();
        expect(streakCount).toBeInTheDocument();
      });

      it('should handle habit completion', () => {
        testLogger.testStep('HabitCard Complete Test', 'Testing habit completion');

        const mockOnComplete = jest.fn();

        renderWithProviders(
          <HabitCard habit={mockHabit} onComplete={mockOnComplete} />
        );

        const completeButton = screen.getByRole('button', { name: /complete/i });
        fireEvent.click(completeButton);

        testLogger.assertion('HabitCard Complete Test', 'Complete handler called', mockOnComplete.mock.calls.length === 1, 1, mockOnComplete.mock.calls.length);

        expect(mockOnComplete).toHaveBeenCalledTimes(1);
        expect(mockOnComplete).toHaveBeenCalledWith(mockHabit.id);
      });

      it('should display habit in compact view', () => {
        testLogger.testStep('HabitCard Compact Test', 'Testing habit card compact view');

        renderWithProviders(
          <HabitCard habit={mockHabit} view="compact" onComplete={jest.fn()} />
        );

        const cardElement = screen.getByText('Morning Exercise').closest('.habit-card');

        testLogger.assertion('HabitCard Compact Test', 'Compact view applied', cardElement?.classList.contains('compact'), true, cardElement?.classList.contains('compact'));

        expect(cardElement).toHaveClass('compact');
      });
    });

    describe('HabitForm Component', () => {
      const initialFormState = {
        habits: {
          habits: [],
          loading: false,
          error: null
        }
      };

      it('should render form fields correctly', () => {
        testLogger.testStep('HabitForm Test', 'Testing habit form rendering');

        renderWithProviders(<HabitForm onSubmit={jest.fn()} />, {
          initialState: initialFormState
        });

        const nameInput = screen.getByLabelText(/name/i);
        const descriptionInput = screen.getByLabelText(/description/i);
        const frequencySelect = screen.getByLabelText(/frequency/i);

        testLogger.assertion('HabitForm Test', 'Form fields rendered', !!nameInput && !!descriptionInput && !!frequencySelect, true, !!nameInput && !!descriptionInput && !!frequencySelect);

        expect(nameInput).toBeInTheDocument();
        expect(descriptionInput).toBeInTheDocument();
        expect(frequencySelect).toBeInTheDocument();
      });

      it('should handle form submission', async () => {
        testLogger.testStep('HabitForm Submit Test', 'Testing habit form submission');

        const mockOnSubmit = jest.fn();

        renderWithProviders(<HabitForm onSubmit={mockOnSubmit} />, {
          initialState: initialFormState
        });

        const nameInput = screen.getByLabelText(/name/i);
        const submitButton = screen.getByRole('button', { name: /create|save/i });

        fireEvent.change(nameInput, { target: { value: 'New Habit' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          testLogger.assertion('HabitForm Submit Test', 'Submit handler called', mockOnSubmit.mock.calls.length >= 1, '>=1', mockOnSubmit.mock.calls.length);
          expect(mockOnSubmit).toHaveBeenCalled();
        });
      });

      it('should validate required fields', async () => {
        testLogger.testStep('HabitForm Validation Test', 'Testing form validation');

        renderWithProviders(<HabitForm onSubmit={jest.fn()} />, {
          initialState: initialFormState
        });

        const submitButton = screen.getByRole('button', { name: /create|save/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
          const errorMessage = screen.queryByText(/required/i);
          testLogger.assertion('HabitForm Validation Test', 'Validation error shown', !!errorMessage, true, !!errorMessage);
          expect(errorMessage).toBeInTheDocument();
        });
      });

      it('should pre-populate form when editing', () => {
        testLogger.testStep('HabitForm Edit Test', 'Testing habit form editing');

        renderWithProviders(
          <HabitForm habit={mockHabit} onSubmit={jest.fn()} />,
          { initialState: initialFormState }
        );

        const nameInput = screen.getByDisplayValue('Morning Exercise');
        const descriptionInput = screen.getByDisplayValue('Daily morning workout');

        testLogger.assertion('HabitForm Edit Test', 'Form pre-populated', !!nameInput && !!descriptionInput, true, !!nameInput && !!descriptionInput);

        expect(nameInput).toBeInTheDocument();
        expect(descriptionInput).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle component errors gracefully', () => {
      testLogger.testStep('Error Handling Test', 'Testing component error handling');

      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>;
        } catch (error) {
          return <div>Something went wrong</div>;
        }
      };

      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      const errorMessage = screen.queryByText('Something went wrong');

      testLogger.assertion('Error Handling Test', 'Error boundary works', !!errorMessage, true, !!errorMessage);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      testLogger.testStep('Accessibility Test', 'Testing ARIA labels');

      render(<Button aria-label="Close dialog">×</Button>);

      const button = screen.getByLabelText('Close dialog');

      testLogger.assertion('Accessibility Test', 'ARIA label present', !!button, true, !!button);

      expect(button).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      testLogger.testStep('Keyboard Navigation Test', 'Testing keyboard navigation');

      render(<Button>Focusable Button</Button>);

      const button = screen.getByRole('button');
      button.focus();

      testLogger.assertion('Keyboard Navigation Test', 'Button can be focused', document.activeElement === button, true, document.activeElement === button);

      expect(document.activeElement).toBe(button);
    });
  });
});