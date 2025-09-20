const User = require('../models/User');
const { generateTokenPair, generatePasswordResetToken, verifyToken } = require('../utils/jwt');

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, name, timezone, telegram_id } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email address already exists',
      });
    }

    // Check if Telegram ID is already used
    if (telegram_id) {
      const existingTelegramUser = await User.findByTelegramId(telegram_id);
      if (existingTelegramUser) {
        return res.status(409).json({
          error: 'Telegram account already linked',
          message: 'This Telegram account is already linked to another user',
        });
      }
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      name,
      timezone,
      telegram_id,
    });

    // Generate tokens
    const tokens = generateTokenPair(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      ...tokens,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration',
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
    }

    // Verify password
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
    }

    // Update last active
    await user.updateLastActive();

    // Generate tokens
    const tokens = generateTokenPair(user);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login',
    });
  }
};

// Refresh access token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        message: 'Please provide a refresh token',
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, 'refresh');

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'User not found',
      });
    }

    // Generate new tokens
    const tokens = generateTokenPair(user);

    res.json({
      message: 'Tokens refreshed successfully',
      ...tokens,
    });
  } catch (error) {
    console.error('Token refresh error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Refresh token expired',
        message: 'Please login again',
      });
    }

    res.status(401).json({
      error: 'Invalid refresh token',
      message: 'Please login again',
    });
  }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        message: 'If an account with this email exists, a password reset link has been sent',
      });
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken(user);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await user.setPasswordResetToken(resetToken, expiresAt);

    // TODO: Send email with reset link
    // For now, return token in response (remove in production)
    res.json({
      message: 'If an account with this email exists, a password reset link has been sent',
      // Remove this in production:
      resetToken,
      resetLink: `http://localhost:3000/reset-password?token=${resetToken}`,
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      error: 'Password reset failed',
      message: 'An error occurred while processing password reset request',
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Verify reset token
    const decoded = verifyToken(token, 'password-reset');

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).json({
        error: 'Invalid reset token',
        message: 'Password reset token is invalid or user not found',
      });
    }

    // Change password
    await user.changePassword(password);

    // Clear reset token
    await user.clearPasswordResetToken();

    res.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Password reset error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        error: 'Reset token expired',
        message: 'Password reset token has expired, please request a new one',
      });
    }

    res.status(400).json({
      error: 'Invalid reset token',
      message: 'Password reset token is invalid',
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found',
      });
    }

    // Get user stats
    const stats = await user.getStats();

    res.json({
      user: user.toJSON(),
      stats,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'An error occurred while fetching user profile',
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found',
      });
    }

    // Update user
    await user.update(req.body);

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'An error occurred while updating user profile',
    });
  }
};

// Link Telegram account
const linkTelegram = async (req, res) => {
  try {
    const { telegram_id } = req.body;

    // Check if Telegram ID is already used
    const existingUser = await User.findByTelegramId(telegram_id);
    if (existingUser && existingUser.id !== req.user.id) {
      return res.status(409).json({
        error: 'Telegram account already linked',
        message: 'This Telegram account is already linked to another user',
      });
    }

    const user = await User.findById(req.user.id);
    await user.update({ telegram_id });

    res.json({
      message: 'Telegram account linked successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Link Telegram error:', error);
    res.status(500).json({
      error: 'Failed to link Telegram',
      message: 'An error occurred while linking Telegram account',
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  requestPasswordReset,
  resetPassword,
  getProfile,
  updateProfile,
  linkTelegram,
};