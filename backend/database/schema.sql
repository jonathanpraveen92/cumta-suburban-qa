-- Database Schema for CUMTA Suburban Train Validation & QA System

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'field_inspector', -- 'admin' or 'field_inspector'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Stations Table
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    station_name VARCHAR(150) UNIQUE NOT NULL,
    zone VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    towards_beach BOOLEAN DEFAULT FALSE,
    towards_tambaram BOOLEAN DEFAULT FALSE,
    towards_chengalpattu BOOLEAN DEFAULT FALSE,
    towards_arakkonam BOOLEAN DEFAULT FALSE,
    towards_others BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Issue Categories Table
CREATE TABLE IF NOT EXISTS issue_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Observations Table
CREATE TABLE IF NOT EXISTS observations (
    id SERIAL PRIMARY KEY,
    tester_name VARCHAR(150) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    test_date DATE NOT NULL,
    test_time TIME NOT NULL,
    station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    train_number VARCHAR(20) NOT NULL,
    train_name VARCHAR(150) NOT NULL,
    direction VARCHAR(100) NOT NULL,
    
    -- Chennai One Details
    c1_visible BOOLEAN DEFAULT TRUE,
    c1_eta TIME,
    c1_platform VARCHAR(20),
    c1_journey_planner VARCHAR(50) DEFAULT 'Not Tested', -- 'Correct', 'Incorrect', 'Not Tested'
    c1_ticket_booking VARCHAR(50) DEFAULT 'Not Tested', -- 'Successful', 'Failed', 'Not Tested'
    
    -- NTES Details
    ntes_visible BOOLEAN DEFAULT TRUE,
    ntes_eta TIME,
    ntes_platform VARCHAR(20),
    
    -- Actual Observation Details
    actual_arrival_time TIME NOT NULL,
    actual_platform VARCHAR(20) NOT NULL,
    train_status VARCHAR(50) DEFAULT 'On Time', -- 'On Time', 'Delayed', 'Cancelled'
    
    -- Auto Calculations
    c1_eta_diff_min INTEGER, -- Difference in minutes between actual arrival and Chennai One ETA
    ntes_eta_diff_min INTEGER, -- Difference in minutes between actual arrival and NTES ETA
    
    -- Metadata
    severity VARCHAR(50) NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Critical'
    remarks TEXT,
    inspector_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Resolved', 'Closed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Observation Issues Junction Table
CREATE TABLE IF NOT EXISTS observation_issues (
    observation_id INTEGER REFERENCES observations(id) ON DELETE CASCADE,
    issue_category_id INTEGER REFERENCES issue_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (observation_id, issue_category_id)
);

-- 6. Observation Images Table
CREATE TABLE IF NOT EXISTS observation_images (
    id SERIAL PRIMARY KEY,
    observation_id INTEGER REFERENCES observations(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
