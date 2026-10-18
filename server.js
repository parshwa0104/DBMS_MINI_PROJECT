import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// Health/status endpoint
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

// GET all grants or search
app.get("/api/grants", async (req, res) => {
    const { search } = req.query;
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
                fa.agency_name
            FROM GRANTS g
            LEFT JOIN GRANT_APPLICATION ga ON g.application_id = ga.application_id
            LEFT JOIN RESEARCH_PROJECT rp ON ga.project_id = rp.project_id
            LEFT JOIN RESEARCHER r ON rp.researcher_id = r.researcher_id
            LEFT JOIN FUNDING_AGENCY fa ON ga.agency_id = fa.agency_id
        `;
        let params = [];

        if (search && search.trim() !== "") {
            const term = `%${search.trim()}%`;
            query += `
                WHERE CAST(g.grant_id AS CHAR) LIKE ?
                   OR CAST(g.application_id AS CHAR) LIKE ?
                   OR g.grant_status LIKE ?
                   OR rp.project_title LIKE ?
                   OR r.researcher_name LIKE ?
                   OR fa.agency_name LIKE ?
            `;
            params = [term, term, term, term, term, term];
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
app.get("/api/grants/:id", async (req, res) => {
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
app.get("/api/applications", async (req, res) => {
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

// POST insert new grant
app.post("/api/grants", async (req, res) => {
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

// PUT update existing grant
app.put("/api/grants/:id", async (req, res) => {
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

// DELETE grant
app.delete("/api/grants/:id", async (req, res) => {
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

// Default route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});