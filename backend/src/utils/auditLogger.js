const db = require('../db');

/**
 * Log user actions to audit_logs table
 * @param {number|null} userId - The database user ID
 * @param {string|null} username - The username performing action
 * @param {string} action - Action description (e.g. 'LOGIN', 'SUBMIT_OBSERVATION')
 * @param {string} tableName - Affected table (e.g. 'observations')
 * @param {number|null} recordId - Affected record ID
 * @param {string} details - Detailed notes
 */
async function logAction(userId, username, action, tableName = null, recordId = null, details = '') {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, username, action, table_name, record_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, username, action, tableName, recordId, details]
    );
  } catch (err) {
    console.error('Audit Logging failed:', err.message);
  }
}

module.exports = {
  logAction
};
