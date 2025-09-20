const jwt = require('jsonwebtoken');
const config = require('../config');

// Generate access token
const generateAccessToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    type: 'access',
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: 'habit-tracker',
    audience: 'habit-tracker-users',
  });
};

// Generate refresh token (longer expiry)
const generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    type: 'refresh',
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '7d', // 7 days
    issuer: 'habit-tracker',
    audience: 'habit-tracker-users',
  });
};

// Generate password reset token
const generatePasswordResetToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    type: 'password-reset',
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '1h', // 1 hour
    issuer: 'habit-tracker',
    audience: 'habit-tracker-users',
  });
};

// Verify token
const verifyToken = (token, expectedType = null) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'habit-tracker',
      audience: 'habit-tracker-users',
    });

    if (expectedType && decoded.type !== expectedType) {
      throw new Error(`Invalid token type. Expected ${expectedType}, got ${decoded.type}`);
    }

    return decoded;
  } catch (error) {
    throw error;
  }
};

// Decode token without verification (for debugging)
const decodeToken = (token) => {
  return jwt.decode(token, { complete: true });
};

// Generate both access and refresh tokens
const generateTokenPair = (user) => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
    expiresIn: config.jwt.expiresIn,
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generatePasswordResetToken,
  generateTokenPair,
  verifyToken,
  decodeToken,
};