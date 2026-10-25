# Research Grant Management System (DBMS Mini Project)

A full-stack web application to manage and track institutional research grants, researchers, departments, and funding agencies featuring role-based access control and SQL triggers.

---

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database & Seed Data
Execute the schema and seed files in MySQL:
```bash
mysql -u root -p < db.sql
mysql -u root -p < seed.sql
```
*(This creates `DBMS_PROJECT`, all tables, 4 automated triggers, and seed data including hashed demo accounts).*

### 3. Configure Environment Variables
Create or verify your `.env` file in the root folder:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=DBMS_PROJECT
DB_PORT=3306
SESSION_SECRET=dbms-secret-key-2025
```

### 4. Start the Application
```bash
npm run dev
# or: npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 👥 Demo User Accounts

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full control: CRUD on grants, audit log |
| **Researcher** | `turing` | `researcher123` | Read-only: View personal grants |
| **Faculty** | `dean_cse` | `faculty123` | Read-only: View department grants |

---

## ⚡ Database Triggers
1. **Budget Guard** (`trg_expense_budget_guard`): Blocks expenses that exceed the approved grant limit.
2. **Milestone Auto-Completion** (`trg_milestone_project_status`): Automatically marks a research project as "Completed" when all its milestones are completed.
3. **Grant Application Sync** (`trg_grant_application_sync`): Automatically updates application status to "Approved" when a grant is issued.
4. **Audit Log** (`trg_grant_audit_update` & `trg_grant_audit_delete`): Records every update and deletion on grants into an immutable `AUDIT_LOG` table with JSON snapshots.

---

## 🛠 Documentation
See [`WALKTHROUGH.md`](./WALKTHROUGH.md) for detailed architecture, endpoint documentation, and code explanations.
