# Research Grant Management System — Codebase Walkthrough

This guide explains how each file in this project is organized, what every function does, how the frontend and backend communicate, and how the database triggers and authentication system work.

---

## 📁 Project Structure Overview

```text
miniproject_dbms/
├── server.js          # Express backend API, session auth, role middleware & MySQL pool
├── index.html         # Main dashboard layout (User Bar, Header, Role-Aware Nav, Display)
├── index.js           # Frontend dashboard logic (auth guard, role views, CRUD, audit log)
├── login.html         # Login page UI with demo account credentials
├── login.js           # Login form submission & session initialization
├── styles.css         # Styling (dashboard, cards, tables, forms, badges, login, audit)
├── db.sql             # Relational database schema, tables, foreign keys & 4 SQL triggers
├── seed.sql           # Initial dataset: departments, researchers, grants, users (bcrypt)
├── package.json       # Node.js project configuration, dependencies, and scripts
├── .env               # Database connection settings & session secret (gitignored)
└── .env.example       # Template for .env configuration
```

---

## 1. Authentication & Role-Based Access Control (RBAC)

The system supports 3 distinct user roles with varying permissions:

| Role | Permissions | Navigation Buttons Visible |
|---|---|---|
| **Admin** | Full system control: Insert, Update, Delete grants, View Audit Log, and Search | Insert, Search, Update, Delete, View Audit Log |
| **Researcher** | Scoped access: View grants linked to their own projects / research | Search Existing Grants (filtered) |
| **Faculty** | Departmental oversight: View grants within their department | Search Existing Grants (department-scoped) |

### Demo Accounts (`seed.sql`)
- **Admin**: `admin` / `admin123`
- **Researcher**: `turing` / `researcher123` (Dr. Alan Turing, CSE Dept)
- **Researcher**: `lovelace` / `researcher123` (Dr. Ada Lovelace, CSE Dept)
- **Researcher**: `hopper` / `researcher123` (Dr. Grace Hopper, EEE Dept)
- **Faculty**: `dean_cse` / `faculty123` (Prof. John von Neumann, CSE Dean)
- **Faculty**: `dean_eee` / `faculty123` (Prof. Nikola Tesla, EEE Dean)

---

## 2. Database Schema & SQL Triggers (`db.sql`)

The database consists of 10 tables and 4 automated triggers:

### Tables
1. `DEPARTMENT` — Academic departments (CSE, EEE, MECH, etc.)
2. `RESEARCHER` — Faculty members and primary investigators
3. `RESEARCH_PROJECT` — Projects undertaken by researchers
4. `FUNDING_AGENCY` — Government / private grant sponsors (e.g., SERB, DST, ISRO)
5. `GRANT_APPLICATION` — Proposals submitted to agencies
6. `GRANTS` — Approved research grants with allocated amounts and dates
7. `EXPENSE` — Expenditures billed against specific grants
8. `MILESTONE` — Project deliverables and deadlines
9. `USERS` — User accounts with role (`Admin`, `Researcher`, `Faculty`), bcrypt password hash, and FK links
10. `AUDIT_LOG` — Immutable record of updates and deletions on the `GRANTS` table

### SQL Triggers

#### 1. `trg_expense_budget_guard` (`BEFORE INSERT ON EXPENSE`)
- **Purpose**: Prevents budget overruns.
- **Mechanism**: Calculates `SUM(amount)` of existing expenses for the grant. If `current_total + NEW.amount > approved_amount`, it aborts the insert with `SIGNAL SQLSTATE '45000'` and error message:
  `BUDGET_EXCEEDED: Total expenses would exceed the approved grant amount.`

#### 2. `trg_milestone_project_status` (`AFTER UPDATE ON MILESTONE`)
- **Purpose**: Automates project lifecycle tracking.
- **Mechanism**: Whenever a milestone status is modified, checks if all milestones for that `project_id` have `milestone_status = 'Completed'`. If yes, it automatically sets `RESEARCH_PROJECT.project_status = 'Completed'`.

#### 3. `trg_grant_application_sync` (`AFTER INSERT ON GRANTS`)
- **Purpose**: Keeps grant application status synchronized with actual grant allocation.
- **Mechanism**: When a grant record is created, automatically updates `GRANT_APPLICATION.grant_status = 'Approved'` for the corresponding `application_id`.

