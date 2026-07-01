# CUMTA – Chennai One Suburban Train Validation & QA System

A web-based Quality Assurance (QA) and validation portal designed for the **Chennai Unified Metropolitan Transport Authority (CUMTA)** to cross-reference and audit suburban train information displayed in the *Chennai One App* against CRIS NTES APIs and actual train arrivals on the platform.

The system helps identify sync delays, wrong ETA displays, missing trains, ticket booking failures, platform discrepancies, and journey planner errors. It includes detailed KPIs, real-time variance calculations, and printable reports (PDF, Excel, and CSV) for CUMTA operations.

---

## 🌟 Key Features

1. **Dashboard & KPIs**:
   - High-level metric counters: Total Tests, API Failures, Ticket Booking Failures, Critical Issues, etc.
   - Core KPIs: Ticket Success Rate, Journey Planner Accuracy, NTES Availability, Chennai One Availability, etc.
   - Recharts visual graphs: Line (Daily Tests), Bar (Issues by Station), Pie (Issue Category Distributions), and Circular Progress (ETA accuracy).
   - Station Accuracy Heatmap Matrix showing sync levels per location.
   - Multi-field filter control updating analytics on-the-fly.

2. **Field Observation Submission**:
   - Inspector profile inputs.
   - Dynamic direction dropdown matching the selected station directions.
   - Checkbox issue categories loaded from the database.
   - **Ground-Truth Variance Math**: Automatically calculates difference in minutes between actual arrivals and Chennai One/NTES ETAs. Displays status tags with color coding:
     - 🟢 **Green** (`<= 2 min`)
     - 🟡 **Yellow** (`<= 5 min`)
     - 🔴 **Red** (`> 5 min`)
   - Attachment uploader (multiple screenshots of train boards/app displays).

3. **Administration Console**:
   - Manage Station Masters (CRUD latitude, longitude, and active travel directions).
   - Manage Issue Categories (CRUD options for inspector checklists).
   - Manage User Accounts (register field inspectors and admins).
   - Audit logs trail (Immutable historical records of changes).
   - Reports Panel: Generate styled Excel spreadsheets (`exceljs`), printable PDF sheets (`pdfkit`), or raw CSV. Supports emailing alert summaries.

---

## 🛠 Technology Stack

- **Frontend**: React.js, Vite, Material-UI (MUI), Recharts, Axios
- **Backend**: Node.js, Express, Multer, JWT, ExcelJS, PDFKit
- **Database**: PostgreSQL (Production) / SQLite (Zero-Config Development Fallback)
- **Containerization**: Docker, Docker Compose

---

## 📂 Project Directory Structure

```text
cumta-suburban-qa/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Route controllers (planned expansion)
│   │   ├── middleware/       # JWT auth, Multer file upload
│   │   ├── routes/           # Auth, Observations, Stations, Categories, Analytics, Reports, Audit
│   │   ├── utils/            # Audit logging helper
│   │   ├── db.js             # Dual-engine database connection (pg + sqlite fallback)
│   │   ├── index.js          # Express server start
│   │   └── seed.js           # Database mock initializer script
│   ├── .env                  # Environment configurations
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Header & Sidebar Layout, branding vector SVGs
│   │   ├── context/          # Auth Context, Theme Switcher Context
│   │   ├── pages/            # Login, Dashboard, Form, List, Stations, Categories, Users, Logs, Settings
│   │   ├── App.jsx           # Routing & Guards (ProtectedRoute, AdminRoute)
│   │   ├── index.css         # Custom scrollbars and transitions
│   │   └── main.jsx
│   ├── index.html
│   ├── nginx.conf            # SPA routing rules for containerization
│   ├── Dockerfile
│   └── package.json
├── database/
│   ├── schema.sql            # Primary database structure schema
│   └── cumta_qa.sqlite       # SQLite local database file (auto-generated)
├── docker-compose.yml
└── README.md
```

---

## 🚀 Getting Started

### 📋 Prerequisites
- Node.js (v18.0.0 or higher)
- NPM (v9.0.0 or higher)
- Docker & Docker Compose (optional, for containerized deployments)

### 🔌 Running Locally (Zero-Configuration Fallback)

The application features a **Zero-Configuration Fallback** mechanism. If a PostgreSQL instance is not configured, the backend will automatically initialize a local SQLite file (`database/cumta_qa.sqlite`) and execute the SQL dialect translation dynamically.

#### 1. Setup the Backend
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Initialize and seed the database with mock observations:
   ```bash
   npm run seed
   ```
4. Start the Express API server:
   ```bash
   npm run dev
   ```
   The API will start running on **`http://localhost:5000`**.

#### 2. Setup the Frontend
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   The web portal will open on **`http://localhost:5173`** (or another port output by Vite).

---

## 🐋 Deploying with Docker Compose (PostgreSQL Production)

To deploy the entire production-grade stack including the PostgreSQL server:

1. Ensure Docker is running.
2. In the project root directory, run:
   ```bash
   docker-compose up --build -d
   ```
3. Initialize the production database tables and default login credentials:
   ```bash
   docker-compose exec backend npm run seed
   ```
4. Access the applications:
   - **Frontend Web Portal**: `http://localhost`
   - **Backend API Docs/Info**: `http://localhost:5000`

---

## 🔑 Default Test Accounts

After running the database seed script, you can log in immediately using these credentials:

| Username | Password | Role | Access Level |
| :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | `admin` | Full CRUD, Analytics, Reports, Settings, Audit logs |
| **`inspector`** | `inspector123` | `field_inspector` | Login, Submit inspection, upload files, view own logs |

---

## 📡 REST API Documentation

Secure all endpoints using standard HTTP Header token injections:
`Authorization: Bearer <your_jwt_token>`

### 1. Authentication
* `POST /api/auth/login` - Authenticate account and receive JWT token.
* `GET /api/auth/me` - Fetch details of logged-in profile.
* `POST /api/auth/reset-password` - Update profile password.
* `GET /api/auth/users` - List all user accounts (Admin only).
* `POST /api/auth/register` - Create user login (Admin only).
* `DELETE /api/auth/users/:id` - Delete user account (Admin only).

### 2. Observations Logs
* `GET /api/observations` - Fetch matching observations with query parameters.
* `POST /api/observations` - Submit observation (handles file uploads, auto-calculates delay differences).
* `GET /api/observations/:id` - View detailed observation data, screenshots, and checklist.
* `PUT /api/observations/:id` - Update audit status and remarks (Admin/Inspector owner).
* `DELETE /api/observations/:id` - Delete observation (Admin only).

### 3. Master Configurations & Analytics
* `GET /api/stations` - Fetch stations. `POST/PUT/DELETE` restricted to admins.
* `GET /api/categories` - Fetch issues. `POST/PUT/DELETE` restricted to admins.
* `GET /api/analytics/dashboard` - Get aggregates, line, bar, pie, and matrix datasets for charts.
* `GET /api/audit` - Inspect user actions logs (Admin only).

### 4. Exports & Reports
* `GET /api/reports/pdf` - Stream styled PDF reports matching active search filters.
* `GET /api/reports/excel` - Stream styled Excel sheets matching search filters.
* `GET /api/reports/csv` - Stream raw CSV matching active filters.
* `POST /api/reports/email` - Simulate SMTP transmission of filtered report details to a recipient email.
