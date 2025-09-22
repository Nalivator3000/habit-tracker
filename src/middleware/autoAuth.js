const User = require('../models/User');

// Middleware to automatically authenticate as root user for demo mode
const autoAuthAsRoot = async (req, res, next) => {
  try {
    console.log('🔐 AutoAuth: Attempting to find root user...');

    // Find root user - try different approaches
    let rootUser;
    try {
      rootUser = await User.findByEmail('root');
      console.log('🔐 AutoAuth: Root user search result:', rootUser ? 'found' : 'not found');
    } catch (findError) {
      console.error('🔐 AutoAuth: Error finding user:', findError.message);
      // Try direct query to debug
      const { query } = require('../config/database');
      const result = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', ['root']);
      console.log('🔐 AutoAuth: Direct query result:', result.rows);
      if (result.rows.length > 0) {
        const User = require('../models/User');
        rootUser = new User(result.rows[0]);
        console.log('🔐 AutoAuth: Created user from direct query');
      }
    }

    if (!rootUser) {
      console.log('🔐 AutoAuth: Creating root user...');
      // Create root user if doesn't exist
      rootUser = await User.create({
        email: 'root',
        password: 'root',
        name: 'Root Admin',
        timezone: 'UTC'
      });
      console.log('✅ Root user created automatically:', rootUser.id);
    }

    // Attach root user to request
    req.user = rootUser;
    console.log('✅ AutoAuth: User attached to request:', { id: rootUser.id, email: rootUser.email });
    next();
  } catch (error) {
    console.error('❌ Auto-auth failed:', error);
    console.error('❌ Auto-auth error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Could not authenticate as root user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = autoAuthAsRoot;