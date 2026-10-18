# Research Grant Management System (DBMS Mini Project)

A full-stack web application to manage and track institutional research grants, researchers, and funding agencies.

---

## 🚀 Quick Setup on MySQL Machine

Follow these simple steps to run the project on a machine with MySQL installed:

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database
Open MySQL terminal / Workbench and run the database script:
```bash
mysql -u root -p < db.sql
```
*(This creates the `DBMS_PROJECT` database, all tables, and inserts initial records).*

### 3. Configure Environment Variables
Create or check the `.env` file in the root folder:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=DBMS_PROJECT
DB_PORT=3306
```
*(If the MySQL `root` user has no password, leave `DB_PASSWORD=` blank).*

### 4. Start the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in any web browser.

---

## 🛠 Features
- **Insert New Grant**: Add grants with application lookup and input validation.
- **Search Existing Grants**: View dynamic table with formatted amounts, status badges, and search filtering.
- **Update Existing Grant**: Edit approved amounts, approval dates, and statuses.
- **Delete Existing Grant**: Permanently remove grant records with confirmation.
- **Codebase Walkthrough**: See [`WALKTHROUGH.md`](./WALKTHROUGH.md) for full architecture and function explanations.
