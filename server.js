import express from "express";
// Express Server for DBMS Project
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import bcrypt from "bcryptjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (must be before routes)
app.use(session({
    secret: process.env.SESSION_SECRET || "dbms-project-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

// Serve static files
app.use(express.static(__dirname));

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "DBMS_PROJECT",
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Check DB Connection on start
let dbConnected = false;
let dbErrorMsg = "";

async function checkDbConnection() {
    try {
        const conn = await pool.getConnection();
        dbConnected = true;
        dbErrorMsg = "";
        console.log(`[DB] Successfully connected to MySQL database: ${process.env.DB_NAME || "DBMS_PROJECT"}`);
        conn.release();
    } catch (err) {
        dbConnected = false;
        dbErrorMsg = err.message;
        console.warn(`[DB WARNING] Could not connect to MySQL: ${err.message}`);
        console.warn(`[DB WARNING] Please verify MySQL is running on port ${process.env.DB_PORT || 3306} and check .env settings.`);
    }
}
checkDbConnection();


// ============================================
// AUTH MIDDLEWARE
// ============================================

// Check if user is logged in
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, error: "Not authenticated. Please log in." });
    }
    next();
}

// Check if user has one of the required roles
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({ success: false, error: "Not authenticated. Please log in." });
        }
        if (!roles.includes(req.session.user.role)) {
            return res.status(403).json({ success: false, error: "Insufficient permissions for this action." });
        }
        next();
    };
}


// ============================================
// AUTH ROUTES
// ============================================

// POST /api/login
app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: "Username and password are required." });
        }

        const [rows] = await pool.query(
            "SELECT * FROM USERS WHERE username = ?",
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: "Invalid username or password." });
        }

        const user = rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            return res.status(401).json({ success: false, error: "Invalid username or password." });
        }

        // Store user info in session (exclude password_hash)
        req.session.user = {
            user_id: user.user_id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            researcher_id: user.researcher_id,
            department_id: user.department_id,
        };

        res.json({
            success: true,
            message: `Welcome, ${user.full_name}!`,
            user: req.session.user,
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, error: "Server error during login." });
    }
});

// POST /api/logout
app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, error: "Could not log out." });
        }
        res.clearCookie("connect.sid");
        res.json({ success: true, message: "Logged out successfully." });
    });
});

// GET /api/me — get current logged-in user info
app.get("/api/me", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, error: "Not authenticated." });
    }
    res.json({ success: true, user: req.session.user });
});


// ============================================
// HEALTH / STATUS
// ============================================

app.get("/api/status", async (req, res) => {
    try {
        const conn = await pool.getConnection();
        conn.release();
        res.json({ connected: true, message: "Database connected successfully" });
    } catch (err) {
        res.json({
            connected: false,
            message: `MySQL not connected: ${err.message}. Check your MySQL server and .env settings.`,
        });
    }
});


// ============================================
// GRANT ROUTES (with auth guards)
// ============================================

