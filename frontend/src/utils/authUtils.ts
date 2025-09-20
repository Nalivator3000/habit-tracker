import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setCredentials, clearCredentials } from '../store/slices/authSlice';
import authService from '../services/authService';

// Hook to initialize auth state from localStorage
export const useAuthInit = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector(state => state.auth);

  useEffect(() => {
    const initAuth = () => {
      const accessToken = authService.getAccessToken();
      const refreshToken = authService.getRefreshToken();

      if (accessToken && refreshToken) {
        try {
          // Basic token validation
          const user = authService.getCurrentUser();
          if (user && authService.isAuthenticated()) {
            dispatch(setCredentials({
              user,
              accessToken,
              refreshToken,
            }));
          } else {
            // Token is invalid, clear credentials
            dispatch(clearCredentials());
            authService.logout();
          }
        } catch (error) {
          // Error parsing token, clear credentials
          dispatch(clearCredentials());
          authService.logout();
        }
      }
    };

    if (!isAuthenticated) {
      initAuth();
    }
  }, [dispatch, isAuthenticated]);
};

// Utility function to get user info from token
export const getUserFromToken = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
};

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch {
    return true;
  }
};

// Format time remaining until token expires
export const getTokenTimeRemaining = (token: string): string | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();
    const timeRemaining = expirationTime - currentTime;

    if (timeRemaining <= 0) {
      return 'Expired';
    }

    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  } catch {
    return null;
  }
};