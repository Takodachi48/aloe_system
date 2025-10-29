const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/database');
const { authMiddleware } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d';

console.log('Auth routes module loaded');

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes are working!' });
});

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, username } = req.body;

        // Validation
        if (!name || !email || !password || !username) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, username, email, and password'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Username validation (alphanumeric with underscores, 3-20 chars)
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                message: 'Username must be 3-20 characters long and can only contain letters, numbers, and underscores'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        const db = getDb();
        const usersCollection = db.collection('users');

        // Check if email or username already exists
        const existingUser = await usersCollection.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username: username.toLowerCase() }
            ]
        });

        if (existingUser) {
            if (existingUser.email === email.toLowerCase()) {
                return res.status(409).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            } else {
                return res.status(409).json({
                    success: false,
                    message: 'Username is already taken'
                });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = {
            name,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            isAdmin: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);

        // Generate JWT token
        const token = jwt.sign(
            { userId: result.insertedId, email: newUser.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: result.insertedId,
                username: newUser.username,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error registering user: ' + error.message
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, username, password, rememberMe } = req.body;
        
        console.log('Login attempt:', { email, username });

        // Validation
        if ((!email && !username) || !password) {
            console.log('Missing credentials');
            return res.status(400).json({
                success: false,
                message: 'Please provide email/username and password'
            });
        }

        const db = getDb();
        const usersCollection = db.collection('users');

        // Build query to find user by email or name
        const query = email 
            ? { email: email.toLowerCase() }
            : { name: username.toLowerCase() };

        // Find user
        console.log('Database query:', query);
        const user = await usersCollection.findOne(query);
        console.log('User found:', user ? 'Yes' : 'No');
        
        if (!user) {
            console.log('User not found with query:', query);
            return res.status(401).json({
                success: false,
                message: 'Invalid email/username or password'
            });
        }

        // Check if user is active
        if (user.isActive === false) {
            return res.status(403).json({
                success: false,
                message: 'Account has been deactivated. Please contact an administrator.'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Password valid:', isPasswordValid);
        
        if (!isPasswordValid) {
            console.log('Invalid password for user:', user.email || user.username);
            return res.status(401).json({
                success: false,
                message: 'Invalid email/username or password'
            });
        }

        // Update last login
        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
        );

        // Generate JWT token with user info
        const expiresIn = rememberMe ? '30d' : JWT_EXPIRES_IN;
        const token = jwt.sign(
            { 
                userId: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin || false
            },
            JWT_SECRET,
            { expiresIn }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin || false
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in'
        });
    }
});

// Verify token
router.get('/verify', authMiddleware, async (req, res) => {
    try {
        console.log('Verify endpoint hit, user from token:', req.user);
        const db = getDb();
        const usersCollection = db.collection('users');

        // Convert string ID to ObjectId
        const { ObjectId } = require('mongodb');
        const userId = new ObjectId(req.user.userId);
        
        console.log('Looking up user with ID:', userId);

        const user = await usersCollection.findOne(
            { _id: userId },
            { projection: { password: 0 } }
        );

        console.log('User found:', user ? 'YES' : 'NO');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin || false
            }
        });

    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying token'
        });
    }
});

// Logout (client-side token removal, but endpoint for consistency)
router.post('/logout', authMiddleware, (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne(
            { _id: req.user.userId },
            { projection: { password: 0 } }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile'
        });
    }
});

module.exports = router;
