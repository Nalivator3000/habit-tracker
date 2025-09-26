#!/usr/bin/env node

// Authentication Testing Script
console.log('🧪 Starting authentication tests...\n');

const BASE_URL = 'https://habit-tracker-production-88f5.up.railway.app';

// Test data
const testUser = {
    name: 'Test User Auth',
    email: 'testauth@example.com',
    password: 'TestPassword123'
};

let accessToken = null;
let userId = null;

// Helper function for making requests
async function makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (accessToken) {
        defaultOptions.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    console.log(`📡 ${finalOptions.method || 'GET'} ${url}`);

    try {
        const response = await fetch(url, finalOptions);
        const data = await response.json();

        console.log(`📋 Status: ${response.status} ${response.statusText}`);
        console.log(`📋 Response:`, JSON.stringify(data, null, 2));

        return { response, data };
    } catch (error) {
        console.error(`❌ Request failed:`, error.message);
        return { error };
    }
}

// Test 1: Register new user
async function testRegistration() {
    console.log('\n🔐 TEST 1: User Registration');
    console.log('=' .repeat(40));

    const { response, data, error } = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(testUser)
    });

    if (error) {
        console.log('❌ Registration test failed');
        return false;
    }

    if (response.status === 201) {
        accessToken = data.accessToken;
        userId = data.user.id;
        console.log('✅ Registration successful');
        console.log(`👤 User ID: ${userId}`);
        console.log(`🎫 Token: ${accessToken?.substring(0, 20)}...`);
        return true;
    } else if (response.status === 409) {
        console.log('ℹ️ User already exists, proceeding to login test');
        return true;
    } else {
        console.log('❌ Registration failed');
        return false;
    }
}

// Test 2: Login user
async function testLogin() {
    console.log('\n🔐 TEST 2: User Login');
    console.log('=' .repeat(40));

    const { response, data, error } = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: testUser.email,
            password: testUser.password
        })
    });

    if (error) {
        console.log('❌ Login test failed');
        return false;
    }

    if (response.status === 200) {
        accessToken = data.accessToken;
        userId = data.user.id;
        console.log('✅ Login successful');
        console.log(`👤 User ID: ${userId}`);
        console.log(`🎫 Token: ${accessToken?.substring(0, 20)}...`);
        return true;
    } else {
        console.log('❌ Login failed');
        return false;
    }
}

// Test 3: Access protected route (habits)
async function testProtectedRoute() {
    console.log('\n🔐 TEST 3: Protected Route Access');
    console.log('=' .repeat(40));

    if (!accessToken) {
        console.log('❌ No access token available');
        return false;
    }

    const { response, data, error } = await makeRequest('/api/habits');

    if (error) {
        console.log('❌ Protected route test failed');
        return false;
    }

    if (response.status === 200) {
        console.log('✅ Protected route access successful');
        console.log(`📊 Habits count: ${data.habits?.length || 0}`);
        return true;
    } else {
        console.log('❌ Protected route access failed');
        return false;
    }
}

// Test 4: Access route without token
async function testUnauthorizedAccess() {
    console.log('\n🔐 TEST 4: Unauthorized Access');
    console.log('=' .repeat(40));

    const originalToken = accessToken;
    accessToken = null; // Remove token

    const { response, data, error } = await makeRequest('/api/habits');

    accessToken = originalToken; // Restore token

    if (error) {
        console.log('❌ Unauthorized access test failed');
        return false;
    }

    if (response.status === 401) {
        console.log('✅ Unauthorized access correctly blocked');
        return true;
    } else {
        console.log('❌ Unauthorized access should have been blocked');
        return false;
    }
}

// Test 5: Create a habit with authenticated user
async function testHabitCreation() {
    console.log('\n🔐 TEST 5: Authenticated Habit Creation');
    console.log('=' .repeat(40));

    if (!accessToken) {
        console.log('❌ No access token available');
        return false;
    }

    const habitData = {
        name: 'Auth Test Habit',
        description: 'Habit created during authentication testing',
        frequency_type: 'daily',
        target_count: 1,
        difficulty_level: 3,
        color: '#10B981'
    };

    const { response, data, error } = await makeRequest('/api/habits', {
        method: 'POST',
        body: JSON.stringify(habitData)
    });

    if (error) {
        console.log('❌ Habit creation test failed');
        return false;
    }

    if (response.status === 201) {
        console.log('✅ Habit creation successful');
        console.log(`🎯 Habit ID: ${data.habit?.id}`);
        return true;
    } else {
        console.log('❌ Habit creation failed');
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Authentication System Test Suite');
    console.log('🔗 Base URL:', BASE_URL);
    console.log('=' .repeat(50));

    const tests = [
        { name: 'Registration', fn: testRegistration },
        { name: 'Login', fn: testLogin },
        { name: 'Protected Route Access', fn: testProtectedRoute },
        { name: 'Unauthorized Access', fn: testUnauthorizedAccess },
        { name: 'Authenticated Habit Creation', fn: testHabitCreation }
    ];

    const results = [];

    for (const test of tests) {
        try {
            const result = await test.fn();
            results.push({ name: test.name, passed: result });

            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`❌ Test "${test.name}" threw an error:`, error.message);
            results.push({ name: test.name, passed: false, error: error.message });
        }
    }

    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('=' .repeat(50));

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    results.forEach(result => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${result.name}`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });

    console.log(`\n🏆 Results: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log('🎉 All authentication tests passed!');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed. Please check the authentication system.');
        process.exit(1);
    }
}

// Handle fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
    console.log('📦 Installing fetch polyfill...');
    global.fetch = require('node-fetch');
}

runAllTests().catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
});