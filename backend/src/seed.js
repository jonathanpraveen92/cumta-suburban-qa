const db = require('./db');
const bcrypt = require('bcryptjs');

const STATIONS = [
  { name: 'Chennai Beach', zone: 'Southern Railway', lat: 13.0943, lng: 80.2914, directions: { beach: false, tambaram: true, chengalpattu: true, arakkonam: false, others: true } },
  { name: 'Chennai Fort', zone: 'Southern Railway', lat: 13.0883, lng: 80.2906, directions: { beach: true, tambaram: true, chengalpattu: true, arakkonam: false, others: true } },
  { name: 'Chennai Park', zone: 'Southern Railway', lat: 13.0822, lng: 80.2741, directions: { beach: true, tambaram: true, chengalpattu: true, arakkonam: false, others: true } },
  { name: 'Chennai Egmore', zone: 'Southern Railway', lat: 13.0792, lng: 80.2598, directions: { beach: true, tambaram: true, chengalpattu: true, arakkonam: false, others: true } },
  { name: 'Mambalam', zone: 'Southern Railway', lat: 13.0336, lng: 80.2317, directions: { beach: true, tambaram: true, chengalpattu: true, arakkonam: false, others: true } },
  { name: 'Guindy', zone: 'Southern Railway', lat: 13.0084, lng: 80.2206, directions: { beach: true, tambaram: true, chengalpattu: true, arakkonam: false, others: true } },
  { name: 'Tambaram', zone: 'Southern Railway', lat: 12.9249, lng: 80.1473, directions: { beach: true, tambaram: false, chengalpattu: true, arakkonam: false, others: true } },
  { name: 'Chengalpattu', zone: 'Southern Railway', lat: 12.6934, lng: 79.9765, directions: { beach: true, tambaram: true, chengalpattu: false, arakkonam: false, others: true } },
  { name: 'Chennai Central', zone: 'Southern Railway', lat: 13.0827, lng: 80.2707, directions: { beach: false, tambaram: false, chengalpattu: false, arakkonam: true, others: true } },
  { name: 'Perambur', zone: 'Southern Railway', lat: 13.1112, lng: 80.2286, directions: { beach: false, tambaram: false, chengalpattu: false, arakkonam: true, others: true } },
  { name: 'Villivakkam', zone: 'Southern Railway', lat: 13.1068, lng: 80.2036, directions: { beach: false, tambaram: false, chengalpattu: false, arakkonam: true, others: true } },
  { name: 'Ambattur', zone: 'Southern Railway', lat: 13.1166, lng: 80.1557, directions: { beach: false, tambaram: false, chengalpattu: false, arakkonam: true, others: true } },
  { name: 'Avadi', zone: 'Southern Railway', lat: 13.1187, lng: 80.1039, directions: { beach: false, tambaram: false, chengalpattu: false, arakkonam: true, others: true } },
  { name: 'Arakkonam', zone: 'Southern Railway', lat: 13.0863, lng: 79.6703, directions: { beach: false, tambaram: false, chengalpattu: false, arakkonam: false, others: true } }
];

const ISSUE_CATEGORIES = [
  'Train Missing',
  'Wrong ETA',
  'Wrong Platform',
  'API Timeout',
  'Ticket Booking Failed',
  'Journey Planner Wrong',
  'QR Validation Failed',
  'Payment Failed',
  'Slow Response',
  'Other'
];

