const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'cumta_super_secret_key_2026_suburban_qa';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Register User (Admin Only)
router.post('/register', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const userCheck = await db.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, passwordHash, role]
    );

    const newUser = result.rows[0];
    await logAction(req.user.id, req.user.username, 'CREATE_USER', 'users', newUser.id, `Created user: ${username} with role ${role}`);

    return res.status(201).json(newUser);
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    await logAction(user.id, user.username, 'LOGIN', 'users', user.id, 'User logged in successfully');

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
});

// Get Current User details
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Password Reset (Change Password)
router.post('/reset-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new passwords are required' });
  }

  try {
    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, req.user.id]);
    await logAction(req.user.id, req.user.username, 'RESET_PASSWORD', 'users', req.user.id, 'User password changed successfully');

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password reset error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin-level users fetch for Admin Panel
router.get('/users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, email, role, created_at FROM users ORDER BY id ASC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const targetId = parseInt(req.params.id);

  if (targetId === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  try {
    const checkRes = await db.query('SELECT username FROM users WHERE id = $1', [targetId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await db.query('DELETE FROM users WHERE id = $1', [targetId]);
    await logAction(req.user.id, req.user.username, 'DELETE_USER', 'users', targetId, `Deleted user ${checkRes.rows[0].username}`);
    
    return res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Temporary Database Debug & Manual Seeder Trigger
router.get('/debug-db', async (req, res) => {
  try {
    const dbType = db.isSQLite() ? 'SQLite' : 'PostgreSQL';
    
    // Check database connection and users count
    const usersCheck = await db.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(usersCheck.rows[0].count || usersCheck.rows[0].COUNT || 0);
    
    const usersList = await db.query('SELECT id, username, email, role FROM users');
    
    let seedResult = 'No seeding needed, users already exist';
    if (userCount === 0) {
      const seed = require('../seed');
      await seed();
      seedResult = 'Seeding triggered successfully';
    }
    
    return res.json({
      success: true,
      databaseType: dbType,
      userCount,
      users: usersList.rows,
      seedResult
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    });
  }
});

module.exports = router;

