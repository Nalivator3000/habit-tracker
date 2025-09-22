const User = require('../models/User');

// Middleware to automatically authenticate as root user for demo mode
const autoAuthAsRoot = async (req, res, next) => {
  try {
    // Find or create root user
    let rootUser = await User.findByEmail('root');

    if (!rootUser) {
      // Create root user if doesn't exist
      rootUser = await User.create({
        email: 'root',
        password: 'root',
        name: 'Root Admin',
        timezone: 'UTC'
      });
      console.log('✅ Root user created automatically');
    }

    // Attach root user to request
    req.user = rootUser;
    next();
  } catch (error) {
    console.error('❌ Auto-auth failed:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Could not authenticate as root user'
    });
  }
};

module.exports = autoAuthAsRoot;