async function seed() {
  try {
    console.log('Starting database seeding...');
    
    // 1. Initialize Tables
    await db.initDb();

    // 2. Check and Seed Users
    const usersCheck = await db.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(usersCheck.rows[0].count || usersCheck.rows[0].COUNT || 0);

    let adminId = 1;
    let inspectorId = 2;

    if (userCount === 0) {
      console.log('Seeding default users...');
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      const inspectorPasswordHash = await bcrypt.hash('inspector123', 10);
      
      const adminRes = await db.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        ['admin', 'admin@cumta.tn.gov.in', adminPasswordHash, 'admin']
      );
      adminId = adminRes.rows[0].id;

      const inspectorRes = await db.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        ['inspector', 'inspector@cumta.tn.gov.in', inspectorPasswordHash, 'field_inspector']
      );
      inspectorId = inspectorRes.rows[0].id;
      
      console.log('Users seeded successfully. Credentials: admin/admin123, inspector/inspector123');
    } else {
      const adminUser = await db.query("SELECT id FROM users WHERE username = 'admin'");
      const inspectorUser = await db.query("SELECT id FROM users WHERE username = 'inspector'");
      if (adminUser.rows.length > 0) adminId = adminUser.rows[0].id;
      if (inspectorUser.rows.length > 0) inspectorId = inspectorUser.rows[0].id;
      console.log('Users already exist.');
    }

    // 3. Seed Stations
    const stationsCheck = await db.query('SELECT COUNT(*) as count FROM stations');
    const stationCount = parseInt(stationsCheck.rows[0].count || stationsCheck.rows[0].COUNT || 0);
    
    if (stationCount === 0) {
      console.log('Seeding stations...');
      for (const st of STATIONS) {
        await db.query(
          `INSERT INTO stations (station_name, zone, latitude, longitude, towards_beach, towards_tambaram, towards_chengalpattu, towards_arakkonam, towards_others)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [st.name, st.zone, st.lat, st.lng, st.directions.beach, st.directions.tambaram, st.directions.chengalpattu, st.directions.arakkonam, st.directions.others]
        );
      }
      console.log('Stations seeded successfully.');
    } else {
      console.log('Stations already exist.');
    }

    // 4. Seed Issue Categories
    const categoriesCheck = await db.query('SELECT COUNT(*) as count FROM issue_categories');
    const categoriesCount = parseInt(categoriesCheck.rows[0].count || categoriesCheck.rows[0].COUNT || 0);

    if (categoriesCount === 0) {
      console.log('Seeding issue categories...');
      for (const cat of ISSUE_CATEGORIES) {
        await db.query('INSERT INTO issue_categories (name) VALUES ($1)', [cat]);
      }
      console.log('Issue categories seeded successfully.');
    } else {
      console.log('Issue categories already exist.');
    }

    // 5. Seed Mock Observations
    const obsCheck = await db.query('SELECT COUNT(*) as count FROM observations');
    const obsCount = parseInt(obsCheck.rows[0].count || obsCheck.rows[0].COUNT || 0);

    if (obsCount === 0) {
      console.log('Seeding mock observations for dashboards...');
      
      const stationsList = await db.query('SELECT id, station_name FROM stations');
      const categoriesList = await db.query('SELECT id, name FROM issue_categories');
      
      const stationMap = {};
      stationsList.rows.forEach(r => stationMap[r.station_name] = r.id);
      
      const categoryMap = {};
      categoriesList.rows.forEach(r => categoryMap[r.name] = r.id);

      const today = new Date();
      
      const mockData = [
        {
          tester: 'Suresh Kumar', mobile: '9840123456', email: 'suresh@gmail.com',
          daysAgo: 0, time: '08:45:00', station: 'Chennai Beach',
          trainNo: '40001', trainName: 'Beach - Tambaram EMU', direction: 'Towards Tambaram',
          c1_vis: true, c1_eta: '08:48:00', c1_plat: '3', c1_jp: 'Correct', c1_tb: 'Successful',
          ntes_vis: true, ntes_eta: '08:46:00', ntes_plat: '3',
          act_time: '08:45:00', act_plat: '3', status: 'On Time',
          c1_diff: -3, ntes_diff: -1, severity: 'Low',
          remarks: 'Train arrived on time. Minor delay representation in Chennai One ETA.',
          issues: []
        },
        {
          tester: 'Suresh Kumar', mobile: '9840123456', email: 'suresh@gmail.com',
          daysAgo: 0, time: '09:15:00', station: 'Mambalam',
          trainNo: '40003', trainName: 'Beach - Chengalpattu EMU', direction: 'Towards Chengalpattu',
          c1_vis: true, c1_eta: '09:28:00', c1_plat: '2', c1_jp: 'Incorrect', c1_tb: 'Failed',
          ntes_vis: true, ntes_eta: '09:17:00', ntes_plat: '1',
          act_time: '09:16:00', act_plat: '1', status: 'On Time',
          c1_diff: -12, ntes_diff: -1, severity: 'High',
          remarks: 'Chennai One ETA was 12 minutes off and showing wrong platform (2 instead of 1). Ticket booking failed with network error.',
          issues: ['Wrong ETA', 'Wrong Platform', 'Ticket Booking Failed']
        },
        {
          tester: 'Ramesh Krishnan', mobile: '9840987654', email: 'ramesh@gmail.com',
          daysAgo: 1, time: '18:10:00', station: 'Guindy',
          trainNo: '40012', trainName: 'Tambaram - Beach EMU', direction: 'Towards Beach',
          c1_vis: false, c1_eta: null, c1_plat: '', c1_jp: 'Not Tested', c1_tb: 'Not Tested',
          ntes_vis: true, ntes_eta: '18:12:00', ntes_plat: '2',
          act_time: '18:14:00', act_plat: '2', status: 'Delayed',
          c1_diff: null, ntes_diff: 2, severity: 'Critical',
          remarks: 'Train completely missing in Chennai One app, but NTES showed it correctly. Actual arrival was delayed by 2 mins.',
          issues: ['Train Missing']
        },
        {
          tester: 'Ramesh Krishnan', mobile: '9840987654', email: 'ramesh@gmail.com',
          daysAgo: 2, time: '08:30:00', station: 'Tambaram',
          trainNo: '40005', trainName: 'Beach - Tambaram EMU', direction: 'Towards Tambaram',
          c1_vis: true, c1_eta: '08:35:00', c1_plat: '1', c1_jp: 'Correct', c1_tb: 'Failed',
          ntes_vis: true, ntes_eta: '08:31:00', ntes_plat: '1',
          act_time: '08:30:00', act_plat: '1', status: 'On Time',
          c1_diff: -5, ntes_diff: -1, severity: 'Medium',
          remarks: 'QR Validation failed when scanning ticket. Payment went through but ticket did not generate.',
          issues: ['Ticket Booking Failed', 'QR Validation Failed']
        },
        {
          tester: 'Suresh Kumar', mobile: '9840123456', email: 'suresh@gmail.com',
          daysAgo: 3, time: '10:05:00', station: 'Chennai Central',
          trainNo: '43001', trainName: 'Central - Arakkonam EMU', direction: 'Towards Arakkonam',
          c1_vis: true, c1_eta: '10:14:00', c1_plat: '11', c1_jp: 'Correct', c1_tb: 'Successful',
          ntes_vis: false, ntes_eta: null, ntes_plat: '',
          act_time: '10:08:00', act_plat: '11', status: 'On Time',
          c1_diff: -6, ntes_diff: null, severity: 'Medium',
          remarks: 'NTES API timed out or did not return train details. Chennai One showed ETA but it was 6 mins delayed compared to actual.',
          issues: ['Train Missing', 'API Timeout']
        },
        {
          tester: 'Anjali Sharma', mobile: '9711223344', email: 'anjali@cumta.gov.in',
          daysAgo: 4, time: '14:20:00', station: 'Avadi',
          trainNo: '43003', trainName: 'Central - Avadi EMU', direction: 'Towards Arakkonam',
          c1_vis: true, c1_eta: '14:21:00', c1_plat: '2', c1_jp: 'Correct', c1_tb: 'Successful',
          ntes_vis: true, ntes_eta: '14:20:00', ntes_plat: '2',
          act_time: '14:20:00', act_plat: '2', status: 'On Time',
          c1_diff: 0, ntes_diff: 0, severity: 'Low',
          remarks: 'Perfect synchronization across Chennai One, NTES, and actual movement.',
          issues: []
        },
        {
          tester: 'Anjali Sharma', mobile: '9711223344', email: 'anjali@cumta.gov.in',
          daysAgo: 5, time: '16:40:00', station: 'Perambur',
          trainNo: '43005', trainName: 'Arakkonam - Central EMU', direction: 'Towards Central',
          c1_vis: true, c1_eta: '16:51:00', c1_plat: '1', c1_jp: 'Correct', c1_tb: 'Successful',
          ntes_vis: true, ntes_eta: '16:45:00', ntes_plat: '1',
          act_time: '16:43:00', act_plat: '1', status: 'On Time',
          c1_diff: -8, ntes_diff: -2, severity: 'Medium',
          remarks: 'Chennai One ETA delay was 8 minutes off.',
          issues: ['Wrong ETA']
        },
        {
          tester: 'Suresh Kumar', mobile: '9840123456', email: 'suresh@gmail.com',
          daysAgo: 6, time: '08:15:00', station: 'Mambalam',
          trainNo: '40002', trainName: 'Tambaram - Beach EMU', direction: 'Towards Beach',
          c1_vis: true, c1_eta: '08:17:00', c1_plat: '3', c1_jp: 'Correct', c1_tb: 'Failed',
          ntes_vis: true, ntes_eta: '08:16:00', ntes_plat: '3',
          act_time: '08:16:00', act_plat: '3', status: 'On Time',
          c1_diff: -1, ntes_diff: 0, severity: 'High',
          remarks: 'Payment failed repeatedly during checkout in Chennai One App.',
          issues: ['Ticket Booking Failed', 'Payment Failed']
        }
      ];

      for (const mock of mockData) {
        const testDate = new Date();
        testDate.setDate(today.getDate() - mock.daysAgo);
        const formattedDate = testDate.toISOString().slice(0, 10);
        
        const stationId = stationMap[mock.station];
        
        const result = await db.query(
          `INSERT INTO observations (
            tester_name, mobile_number, email, test_date, test_time, station_id, train_number, train_name, direction,
            c1_visible, c1_eta, c1_platform, c1_journey_planner, c1_ticket_booking,
            ntes_visible, ntes_eta, ntes_platform,
            actual_arrival_time, actual_platform, train_status,
            c1_eta_diff_min, ntes_eta_diff_min,
            severity, remarks, inspector_id, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26) RETURNING id`,
          [
            mock.tester, mock.mobile, mock.email, formattedDate, mock.time, stationId, mock.trainNo, mock.trainName, mock.direction,
            mock.c1_vis, mock.c1_eta, mock.c1_plat, mock.c1_jp, mock.c1_tb,
            mock.ntes_vis, mock.ntes_eta, mock.ntes_plat,
            mock.act_time, mock.act_plat, mock.status,
            mock.c1_diff, mock.ntes_diff,
            mock.severity, mock.remarks, inspectorId, 'Pending'
          ]
        );

        const obsId = result.rows[0].id;

        // Insert issues
        for (const issueName of mock.issues) {
          const issueId = categoryMap[issueName];
          if (issueId) {
            await db.query(
              'INSERT INTO observation_issues (observation_id, issue_category_id) VALUES ($1, $2)',
              [obsId, issueId]
            );
          }
        }
      }
      console.log('Mock observations seeded successfully.');
    } else {
      console.log('Mock observations already exist.');
    }

    console.log('Database seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0));
}

module.exports = seed;
