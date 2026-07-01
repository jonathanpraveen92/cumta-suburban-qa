const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get all audit logs (Admin Only)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500');
    return res.json(result.rows);
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    return res.status(500).json({ message: 'Server error fetching audit logs' });
  }
});

module.exports = router;
