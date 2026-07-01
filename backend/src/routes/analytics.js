const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Fetch KPI Cards
    const totalRes = await db.query('SELECT COUNT(*) as count FROM observations');
    const totalTests = parseInt(totalRes.rows[0].count || totalRes.rows[0].COUNT || 0);

    const todayRes = await db.query('SELECT COUNT(*) as count FROM observations WHERE test_date = $1', [todayStr]);
    const todayTests = parseInt(todayRes.rows[0].count || todayRes.rows[0].COUNT || 0);

    const stationsRes = await db.query('SELECT COUNT(DISTINCT station_id) as count FROM observations');
    const stationsCovered = parseInt(stationsRes.rows[0].count || stationsRes.rows[0].COUNT || 0);

    const apiFailuresRes = await db.query(
      `SELECT COUNT(*) as count FROM observations o
       WHERE o.c1_visible = FALSE OR o.ntes_visible = FALSE 
          OR o.id IN (
            SELECT observation_id FROM observation_issues oi 
            JOIN issue_categories ic ON oi.issue_category_id = ic.id 
            WHERE ic.name IN ('API Timeout', 'Train Missing')
          )`
    );
    const apiFailures = parseInt(apiFailuresRes.rows[0].count || apiFailuresRes.rows[0].COUNT || 0);

    const ticketFailuresRes = await db.query("SELECT COUNT(*) as count FROM observations WHERE c1_ticket_booking = 'Failed'");
    const ticketBookingFailures = parseInt(ticketFailuresRes.rows[0].count || ticketFailuresRes.rows[0].COUNT || 0);

    const criticalRes = await db.query("SELECT COUNT(*) as count FROM observations WHERE severity = 'Critical'");
    const criticalIssues = parseInt(criticalRes.rows[0].count || criticalRes.rows[0].COUNT || 0);

    const avgEtaDiffRes = await db.query(
      'SELECT AVG(COALESCE(c1_eta_diff_min, 0) + COALESCE(ntes_eta_diff_min, 0)) / 2.0 as avg_diff FROM observations'
    );
    const avgEtaDifference = parseFloat(avgEtaDiffRes.rows[0].avg_diff || 0).toFixed(1);

    // 2. Fetch Performance Indicators
    // Ticket Booking Success %
    const ticketTotalRes = await db.query("SELECT COUNT(*) as count FROM observations WHERE c1_ticket_booking IN ('Successful', 'Failed')");
    const ticketTotal = parseInt(ticketTotalRes.rows[0].count || ticketTotalRes.rows[0].COUNT || 0);
    const ticketSuccessRes = await db.query("SELECT COUNT(*) as count FROM observations WHERE c1_ticket_booking = 'Successful'");
    const ticketSuccess = parseInt(ticketSuccessRes.rows[0].count || ticketSuccessRes.rows[0].COUNT || 0);
    const ticketSuccessRate = ticketTotal > 0 ? ((ticketSuccess / ticketTotal) * 100).toFixed(1) : "100.0";

    // Journey Planner Accuracy %
    const jpTotalRes = await db.query("SELECT COUNT(*) as count FROM observations WHERE c1_journey_planner IN ('Correct', 'Incorrect')");
    const jpTotal = parseInt(jpTotalRes.rows[0].count || jpTotalRes.rows[0].COUNT || 0);
    const jpCorrectRes = await db.query("SELECT COUNT(*) as count FROM observations WHERE c1_journey_planner = 'Correct'");
    const jpCorrect = parseInt(jpCorrectRes.rows[0].count || jpCorrectRes.rows[0].COUNT || 0);
    const jpAccuracy = jpTotal > 0 ? ((jpCorrect / jpTotal) * 100).toFixed(1) : "100.0";

    // NTES Availability %
    const ntesAvailRes = await db.query("SELECT COUNT(*) as count FROM observations WHERE ntes_visible = TRUE");
    const ntesAvailCount = parseInt(ntesAvailRes.rows[0].count || ntesAvailRes.rows[0].COUNT || 0);
    const ntesAvailabilityRate = totalTests > 0 ? ((ntesAvailCount / totalTests) * 100).toFixed(1) : "100.0";

    // Chennai One Availability %
    const c1AvailRes = await db.query("SELECT COUNT(*) as count FROM observations WHERE c1_visible = TRUE");
    const c1AvailCount = parseInt(c1AvailRes.rows[0].count || c1AvailRes.rows[0].COUNT || 0);
    const c1AvailabilityRate = totalTests > 0 ? ((c1AvailCount / totalTests) * 100).toFixed(1) : "100.0";

    // Most Common Issue
    const commonIssueRes = await db.query(
      `SELECT ic.name, COUNT(*) as count FROM observation_issues oi
       JOIN issue_categories ic ON oi.issue_category_id = ic.id
       GROUP BY ic.name ORDER BY count DESC LIMIT 1`
    );
    const mostCommonIssue = commonIssueRes.rows.length > 0 ? commonIssueRes.rows[0].name : 'None';

    // Most Problematic Station
    const problematicStationRes = await db.query(
      `SELECT s.station_name, COUNT(*) as count FROM observations o
       JOIN stations s ON o.station_id = s.id
       WHERE o.id IN (SELECT DISTINCT observation_id FROM observation_issues)
       GROUP BY s.station_name ORDER BY count DESC LIMIT 1`
    );
    const mostProblematicStation = problematicStationRes.rows.length > 0 ? problematicStationRes.rows[0].station_name : 'None';

    // 3. Recharts Formatted Data
    // Issues by Station (Bar Chart)
    const issuesByStationRes = await db.query(
      `SELECT s.station_name as name, COUNT(oi.observation_id) as issues
       FROM stations s
       LEFT JOIN observations o ON s.id = o.station_id
       LEFT JOIN observation_issues oi ON o.id = oi.observation_id
       GROUP BY s.station_name HAVING issues > 0 ORDER BY issues DESC`
    );
    const issuesByStation = issuesByStationRes.rows;

    // Issues by Category (Pie Chart)
    const issuesByCategoryRes = await db.query(
      `SELECT ic.name as name, COUNT(oi.observation_id) as value
       FROM issue_categories ic
       JOIN observation_issues oi ON ic.id = oi.issue_category_id
       GROUP BY ic.name ORDER BY value DESC`
    );
    const issuesByCategory = issuesByCategoryRes.rows;

    // Daily Tests (Line Chart)
    let dailyTestsQuery = `
      SELECT test_date as date, COUNT(*) as count 
      FROM observations 
      GROUP BY test_date 
      ORDER BY test_date ASC
    `;
    const dailyTestsRes = await db.query(dailyTestsQuery);
    const dailyTests = dailyTestsRes.rows.map(r => ({
      date: new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      tests: r.count || r.COUNT || 0
    }));

    // ETA Accuracy (Gauge Chart)
    const etaAccurateRes = await db.query(
      'SELECT COUNT(*) as count FROM observations WHERE c1_eta_diff_min <= 2 OR ntes_eta_diff_min <= 2'
    );
    const etaAccurateCount = parseInt(etaAccurateRes.rows[0].count || etaAccurateRes.rows[0].COUNT || 0);
    const etaAccuracyPercentage = totalTests > 0 ? Math.round((etaAccurateCount / totalTests) * 100) : 100;

    // Station Accuracy Heatmap (representing Station vs Chennai One accuracy vs NTES accuracy)
    const heatmapRes = await db.query(
      `SELECT s.station_name, 
              COUNT(o.id) as total_tests,
              SUM(CASE WHEN o.c1_eta_diff_min <= 2 THEN 1 ELSE 0 END) as c1_accurate,
              SUM(CASE WHEN o.ntes_eta_diff_min <= 2 THEN 1 ELSE 0 END) as ntes_accurate
       FROM stations s
       JOIN observations o ON s.id = o.station_id
       GROUP BY s.station_name`
    );
    
    const stationAccuracyHeatmap = heatmapRes.rows.map(r => {
      const total = parseInt(r.total_tests || 0);
      const c1Acc = parseInt(r.c1_accurate || 0);
      const ntesAcc = parseInt(r.ntes_accurate || 0);
      return {
        station: r.station_name,
        total,
        c1Accuracy: total > 0 ? Math.round((c1Acc / total) * 100) : 100,
        ntesAccuracy: total > 0 ? Math.round((ntesAcc / total) * 100) : 100
      };
    });

    return res.json({
      cards: {
        totalTests,
        todayTests,
        stationsCovered,
        apiFailures,
        ticketBookingFailures,
        criticalIssues,
        avgEtaDifference,
        avgResponseTime: "142 ms" // Mocked metric representing CRIS api query response times
      },
      kpis: {
        ticketSuccessRate,
        jpAccuracy,
        ntesAvailabilityRate,
        c1AvailabilityRate,
        mostCommonIssue,
        mostProblematicStation
      },
      charts: {
        issuesByStation,
        issuesByCategory,
        dailyTests,
        etaAccuracy: etaAccuracyPercentage,
        stationAccuracyHeatmap
      }
    });

  } catch (err) {
    console.error('Analytics Fetch Error:', err);
    return res.status(500).json({ message: 'Server error generating analytics' });
  }
});

module.exports = router;