// GET all grants or search
app.get("/api/grants", requireAuth, async (req, res) => {
    const { search } = req.query;
    const user = req.session.user;

    try {
        let query = `
            SELECT 
                g.grant_id,
                g.application_id,
                g.approved_amount,
                g.approval_date,
                g.grant_status,
                ga.project_id,
                rp.project_title,
                r.researcher_name,
                r.researcher_id,
                r.department_id AS researcher_dept_id,
                fa.agency_name
            FROM GRANTS g
            LEFT JOIN GRANT_APPLICATION ga ON g.application_id = ga.application_id
            LEFT JOIN RESEARCH_PROJECT rp ON ga.project_id = rp.project_id
            LEFT JOIN RESEARCHER r ON rp.researcher_id = r.researcher_id
            LEFT JOIN FUNDING_AGENCY fa ON ga.agency_id = fa.agency_id
        `;
        let conditions = [];
        let params = [];

        // Role-based filtering
        if (user.role === "Researcher" && user.researcher_id) {
            conditions.push("r.researcher_id = ?");
            params.push(user.researcher_id);
        } else if (user.role === "Faculty" && user.department_id) {
            conditions.push("r.department_id = ?");
            params.push(user.department_id);
        }

        if (search && search.trim() !== "") {
            const term = `%${search.trim()}%`;
            const searchCondition = `(
                CAST(g.grant_id AS CHAR) LIKE ?
                OR CAST(g.application_id AS CHAR) LIKE ?
                OR g.grant_status LIKE ?
                OR rp.project_title LIKE ?
                OR r.researcher_name LIKE ?
                OR fa.agency_name LIKE ?
            )`;
            conditions.push(searchCondition);
            params.push(term, term, term, term, term, term);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += ` ORDER BY g.grant_id DESC`;

        try {
            const [rows] = await pool.query(query, params);
            return res.json({ success: true, data: rows });
        } catch (joinError) {
            // Fallback to simple SELECT from GRANTS if joined tables do not exist yet
            console.warn("Full join query failed, falling back to simple query:", joinError.message);
            let simpleQuery = `SELECT * FROM GRANTS`;
            let simpleParams = [];
            if (search && search.trim() !== "") {
                simpleQuery += ` WHERE CAST(grant_id AS CHAR) LIKE ? OR grant_status LIKE ?`;
                simpleParams = [`%${search.trim()}%`, `%${search.trim()}%`];
            }
            simpleQuery += ` ORDER BY grant_id DESC`;
            const [simpleRows] = await pool.query(simpleQuery, simpleParams);
            return res.json({ success: true, data: simpleRows });
        }
    } catch (err) {
        console.error("Error fetching grants:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET a single grant by ID
app.get("/api/grants/:id", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query("SELECT * FROM GRANTS WHERE grant_id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: `Grant with ID ${id} not found` });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET available applications for dropdown/reference
app.get("/api/applications", requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                ga.application_id, 
                ga.project_id, 
                ga.requested_amount, 
                ga.grant_status,
                rp.project_title 
            FROM GRANT_APPLICATION ga
            LEFT JOIN RESEARCH_PROJECT rp ON ga.project_id = rp.project_id
            ORDER BY ga.application_id ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        // Table may not exist yet or error
        res.json({ success: false, data: [] });
    }
});

// POST insert new grant — Admin only
app.post("/api/grants", requireRole("Admin"), async (req, res) => {
    try {
        const { grant_id, application_id, approved_amount, approval_date, grant_status } = req.body;

        if (!grant_id || !application_id || approved_amount === undefined || !approval_date || !grant_status) {
            return res.status(400).json({ success: false, error: "All fields are required" });
        }

        const [result] = await pool.query(
            `INSERT INTO GRANTS (grant_id, application_id, approved_amount, approval_date, grant_status) 
             VALUES (?, ?, ?, ?, ?)`,
            [Number(grant_id), Number(application_id), Number(approved_amount), approval_date, grant_status]
        );

        res.status(201).json({
            success: true,
            message: `Grant #${grant_id} inserted successfully!`,
            insertedId: grant_id,
        });
    } catch (err) {
        console.error("Error inserting grant:", err);
        let errorMsg = err.message;
        if (err.code === "ER_DUP_ENTRY") {
            errorMsg = `A grant with ID ${req.body.grant_id} already exists.`;
        } else if (err.code === "ER_NO_REFERENCED_ROW_2") {
            errorMsg = `Application ID ${req.body.application_id} does not exist in GRANT_APPLICATION. Please use a valid application_id.`;
        }
        res.status(400).json({ success: false, error: errorMsg });
    }
});

// PUT update existing grant — Admin only
app.put("/api/grants/:id", requireRole("Admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const { application_id, approved_amount, approval_date, grant_status } = req.body;

        if (!application_id || approved_amount === undefined || !approval_date || !grant_status) {
            return res.status(400).json({ success: false, error: "All fields are required" });
        }

        const [result] = await pool.query(
            `UPDATE GRANTS 
             SET application_id = ?, approved_amount = ?, approval_date = ?, grant_status = ? 
             WHERE grant_id = ?`,
            [Number(application_id), Number(approved_amount), approval_date, grant_status, Number(id)]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: `Grant #${id} was not found.` });
        }

        res.json({ success: true, message: `Grant #${id} updated successfully!` });
    } catch (err) {
        console.error("Error updating grant:", err);
        let errorMsg = err.message;
        if (err.code === "ER_NO_REFERENCED_ROW_2") {
            errorMsg = `Application ID ${req.body.application_id} does not exist in GRANT_APPLICATION.`;
        }
        res.status(400).json({ success: false, error: errorMsg });
    }
});

// DELETE grant — Admin only
app.delete("/api/grants/:id", requireRole("Admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query("DELETE FROM GRANTS WHERE grant_id = ?", [Number(id)]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: `Grant #${id} was not found.` });
        }

        res.json({ success: true, message: `Grant #${id} deleted successfully!` });
    } catch (err) {
        console.error("Error deleting grant:", err);
        let errorMsg = err.message;
        if (err.code === "ER_ROW_IS_REFERENCED_2") {
            errorMsg = `Cannot delete Grant #${req.params.id} because it has associated EXPENSE records.`;
        }
        res.status(400).json({ success: false, error: errorMsg });
    }
});


// ============================================
// AUDIT LOG ROUTE — Admin only
// ============================================

app.get("/api/audit-log", requireRole("Admin"), async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM AUDIT_LOG ORDER BY changed_at DESC LIMIT 100"
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error("Error fetching audit log:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});


// ============================================
// PAGE ROUTING
// ============================================

// Default route — serve login or main page based on session
app.get("/", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, "index.html"));
    } else {
        res.sendFile(path.join(__dirname, "login.html"));
    }
});

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});