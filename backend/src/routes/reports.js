const express = require('express');
const router = express.Router();
const db = require('../db');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { authenticateToken } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');

// Query generator to match filter queries
async function fetchObservationsByFilter(filters) {
  const { startDate, endDate, stationId, trainNumber, severity, status, search } = filters;
  
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
  if (search) {
    queryText += ` AND (o.train_name LIKE $${paramIndex} OR o.train_number LIKE $${paramIndex} OR o.remarks LIKE $${paramIndex} OR s.station_name LIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  queryText += ' ORDER BY o.test_date DESC, o.test_time DESC';
  
  const result = await db.query(queryText, params);
  return result.rows;
}

// 1. Generate PDF Report
router.get('/pdf', authenticateToken, async (req, res) => {
  try {
    const observations = await fetchObservationsByFilter(req.query);
    
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="CUMTA_QA_Report.pdf"');
    
    doc.pipe(res);
    
    // Header Branding
    doc.fillColor('#006A4E').fontSize(18).text('CUMTA Suburban Train Validation System', { align: 'center' });
    doc.fillColor('#FFB81C').fontSize(11).text('Chennai Unified Metropolitan Transport Authority (CUMTA)', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#555555').fontSize(9).text(`Report Generated On: ${new Date().toLocaleString('en-IN')}`, { align: 'right' });
    doc.moveDown(1);
    
    // Summary Metrics
    doc.fillColor('#333').fontSize(12).text(`Total Submitted Observations: ${observations.length}`, { underline: true });
    doc.moveDown(1);
    
    // Content rendering loop
    let idx = 1;
    for (const obs of observations) {
      // Check if we need to add a new page (rough height estimation)
      if (doc.y > 600) {
        doc.addPage();
      }
      
      // Box header
      doc.rect(doc.x, doc.y, 535, 20).fill('#F2F2F2');
      doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold').text(`  Observation #${idx} - Train ${obs.train_number} (${obs.train_name})`, doc.x + 5, doc.y - 15);
      doc.font('Helvetica');
      doc.moveDown(0.8);
      
      // Columns info
      const initialY = doc.y;
      doc.fontSize(9);
      
      // Column 1: Test Details
      doc.text(`Station: ${obs.station_name || 'N/A'}`, 35, initialY);
      doc.text(`Inspector: ${obs.tester_name} (${obs.mobile_number})`, 35, initialY + 12);
      doc.text(`Date/Time: ${new Date(obs.test_date).toLocaleDateString()} at ${obs.test_time}`, 35, initialY + 24);
      
      // Column 2: App Diffs
      const c1DiffStr = obs.c1_visible ? `${obs.c1_eta_diff_min} min` : 'Not Visible';
      const ntesDiffStr = obs.ntes_visible ? `${obs.ntes_eta_diff_min} min` : 'Not Visible';
      doc.text(`C1 ETA Diff: ${c1DiffStr}`, 220, initialY);
      doc.text(`NTES ETA Diff: ${ntesDiffStr}`, 220, initialY + 12);
      doc.text(`Severity: ${obs.severity}`, 220, initialY + 24);
      
      // Column 3: Plat details
      doc.text(`C1 Platform: ${obs.c1_platform || 'N/A'}`, 380, initialY);
      doc.text(`NTES Platform: ${obs.ntes_platform || 'N/A'}`, 380, initialY + 12);
      doc.text(`Actual Platform: ${obs.actual_platform} (Arrival: ${obs.actual_arrival_time})`, 380, initialY + 24);
      
      doc.moveDown(3.2);
      
      // Issues & Remarks
      if (obs.issue_names) {
        doc.fillColor('#D32F2F').font('Helvetica-Bold').text(`Issues Flagged: ${obs.issue_names}`, 35, doc.y);
        doc.font('Helvetica').fillColor('#333333');
        doc.moveDown(0.5);
      }
      
      if (obs.remarks) {
        doc.fillColor('#666666').text(`Remarks: ${obs.remarks}`, 35, doc.y, { width: 500 });
        doc.fillColor('#333333');
        doc.moveDown(1);
      }
      
      // Horizontal separator line
      doc.moveTo(30, doc.y).lineTo(565, doc.y).strokeColor('#E0E0E0').stroke();
      doc.moveDown(1.5);
      idx++;
    }
    
    doc.end();
    await logAction(req.user.id, req.user.username, 'GENERATE_PDF_REPORT', 'observations', null, 'Downloaded PDF report');
  } catch (err) {
    console.error('PDF report error:', err);
    return res.status(500).json({ message: 'Server error generating PDF' });
  }
});

