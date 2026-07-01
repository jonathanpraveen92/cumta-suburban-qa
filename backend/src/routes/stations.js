const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');

// Fetch all stations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM stations ORDER BY station_name ASC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Fetch stations error:', err);
    return res.status(500).json({ message: 'Server error fetching stations' });
  }
});

// Create Station (Admin Only)
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { station_name, zone, latitude, longitude, towards_beach, towards_tambaram, towards_chengalpattu, towards_arakkonam, towards_others } = req.body;

  if (!station_name || !zone) {
    return res.status(400).json({ message: 'Station name and Zone are required' });
  }

  try {
    // Check duplication
    const checkDup = await db.query('SELECT id FROM stations WHERE station_name = $1', [station_name]);
    if (checkDup.rows.length > 0) {
      return res.status(400).json({ message: 'Station name already exists' });
    }

    const result = await db.query(
      `INSERT INTO stations (station_name, zone, latitude, longitude, towards_beach, towards_tambaram, towards_chengalpattu, towards_arakkonam, towards_others)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [station_name, zone, latitude, longitude, towards_beach || false, towards_tambaram || false, towards_chengalpattu || false, towards_arakkonam || false, towards_others || false]
    );

    const newStation = result.rows[0];
    await logAction(req.user.id, req.user.username, 'CREATE_STATION', 'stations', newStation.id, `Created station: ${station_name}`);
    
    return res.status(201).json(newStation);
  } catch (err) {
    console.error('Create station error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Update Station (Admin Only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const stationId = parseInt(req.params.id);
  const { station_name, zone, latitude, longitude, towards_beach, towards_tambaram, towards_chengalpattu, towards_arakkonam, towards_others } = req.body;

  if (!station_name || !zone) {
    return res.status(400).json({ message: 'Station name and Zone are required' });
  }

  try {
    const checkExist = await db.query('SELECT station_name FROM stations WHERE id = $1', [stationId]);
    if (checkExist.rows.length === 0) {
      return res.status(404).json({ message: 'Station not found' });
    }

    await db.query(
      `UPDATE stations SET station_name = $1, zone = $2, latitude = $3, longitude = $4,
                           towards_beach = $5, towards_tambaram = $6, towards_chengalpattu = $7, towards_arakkonam = $8, towards_others = $9
       WHERE id = $10`,
      [
        station_name, zone, latitude, longitude, 
        towards_beach || false, towards_tambaram || false, towards_chengalpattu || false, towards_arakkonam || false, towards_others || false, 
        stationId
      ]
    );

    await logAction(req.user.id, req.user.username, 'UPDATE_STATION', 'stations', stationId, `Updated station ${checkExist.rows[0].station_name} to ${station_name}`);

    return res.json({ message: 'Station updated successfully' });
  } catch (err) {
    console.error('Update station error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete Station (Admin Only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const stationId = parseInt(req.params.id);

  try {
    const checkExist = await db.query('SELECT station_name FROM stations WHERE id = $1', [stationId]);
    if (checkExist.rows.length === 0) {
      return res.status(404).json({ message: 'Station not found' });
    }

    await db.query('DELETE FROM stations WHERE id = $1', [stationId]);
    await logAction(req.user.id, req.user.username, 'DELETE_STATION', 'stations', stationId, `Deleted station ${checkExist.rows[0].station_name}`);

    return res.json({ message: 'Station deleted successfully' });
  } catch (err) {
    console.error('Delete station error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
