const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');

// Fetch all issue categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM issue_categories ORDER BY name ASC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Fetch categories error:', err);
    return res.status(500).json({ message: 'Server error fetching categories' });
  }
});

// Create Category (Admin Only)
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    // Check duplication
    const checkDup = await db.query('SELECT id FROM issue_categories WHERE name = $1', [name]);
    if (checkDup.rows.length > 0) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    const result = await db.query('INSERT INTO issue_categories (name) VALUES ($1) RETURNING *', [name]);
    const newCategory = result.rows[0];
    
    await logAction(req.user.id, req.user.username, 'CREATE_CATEGORY', 'issue_categories', newCategory.id, `Created issue category: ${name}`);

    return res.status(201).json(newCategory);
  } catch (err) {
    console.error('Create category error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Update Category (Admin Only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const catId = parseInt(req.params.id);
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    const checkExist = await db.query('SELECT name FROM issue_categories WHERE id = $1', [catId]);
    if (checkExist.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await db.query('UPDATE issue_categories SET name = $1 WHERE id = $2', [name, catId]);
    await logAction(req.user.id, req.user.username, 'UPDATE_CATEGORY', 'issue_categories', catId, `Updated category ${checkExist.rows[0].name} to ${name}`);

    return res.json({ message: 'Category updated successfully' });
  } catch (err) {
    console.error('Update category error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete Category (Admin Only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const catId = parseInt(req.params.id);

  try {
    const checkExist = await db.query('SELECT name FROM issue_categories WHERE id = $1', [catId]);
    if (checkExist.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await db.query('DELETE FROM issue_categories WHERE id = $1', [catId]);
    await logAction(req.user.id, req.user.username, 'DELETE_CATEGORY', 'issue_categories', catId, `Deleted category ${checkExist.rows[0].name}`);

    return res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
