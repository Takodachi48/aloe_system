const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/database');
const { authMiddleware } = require('../middleware/auth');
const { generateVerificationToken } = require('../utils/tokenUtils');
const { sendVerificationEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d';
const EMAIL_VERIFICATION_ENABLED = process.env.EMAIL_VERIFICATION_ENABLED === 'true';

console.log('Auth routes module loaded');

// Test routes
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes are working!' });
});

// Test update-username route
router.get('/test-update-username', (req, res) => {
    console.log('Test update-username route hit');
    res.json({ success: true, message: 'Test route works' });
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

        // Generate email verification token
        const emailVerificationToken = generateVerificationToken();
        const emailVerificationExpires = new Date();
        emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24); // 24 hours expiry

        // Create user
        const newUser = {
            name,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            isAdmin: false,
            isActive: true,
            isEmailVerified: false,
            emailVerificationToken,
            emailVerificationExpires,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);
        const userId = result.insertedId;

        // If email verification is enabled, send verification email
        if (EMAIL_VERIFICATION_ENABLED) {
            try {
                await sendVerificationEmail(newUser, emailVerificationToken);
                console.log(`Verification email sent to ${newUser.email}`);
            } catch (emailError) {
                console.error('Failed to send verification email:', emailError);
                // Continue with registration even if email sending fails
            }
        }

        // Generate JWT token with limited permissions until email is verified
        const tokenPayload = {
            userId: userId,
            email: newUser.email,
            isVerified: false // Indicates email is not verified yet
        };
        
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        const response = {
            success: true,
            message: EMAIL_VERIFICATION_ENABLED 
                ? 'Registration successful! Please check your email to verify your account.' 
                : 'User registered successfully',
            requiresVerification: EMAIL_VERIFICATION_ENABLED,
            user: {
                id: userId,
                username: newUser.username,
                name: newUser.name,
                email: newUser.email,
                isEmailVerified: false
            }
        };

        // Only include token in response if email verification is disabled
        if (!EMAIL_VERIFICATION_ENABLED) {
            response.token = token;
        }

        res.status(201).json(response);

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

// Verify email with token
router.get('/verify-email/:token', async (req, res) => {
    try {
        console.log('Email verification attempt with token:', req.params.token);
        const { token } = req.params;
        const db = getDb();
        const usersCollection = db.collection('users');

        // Find user with matching verification token
        console.log('Searching for user with token...');
        const user = await usersCollection.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() }
        });

        if (!user) {
            console.log('No user found with this token or token expired');
            // Try to find if token exists but is expired
            const expiredUser = await usersCollection.findOne({
                emailVerificationToken: token
            });
            
            if (expiredUser) {
                console.log('Token exists but is expired');
                return res.status(400).json({
                    success: false,
                    message: 'Verification link has expired. Please request a new one.'
                });
            }
            
            return res.status(400).json({
                success: false,
                message: 'Invalid verification token.'
            });
        }

        console.log('User found, updating verification status...');
        // Update user as verified
        const result = await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    isEmailVerified: true,
                    updatedAt: new Date()
                },
                $unset: {
                    emailVerificationToken: "",
                    emailVerificationExpires: ""
                }
            }
        );

        // Generate new JWT with verified status
        const tokenPayload = {
            userId: user._id,
            email: user.email,
            isVerified: true,
            isAdmin: user.isAdmin || false
        };
        
        const authToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        res.json({
            success: true,
            message: 'Email verified successfully!',
            token: authToken,
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                isEmailVerified: true
            }
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while verifying your email.'
        });
    }
});

