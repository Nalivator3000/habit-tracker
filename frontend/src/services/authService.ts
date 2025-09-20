import apiService from './api';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  User,
} from '../types/auth';

class AuthService {
  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/login', credentials);

    // Store tokens
    if (response.accessToken) {
      apiService.setAccessToken(response.accessToken);
    }
    if (response.refreshToken) {
      apiService.setRefreshToken(response.refreshToken);
    }

    return response;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/register', userData);

    // Store tokens
    if (response.accessToken) {
      apiService.setAccessToken(response.accessToken);
    }
    if (response.refreshToken) {
      apiService.setRefreshToken(response.refreshToken);
    }

    return response;
  }

  async logout(): Promise<void> {
    apiService.clearTokens();
  }

  async refreshToken(refreshTokenData: RefreshTokenRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/refresh', refreshTokenData);

    if (response.accessToken) {
      apiService.setAccessToken(response.accessToken);
    }
    if (response.refreshToken) {
      apiService.setRefreshToken(response.refreshToken);
    }

    return response;
  }

  // Profile management
  async getProfile(): Promise<{ user: User; stats: any }> {
    return apiService.get('/auth/profile');
  }

  async updateProfile(updateData: Partial<User>): Promise<{ message: string; user: User }> {
    return apiService.put('/auth/profile', updateData);
  }

  // Password management
  async requestPasswordReset(data: PasswordResetRequest): Promise<{ message: string }> {
    return apiService.post('/auth/forgot-password', data);
  }

  async resetPassword(data: PasswordResetConfirm): Promise<{ message: string }> {
    return apiService.post('/auth/reset-password', data);
  }

  // Telegram integration
  async linkTelegram(telegramId: number): Promise<{ message: string; user: User }> {
    return apiService.post('/auth/link-telegram', { telegram_id: telegramId });
  }

  // Token utilities
  isAuthenticated(): boolean {
    const token = apiService.getAccessToken();
    if (!token) return false;

    try {
      // Check if token is expired (basic check)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  getCurrentUser(): User | null {
    const token = apiService.getAccessToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        // Other fields will be fetched from profile endpoint
      } as User;
    } catch {
      return null;
    }
  }

  getAccessToken(): string | null {
    return apiService.getAccessToken();
  }

  getRefreshToken(): string | null {
    return apiService.getRefreshToken();
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;