// 2. Generate Excel Report
router.get('/excel', authenticateToken, async (req, res) => {
  try {
    const observations = await fetchObservationsByFilter(req.query);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CUMTA QA Submissions');
    
    // Style column headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Tester Name', key: 'tester_name', width: 20 },
      { header: 'Date', key: 'test_date', width: 12 },
      { header: 'Time', key: 'test_time', width: 10 },
      { header: 'Station', key: 'station_name', width: 20 },
      { header: 'Train No', key: 'train_number', width: 12 },
      { header: 'Train Name', key: 'train_name', width: 25 },
      { header: 'Direction', key: 'direction', width: 18 },
      { header: 'Chennai One ETA', key: 'c1_eta', width: 15 },
      { header: 'Chennai One Plat', key: 'c1_platform', width: 15 },
      { header: 'NTES ETA', key: 'ntes_eta', width: 12 },
      { header: 'NTES Plat', key: 'ntes_platform', width: 12 },
      { header: 'Actual Arrival', key: 'actual_arrival_time', width: 15 },
      { header: 'Actual Plat', key: 'actual_platform', width: 12 },
      { header: 'C1 Diff (Min)', key: 'c1_eta_diff_min', width: 15 },
      { header: 'NTES Diff (Min)', key: 'ntes_eta_diff_min', width: 15 },
      { header: 'Issues Flagged', key: 'issue_names', width: 25 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Remarks', key: 'remarks', width: 35 }
    ];
    
    // Apply styling to header row (Green theme)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '006A4E' }
      };
      cell.font = {
        name: 'Arial',
        color: { argb: 'FFFFFF' },
        bold: true,
        size: 10
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 25;
    
    // Add Rows
    observations.forEach((obs) => {
      worksheet.addRow({
        id: obs.id,
        tester_name: obs.tester_name,
        test_date: new Date(obs.test_date).toISOString().slice(0, 10),
        test_time: obs.test_time,
        station_name: obs.station_name,
        train_number: obs.train_number,
        train_name: obs.train_name,
        direction: obs.direction,
        c1_eta: obs.c1_visible ? obs.c1_eta : 'Hidden',
        c1_platform: obs.c1_platform || 'N/A',
        ntes_eta: obs.ntes_visible ? obs.ntes_eta : 'Hidden',
        ntes_platform: obs.ntes_platform || 'N/A',
        actual_arrival_time: obs.actual_arrival_time,
        actual_platform: obs.actual_platform,
        c1_eta_diff_min: obs.c1_visible ? obs.c1_eta_diff_min : 'N/A',
        ntes_eta_diff_min: obs.ntes_visible ? obs.ntes_eta_diff_min : 'N/A',
        issue_names: obs.issue_names || 'None',
        severity: obs.severity,
        status: obs.status,
        remarks: obs.remarks
      });
    });
    
    // Headers config
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="CUMTA_QA_Report.xlsx"');
    
    await workbook.xlsx.write(res);
    await logAction(req.user.id, req.user.username, 'GENERATE_EXCEL_REPORT', 'observations', null, 'Downloaded Excel report');
  } catch (err) {
    console.error('Excel report error:', err);
    return res.status(500).json({ message: 'Server error generating Excel file' });
  }
});

// 3. Generate CSV Report
router.get('/csv', authenticateToken, async (req, res) => {
  try {
    const observations = await fetchObservationsByFilter(req.query);
    
    const headers = [
      'ID', 'Tester Name', 'Date', 'Time', 'Station', 'Train Number', 'Train Name', 'Direction',
      'C1 Visible', 'C1 ETA', 'C1 Platform', 'NTES Visible', 'NTES ETA', 'NTES Platform',
      'Actual Arrival Time', 'Actual Platform', 'C1 Diff Min', 'NTES Diff Min', 'Issues', 'Severity', 'Status', 'Remarks'
    ];
    
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const obs of observations) {
      const row = [
        obs.id,
        `"${obs.tester_name.replace(/"/g, '""')}"`,
        new Date(obs.test_date).toISOString().slice(0, 10),
        obs.test_time,
        `"${(obs.station_name || 'N/A').replace(/"/g, '""')}"`,
        `"${obs.train_number}"`,
        `"${obs.train_name.replace(/"/g, '""')}"`,
        `"${obs.direction}"`,
        obs.c1_visible,
        obs.c1_eta || '',
        obs.c1_platform || '',
        obs.ntes_visible,
        obs.ntes_eta || '',
        obs.ntes_platform || '',
        obs.actual_arrival_time,
        obs.actual_platform,
        obs.c1_eta_diff_min !== null ? obs.c1_eta_diff_min : '',
        obs.ntes_eta_diff_min !== null ? obs.ntes_eta_diff_min : '',
        `"${(obs.issue_names || 'None').replace(/"/g, '""')}"`,
        obs.severity,
        obs.status,
        `"${(obs.remarks || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="CUMTA_QA_Report.csv"');
    
    res.send(csvRows.join('\n'));
    await logAction(req.user.id, req.user.username, 'GENERATE_CSV_REPORT', 'observations', null, 'Downloaded CSV report');
  } catch (err) {
    console.error('CSV report error:', err);
    return res.status(500).json({ message: 'Server error generating CSV' });
  }
});

// 4. Send Email Alert Report (mock notification API)
router.post('/email', authenticateToken, async (req, res) => {
  const { filters, emailRecipient } = req.body;
  
  if (!emailRecipient) {
    return res.status(400).json({ message: 'Email recipient is required' });
  }
  
  try {
    const observations = await fetchObservationsByFilter(filters || {});
    
    // Simulate sending email
    console.log(`[SMTP SIMULATOR] Sending CUMTA QA report to: ${emailRecipient}`);
    console.log(`[SMTP SIMULATOR] Subject: CUMTA Suburban QA Audit Summary Report`);
    console.log(`[SMTP SIMULATOR] Content: Total of ${observations.length} observations compiled in audit.`);
    
    await logAction(
      req.user.id, 
      req.user.username, 
      'EMAIL_REPORT', 
      'observations', 
      null, 
      `Dispatched mock email report summary containing ${observations.length} records to ${emailRecipient}`
    );
    
    return res.json({ 
      success: true, 
      message: `Report summary email simulated successfully to ${emailRecipient}. Check server logs for details.` 
    });
  } catch (err) {
    console.error('Email report simulation error:', err);
    return res.status(500).json({ message: 'Server error during emailing simulation' });
  }
});

module.exports = router;
