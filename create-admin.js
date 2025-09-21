// Script to create admin user root/root
const bcrypt = require('bcryptjs');

// Database configuration (будет использовать те же переменные что и основное приложение)
const { Pool } = require('pg');

async function createAdminUser() {
    console.log('🔧 Creating admin user root/root...');

    // Database connection (Railway should provide these automatically)
    const pool = new Pool({
        host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
        port: process.env.DATABASE_PORT || process.env.DB_PORT || 5432,
        database: process.env.DATABASE_NAME || process.env.DB_NAME || 'habit_tracker',
        user: process.env.DATABASE_USER || process.env.DB_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || '',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        // Test connection
        console.log('📡 Connecting to database...');
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');

        // Check if root user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', ['root']);

        if (existingUser.rows.length > 0) {
            console.log('⚠️ Root user already exists, updating password...');

            // Update password
            const hashedPassword = await bcrypt.hash('root', 12);
            await pool.query(
                'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
                [hashedPassword, 'root']
            );

            console.log('✅ Root user password updated successfully');
        } else {
            console.log('👤 Creating new root user...');

            // Create new user
            const hashedPassword = await bcrypt.hash('root', 12);
            const result = await pool.query(
                `INSERT INTO users (email, password_hash, name, timezone, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 RETURNING id, email, name`,
                ['root', hashedPassword, 'Root Admin', 'UTC']
            );

            console.log('✅ Root user created successfully:', result.rows[0]);
        }

        // Show some stats
        const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
        const habitCount = await pool.query('SELECT COUNT(*) as count FROM habits');
        const logCount = await pool.query('SELECT COUNT(*) as count FROM habit_logs');

        console.log('\n📊 Database Statistics:');
        console.log(`👥 Total Users: ${userCount.rows[0].count}`);
        console.log(`🎯 Total Habits: ${habitCount.rows[0].count}`);
        console.log(`📝 Total Logs: ${logCount.rows[0].count}`);

        // Test login credentials
        console.log('\n🔐 Testing login credentials...');
        const testUser = await pool.query('SELECT id, email, name, password_hash FROM users WHERE email = $1', ['root']);

        if (testUser.rows.length > 0) {
            const isValidPassword = await bcrypt.compare('root', testUser.rows[0].password_hash);
            console.log(`✅ Login test: ${isValidPassword ? 'SUCCESS' : 'FAILED'}`);
            console.log(`📧 Email: root`);
            console.log(`🔑 Password: root`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📝 Full error:', error);

        // Additional debugging info
        console.log('\n🔍 Environment variables:');
        console.log('DATABASE_HOST:', process.env.DATABASE_HOST);
        console.log('DATABASE_PORT:', process.env.DATABASE_PORT);
        console.log('DATABASE_NAME:', process.env.DATABASE_NAME);
        console.log('DATABASE_USER:', process.env.DATABASE_USER);
        console.log('DB_HOST:', process.env.DB_HOST);
        console.log('DB_NAME:', process.env.DB_NAME);
        console.log('NODE_ENV:', process.env.NODE_ENV);

    } finally {
        await pool.end();
        console.log('🔌 Database connection closed');
    }
}

// Run if called directly
if (require.main === module) {
    require('dotenv').config();
    createAdminUser()
        .then(() => {
            console.log('\n🎉 Admin user setup complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Setup failed:', error);
            process.exit(1);
        });
}

module.exports = { createAdminUser };