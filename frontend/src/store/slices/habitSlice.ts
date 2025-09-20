import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Habit, HabitLog, CreateHabitRequest, LogHabitRequest, HabitOverview } from '../../types/habit';
import habitService from '../../services/habitService';

interface HabitState {
  habits: Habit[];
  currentHabit: Habit | null;
  logs: HabitLog[];
  overview: HabitOverview | null;
  todayLogs: any | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: HabitState = {
  habits: [],
  currentHabit: null,
  logs: [],
  overview: null,
  todayLogs: null,
  isLoading: false,
  error: null,
};

// Async thunks for habits
export const fetchHabits = createAsyncThunk(
  'habits/fetchHabits',
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const response = await habitService.getHabits(params);
      return response.habits;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch habits');
    }
  }
);

export const createHabit = createAsyncThunk(
  'habits/createHabit',
  async (habitData: CreateHabitRequest, { rejectWithValue }) => {
    try {
      const response = await habitService.createHabit(habitData);
      return response.habit;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create habit');
    }
  }
);

export const updateHabit = createAsyncThunk(
  'habits/updateHabit',
  async ({ id, data }: { id: string; data: Partial<Habit> }, { rejectWithValue }) => {
    try {
      const response = await habitService.updateHabit(id, data);
      return response.habit;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update habit');
    }
  }
);

export const deleteHabit = createAsyncThunk(
  'habits/deleteHabit',
  async (id: string, { rejectWithValue }) => {
    try {
      await habitService.deleteHabit(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete habit');
    }
  }
);

export const fetchHabitOverview = createAsyncThunk(
  'habits/fetchOverview',
  async (_, { rejectWithValue }) => {
    try {
      const response = await habitService.getHabitOverview();
      return response.overview;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch overview');
    }
  }
);

export const logHabitCompletion = createAsyncThunk(
  'habits/logCompletion',
  async ({ habitId, logData }: { habitId: string; logData: LogHabitRequest }, { rejectWithValue }) => {
    try {
      const response = await habitService.logHabitCompletion(habitId, logData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to log habit completion');
    }
  }
);

export const fetchTodayLogs = createAsyncThunk(
  'habits/fetchTodayLogs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await habitService.getTodayLogs();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch today logs');
    }
  }
);

// Habit slice
const habitSlice = createSlice({
  name: 'habits',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentHabit: (state, action: PayloadAction<Habit | null>) => {
      state.currentHabit = action.payload;
    },
    updateHabitInList: (state, action: PayloadAction<Habit>) => {
      const index = state.habits.findIndex(h => h.id === action.payload.id);
      if (index !== -1) {
        state.habits[index] = action.payload;
      }
    },
    removeHabitFromList: (state, action: PayloadAction<string>) => {
      state.habits = state.habits.filter(h => h.id !== action.payload);
    },
    addHabitToList: (state, action: PayloadAction<Habit>) => {
      state.habits.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    // Fetch Habits
    builder
      .addCase(fetchHabits.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHabits.fulfilled, (state, action) => {
        state.isLoading = false;
        state.habits = action.payload;
        state.error = null;
      })
      .addCase(fetchHabits.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Habit
    builder
      .addCase(createHabit.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createHabit.fulfilled, (state, action) => {
        state.isLoading = false;
        state.habits.unshift(action.payload);
        state.error = null;
      })
      .addCase(createHabit.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Habit
    builder
      .addCase(updateHabit.fulfilled, (state, action) => {
        const index = state.habits.findIndex(h => h.id === action.payload.id);
        if (index !== -1) {
          state.habits[index] = action.payload;
        }
        if (state.currentHabit?.id === action.payload.id) {
          state.currentHabit = action.payload;
        }
      });

    // Delete Habit
    builder
      .addCase(deleteHabit.fulfilled, (state, action) => {
        state.habits = state.habits.filter(h => h.id !== action.payload);
        if (state.currentHabit?.id === action.payload) {
          state.currentHabit = null;
        }
      });

    // Fetch Overview
    builder
      .addCase(fetchHabitOverview.fulfilled, (state, action) => {
        state.overview = action.payload;
      });

    // Log Habit Completion
    builder
      .addCase(logHabitCompletion.fulfilled, (state, action) => {
        // Update habit streak and completions
        const habitId = action.payload.log.habit_id;
        const habitIndex = state.habits.findIndex(h => h.id === habitId);
        if (habitIndex !== -1 && action.payload.habit) {
          state.habits[habitIndex] = {
            ...state.habits[habitIndex],
            ...action.payload.habit,
          };
        }
      });

    // Fetch Today Logs
    builder
      .addCase(fetchTodayLogs.fulfilled, (state, action) => {
        state.todayLogs = action.payload;
      });
  },
});

export const {
  clearError,
  setCurrentHabit,
  updateHabitInList,
  removeHabitFromList,
  addHabitToList,
} = habitSlice.actions;

export default habitSlice.reducer;