// Resend verification email
router.post('/resend-verification', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const usersCollection = db.collection('users');
        
        // Get user from database
        const user = await usersCollection.findOne({ _id: req.user.userId });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }
        
        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email is already verified.'
            });
        }
        
        // Generate new verification token
        const emailVerificationToken = generateVerificationToken();
        const emailVerificationExpires = new Date();
        emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);
        
        // Update user with new token
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    emailVerificationToken,
                    emailVerificationExpires,
                    updatedAt: new Date()
                }
            }
        );
        
        // Send verification email
        await sendVerificationEmail(user, emailVerificationToken);
        
        res.json({
            success: true,
            message: 'Verification email has been resent. Please check your email.'
        });
        
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend verification email.'
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

        // Build query to find user by email or username
        const query = email 
            ? { email: email.toLowerCase() }
            : { username: username.toLowerCase() };

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

        // Check if user exists and is active
        if (!user || !user.isActive) {
            console.log('Login failed: User not found or inactive');
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials or account is inactive'
            });
        }

        // Check email verification status
        console.log('User verification status:', {
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            verificationRequired: EMAIL_VERIFICATION_ENABLED
        });

        if (EMAIL_VERIFICATION_ENABLED && !user.isEmailVerified) {
            console.log('Login blocked: Email not verified');
            return res.status(403).json({
                success: false,
                requiresVerification: true,
                message: 'Please verify your email address before logging in. Check your email for a verification link.'
            });
        }

        // Check if email is verified if verification is enabled
        if (EMAIL_VERIFICATION_ENABLED && !user.isEmailVerified) {
            return res.status(403).json({
                success: false,
                requiresVerification: true,
                message: 'Please verify your email address before logging in. Check your email for a verification link.'
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

        // Include profile picture in the response if it exists
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin || false
        };

        if (user.profilePicture) {
            userResponse.profilePicture = user.profilePicture;
        }

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: userResponse
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
// Debug log all routes
console.log('Registered auth routes:');
console.log('- POST /auth/update-username');
console.log('- POST /auth/update-profile');
console.log('- POST /auth/update-password');

// Update profile name
router.post('/update-profile', authMiddleware, async (req, res) => {
    try {
        console.log('Update profile request received:', { 
            userId: req.user?.userId,
            body: req.body 
        });
        
        const { name } = req.body;
        const userId = req.user.userId;

        // Validation
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid name'
            });
        }
        
        // Clean up the name
        const cleanName = name.trim();
        
        // Name validation (allow letters, numbers, spaces, hyphens, and apostrophes)
        const nameRegex = /^[a-zA-Z0-9\s'-]+$/;
        if (!nameRegex.test(cleanName)) {
            return res.status(400).json({
                success: false,
                message: 'Name can only contain letters, numbers, spaces, hyphens, and apostrophes'
            });
        }

        const db = getDb();
        const usersCollection = db.collection('users');

        const { ObjectId } = require('mongodb');
        
        // Convert userId to ObjectId
        let userIdObj;
        try {
            userIdObj = new ObjectId(userId);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }
        
        // First get the current user data
        const currentUser = await usersCollection.findOne({ _id: userIdObj });
        
        if (!currentUser) {
            console.error('User not found with ID:', userId);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('Updating username for user:', currentUser.email);
        
        // Update the name in the database
        const result = await usersCollection.updateOne(
            { _id: userIdObj },
            { 
                $set: { 
                    name: cleanName,
                    updatedAt: new Date() 
                } 
            }
        );
        
        console.log('Update result:', result);

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found during update'
            });
        }

        // Generate new token with updated name
        const token = jwt.sign(
            { 
                userId: currentUser._id, 
                email: currentUser.email, 
                name: cleanName,
                isAdmin: currentUser.isAdmin || false 
            }, 
            JWT_SECRET, 
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Get updated user data
        const updatedUser = await usersCollection.findOne({ _id: userIdObj });
        
        if (!updatedUser) {
            console.error('Failed to fetch updated user data after update');
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch updated user data' 
            });
        }

        // Format user data for response
        const userResponse = {
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email
        };

        console.log('Sending response with user data:', userResponse);
        console.log('New token generated with name:', cleanName);

        // Return success response with new token and user data
        res.json({
            success: true,
            message: 'Name updated successfully',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Error updating name:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating name: ' + error.message
        });
    }
});

// Update password
router.post('/update-password', authMiddleware, async (req, res) => {
    try {
        console.log('Update password request received');
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;
        
        console.log('User ID from token:', userId);
        console.log('Request body:', { currentPassword, newPassword: newPassword ? '***' : 'undefined' });

        // Validation
        if (!currentPassword || !newPassword) {
            console.log('Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'Please provide both current and new password'
            });
        }

        if (newPassword.length < 6) {
            console.log('Password too short');
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        const db = getDb();
        const usersCollection = db.collection('users');
        
        // Convert userId to ObjectId
        const ObjectId = require('mongodb').ObjectId;
        const userIdObj = new ObjectId(userId);
        
        console.log('Looking for user with ID:', userIdObj);

        // Get user
        const user = await usersCollection.findOne({ _id: userIdObj });
        console.log('User found:', user ? 'Yes' : 'No');
        
        if (!user) {
            console.log('User not found in database');
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        console.log('Verifying current password...');
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        console.log('Password valid:', isPasswordValid);
        
        if (!isPasswordValid) {
            console.log('Current password is incorrect');
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        console.log('Hashing new password...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        console.log('Updating password in database...');
        const result = await usersCollection.updateOne(
            { _id: userIdObj },
            { 
                $set: { 
                    password: hashedPassword,
                    updatedAt: new Date() 
                } 
            }
        );
        
        console.log('Update result:', result);

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating password: ' + error.message
        });
    }
});

// Verify token - UPDATED to include profile picture
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

        // Prepare user response with profile picture
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            isAdmin: user.isAdmin || false
        };

        // Include profile picture if it exists
        if (user.profilePicture) {
            userResponse.profilePicture = user.profilePicture;
            console.log('Included profile picture in response:', user.profilePicture);
        } else {
            console.log('No profile picture found for user');
        }

        console.log('Sending user response:', userResponse);
        res.json({
            success: true,
            user: userResponse
        });

    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying token: ' + error.message
        });
    }
});

// Get current user data
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

        // Prepare user response with profile picture if available
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            isAdmin: user.isAdmin || false
        };

        if (user.profilePicture) {
            userResponse.profilePicture = user.profilePicture;
        }

        res.json({
            success: true,
            user: userResponse
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