#### 4. `trg_grant_audit_update` & `trg_grant_audit_delete` (`AFTER UPDATE / DELETE ON GRANTS`)
- **Purpose**: Compliance and historical tracking.
- **Mechanism**: Automatically logs the action (`UPDATE` or `DELETE`), timestamp, and JSON snapshots of `old_values` and `new_values` into the `AUDIT_LOG` table.

---

## 3. Backend Architecture (`server.js`)

This file sets up the **Express.js server**, connects to MySQL via a connection pool, manages sessions with `express-session`, and exposes secured RESTful API endpoints.

### Authentication Middleware
- **`requireAuth`**: Ensures requests come from an active session; returns HTTP 401 if not logged in.
- **`requireRole(...roles)`**: Restricts access to specified roles (e.g., Admin-only); returns HTTP 403 for unauthorized roles.

### API Endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/status` | Public | Checks database connection health |
| `POST` | `/api/login` | Public | Validates username and password via `bcrypt.compare`, creates session |
| `POST` | `/api/logout` | Authenticated | Destroys current session and clears cookie |
| `GET` | `/api/me` | Authenticated | Returns current session user information |
| `GET` | `/api/grants` | Authenticated | Lists grants, filtered automatically based on user role (Admin sees all, Researcher sees own, Faculty sees department) |
| `GET` | `/api/grants/:id` | Authenticated | Retrieves a single grant by ID |
| `GET` | `/api/applications` | Authenticated | Returns application IDs for form dropdowns |
| `POST` | `/api/grants` | **Admin only** | Inserts a new grant record |
| `PUT` | `/api/grants/:id` | **Admin only** | Updates an existing grant |
| `DELETE` | `/api/grants/:id` | **Admin only** | Deletes a grant record |
| `GET` | `/api/audit-log` | **Admin only** | Retrieves recent audit log entries |

---

## 4. Frontend Architecture

### Login System (`login.html` & `login.js`)
- Dedicated sign-in page styled to match the blue theme.
- Submits credentials via JSON `POST /api/login`.
- Displays inline error alerts if invalid credentials are submitted.
- Auto-redirects to `/index.html` upon successful authentication.
- Includes quick-reference demo credentials for presentations.

### Main Dashboard (`index.html` & `index.js`)
- **`initAuth()`**: Runs on DOM load; verifies session via `/api/me`. If unauthenticated, immediately redirects to `/login.html`.
- **User Info Bar**: Displays user full name, role badge (`Admin`, `Researcher`, `Faculty`), and a **Logout** button.
- **Role-Aware UI**:
  - Non-Admin users only see **SEARCH EXISTING GRANTS**; administrative action buttons (Insert, Update, Delete, View Audit Log) are hidden.
  - Table action columns (Edit/Delete icons) are hidden for non-Admins.
- **View Renderers**:
  - `renderSearchGrants()`: Real-time search, responsive table with formatted currency (₹ INR) and status badges.
  - `renderInsertGrant()`: Modal form with validation and application selector.
  - `renderUpdateGrant()`: Prefills existing grant details, locks primary key.
  - `renderDeleteGrant()`: Confirmation prompt before record removal.
  - `renderAuditLog()`: Admin-only audit log table showing historical updates and deletions with JSON field diffs.

---

## 5. Visual Styling (`styles.css`)

Vanilla CSS design featuring:
- **Consistent Blue Gradient Background**: `#e0f2fe` to `#bae6fd`.
- **Card Panels & Elevation**: Rounded corners (`14px`/`16px`) and subtle drop shadows.
- **Role Badges**: Purple for Admin, Blue for Researcher, Green for Faculty.
- **Status Badges**: Color-coded pill badges for Approved, Pending, Completed, Rejected.
- **Responsive Layout**: Adapts gracefully across desktop and laptop screens.

---

## 6. Running the Project Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Setup environment variables**:
   Copy `.env.example` to `.env` and fill in your MySQL credentials:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=DBMS_PROJECT
   DB_PORT=3306
   SESSION_SECRET=dbms-secret-key-2025
   ```
3. **Initialize database & triggers**:
   Run `db.sql` then `seed.sql` in MySQL Workbench or MySQL CLI:
   ```bash
   mysql -u root -p < db.sql
   mysql -u root -p < seed.sql
   ```
4. **Start the application**:
   ```bash
   npm start
   # or for development mode:
   npm run dev
   ```
5. **Open in browser**:
   Navigate to `http://localhost:3000` and sign in with any demo account!
