// Middleware to automatically authenticate as root user for demo mode
const autoAuthAsRoot = async (req, res, next) => {
  try {
    console.log('🔐 AutoAuth: Attempting to find root user...');

    const { query } = require('../config/database');

    // Direct database query to find root user
    const result = await query('SELECT * FROM users WHERE email = $1 AND (is_active IS NULL OR is_active = true) LIMIT 1', ['root']);
    console.log('🔐 AutoAuth: Direct query result rows:', result.rows.length);

    let rootUser;
    if (result.rows.length > 0) {
      // Create simple user object directly
      rootUser = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name,
        is_active: result.rows[0].is_active !== false,
        created_at: result.rows[0].created_at,
        toJSON: function() {
          return {
            id: this.id,
            email: this.email,
            name: this.name,
            is_active: this.is_active,
            created_at: this.created_at
          };
        }
      };
      console.log('✅ AutoAuth: Found root user:', { id: rootUser.id, email: rootUser.email });
    } else {
      console.log('🔐 AutoAuth: Creating root user...');
      // Create root user directly with query
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('root', 10);

      const createResult = await query(
        'INSERT INTO users (email, password_hash, name, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
        ['root', hashedPassword, 'Root Admin', true]
      );

      rootUser = {
        id: createResult.rows[0].id,
        email: createResult.rows[0].email,
        name: createResult.rows[0].name,
        is_active: true,
        created_at: createResult.rows[0].created_at,
        toJSON: function() {
          return {
            id: this.id,
            email: this.email,
            name: this.name,
            is_active: this.is_active,
            created_at: this.created_at
          };
        }
      };
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