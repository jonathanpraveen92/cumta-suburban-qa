const express = require('express');
const router = express.Router();
const db = require('../db');
const upload = require('../middleware/upload');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const path = require('path');

// Helper to calculate difference in minutes between two time strings "HH:MM:SS" or "HH:MM"
function calculateTimeDiff(time1, time2) {
  if (!time1 || !time2) return null;
  
  const t1Parts = time1.split(':').map(Number);
  const t2Parts = time2.split(':').map(Number);
  
  const mins1 = t1Parts[0] * 60 + (t1Parts[1] || 0);
  const mins2 = t2Parts[0] * 60 + (t2Parts[1] || 0);
  
  let diff = mins1 - mins2;
  
  // Handle midnight wrap-around (e.g. ETA 23:55, Actual 00:03)
  if (diff > 720) {
    diff -= 1440;
  } else if (diff < -720) {
    diff += 1440;
  }
  
  return Math.abs(diff);
}

// Fetch all observations with advanced filters and pagination
router.get('/', authenticateToken, async (req, res) => {
  const { 
    startDate, endDate, stationId, trainNumber, testerName, 
    issueCategoryId, severity, status, search 
  } = req.query;
  
  let queryText = `
    SELECT o.*, s.station_name, s.zone, u.username as inspector_username,
           (SELECT GROUP_CONCAT(ic.name) FROM observation_issues oi 
            JOIN issue_categories ic ON oi.issue_category_id = ic.id 
            WHERE oi.observation_id = o.id) as issue_names
    FROM observations o
    LEFT JOIN stations s ON o.station_id = s.id
    LEFT JOIN users u ON o.inspector_id = u.id
    WHERE 1=1
  `;
  
  // For PostgreSQL, we use string_agg instead of GROUP_CONCAT
  if (!db.isSQLite()) {
    queryText = queryText.replace(
      '(SELECT GROUP_CONCAT(ic.name) FROM observation_issues oi JOIN issue_categories ic ON oi.issue_category_id = ic.id WHERE oi.observation_id = o.id) as issue_names',
      '(SELECT string_agg(ic.name, \',\') FROM observation_issues oi JOIN issue_categories ic ON oi.issue_category_id = ic.id WHERE oi.observation_id = o.id) as issue_names'
    );
  }
  
  const params = [];
  let paramIndex = 1;
  
  if (startDate) {
    queryText += ` AND o.test_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }
  
  if (endDate) {
    queryText += ` AND o.test_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }
  
  if (stationId) {
    queryText += ` AND o.station_id = $${paramIndex}`;
    params.push(parseInt(stationId));
    paramIndex++;
  }
  
  if (trainNumber) {
    queryText += ` AND o.train_number = $${paramIndex}`;
    params.push(trainNumber);
    paramIndex++;
  }
  
  if (testerName) {
    queryText += ` AND o.tester_name LIKE $${paramIndex}`;
    params.push(`%${testerName}%`);
    paramIndex++;
  }
  
  if (severity) {
    queryText += ` AND o.severity = $${paramIndex}`;
    params.push(severity);
    paramIndex++;
  }
  
  if (status) {
    queryText += ` AND o.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }
  
  if (issueCategoryId) {
    queryText += ` AND o.id IN (SELECT observation_id FROM observation_issues WHERE issue_category_id = $${paramIndex})`;
    params.push(parseInt(issueCategoryId));
    paramIndex++;
  }
  
  if (search) {
    queryText += ` AND (o.train_name LIKE $${paramIndex} OR o.train_number LIKE $${paramIndex} OR o.remarks LIKE $${paramIndex} OR s.station_name LIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  // Field inspectors can only see their own submissions unless they are admin
  if (req.user.role === 'field_inspector') {
    queryText += ` AND o.inspector_id = $${paramIndex}`;
    params.push(req.user.id);
    paramIndex++;
  }
  
  queryText += ' ORDER BY o.test_date DESC, o.test_time DESC';
  
  try {
    const result = await db.query(queryText, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Fetch observations error:', err);
    return res.status(500).json({ message: 'Server error fetching observations' });
  }
});

// Fetch Single Observation details with images and issue lists
router.get('/:id', authenticateToken, async (req, res) => {
  const obsId = parseInt(req.params.id);
  
  try {
    // Fetch main observation
    const obsRes = await db.query(
      `SELECT o.*, s.station_name, s.zone, u.username as inspector_username 
       FROM observations o
       LEFT JOIN stations s ON o.station_id = s.id
       LEFT JOIN users u ON o.inspector_id = u.id
       WHERE o.id = $1`,
      [obsId]
    );
    
    if (obsRes.rows.length === 0) {
      return res.status(404).json({ message: 'Observation not found' });
    }
    
    const observation = obsRes.rows[0];
    
    // Check access restrictions
    if (req.user.role === 'field_inspector' && observation.inspector_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied to this record' });
    }
    
    // Fetch connected issues
    const issuesRes = await db.query(
      `SELECT ic.id, ic.name FROM observation_issues oi
       JOIN issue_categories ic ON oi.issue_category_id = ic.id
       WHERE oi.observation_id = $1`,
      [obsId]
    );
    observation.issues = issuesRes.rows;
    
    // Fetch connected images
    const imagesRes = await db.query(
      `SELECT id, file_path, file_name FROM observation_images WHERE observation_id = $1`,
      [obsId]
    );
    observation.images = imagesRes.rows;
    
    return res.json(observation);
  } catch (err) {
    console.error('Fetch observation detail error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Submit Observation (Inspector & Admin)
router.post('/', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    // Parse form data fields
    const {
      tester_name, mobile_number, email, test_date, test_time, station_id,
      train_number, train_name, direction,
      c1_visible, c1_eta, c1_platform, c1_journey_planner, c1_ticket_booking,
      ntes_visible, ntes_eta, ntes_platform,
      actual_arrival_time, actual_platform, train_status,
      severity, remarks
    } = req.body;
    
    const parsedC1Visible = c1_visible === 'true' || c1_visible === true;
    const parsedNtesVisible = ntes_visible === 'true' || ntes_visible === true;
    
    // Calculate differences
    const c1_eta_diff_min = parsedC1Visible ? calculateTimeDiff(actual_arrival_time, c1_eta) : null;
    const ntes_eta_diff_min = parsedNtesVisible ? calculateTimeDiff(actual_arrival_time, ntes_eta) : null;
    
    // Parse issues array (which is submitted as JSON string in form data)
    let issueCategoryIds = [];
    if (req.body.issues) {
      try {
        issueCategoryIds = JSON.parse(req.body.issues);
      } catch (e) {
        console.warn('Failed to parse issues JSON string:', req.body.issues);
      }
    }
    
    // Insert into observations
    const insertRes = await db.query(
      `INSERT INTO observations (
        tester_name, mobile_number, email, test_date, test_time, station_id, train_number, train_name, direction,
        c1_visible, c1_eta, c1_platform, c1_journey_planner, c1_ticket_booking,
        ntes_visible, ntes_eta, ntes_platform,
        actual_arrival_time, actual_platform, train_status,
        c1_eta_diff_min, ntes_eta_diff_min,
        severity, remarks, inspector_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26) RETURNING id`,
      [
        tester_name, mobile_number, email, test_date, test_time, parseInt(station_id), train_number, train_name, direction,
        parsedC1Visible, c1_visible === 'true' && c1_eta ? c1_eta : null, c1_platform || null, c1_journey_planner || 'Not Tested', c1_ticket_booking || 'Not Tested',
        parsedNtesVisible, ntes_visible === 'true' && ntes_eta ? ntes_eta : null, ntes_platform || null,
        actual_arrival_time, actual_platform, train_status || 'On Time',
        c1_eta_diff_min, ntes_eta_diff_min,
        severity || 'Medium', remarks || '', req.user.id, 'Pending'
      ]
    );
    
    const observationId = insertRes.rows[0].id;
    
    // Insert linked issues
    if (Array.isArray(issueCategoryIds) && issueCategoryIds.length > 0) {
      for (const catId of issueCategoryIds) {
        await db.query(
          'INSERT INTO observation_issues (observation_id, issue_category_id) VALUES ($1, $2)',
          [observationId, parseInt(catId)]
        );
      }
    }
    
    // Insert uploaded images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Use relative web-accessible path
        const relativePath = `/uploads/${file.filename}`;
        await db.query(
          'INSERT INTO observation_images (observation_id, file_path, file_name) VALUES ($1, $2, $3)',
          [observationId, relativePath, file.originalname]
        );
      }
    }
    
    await logAction(req.user.id, req.user.username, 'CREATE_OBSERVATION', 'observations', observationId, `Submitted observation for train ${train_number} at station ID ${station_id}`);
    
    return res.status(201).json({ id: observationId, message: 'Observation submitted successfully' });
  } catch (err) {
    console.error('Submission error:', err);
    return res.status(500).json({ message: 'Server error during submission' });
  }
});

// Update Observation Status or details (Admin/Inspector)
router.put('/:id', authenticateToken, async (req, res) => {
  const obsId = parseInt(req.params.id);
  const { status, severity, remarks } = req.body;
  
  try {
    const checkRes = await db.query('SELECT inspector_id, status FROM observations WHERE id = $1', [obsId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Observation not found' });
    }
    
    const obs = checkRes.rows[0];
    
    // Inspectors can only edit their own observations, and only if they are not closed. Admins can edit anything.
    if (req.user.role === 'field_inspector') {
      if (obs.inspector_id !== req.user.id) {
        return res.status(403).json({ message: 'You can only edit your own submissions' });
      }
      if (obs.status === 'Closed') {
        return res.status(400).json({ message: 'Cannot edit a closed observation' });
      }
    }
    
    const updatedStatus = status || obs.status;
    const updatedSeverity = severity || obs.severity;
    
    await db.query(
      'UPDATE observations SET status = $1, severity = $2, remarks = COALESCE($3, remarks) WHERE id = $4',
      [updatedStatus, updatedSeverity, remarks, obsId]
    );
    
    await logAction(req.user.id, req.user.username, 'UPDATE_OBSERVATION', 'observations', obsId, `Updated status to ${updatedStatus}, severity to ${updatedSeverity}`);
    
    return res.json({ message: 'Observation updated successfully' });
  } catch (err) {
    console.error('Update observation error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete Observation (Admin Only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const obsId = parseInt(req.params.id);
  
  try {
    const checkRes = await db.query('SELECT id FROM observations WHERE id = $1', [obsId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Observation not found' });
    }
    
    await db.query('DELETE FROM observations WHERE id = $1', [obsId]);
    await logAction(req.user.id, req.user.username, 'DELETE_OBSERVATION', 'observations', obsId, `Deleted observation ID ${obsId}`);
    
    return res.json({ message: 'Observation deleted successfully' });
  } catch (err) {
    console.error('Delete observation error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
