-- Research Grants Management System
-- db.sql: Create database and tables
-- Run this file before seed.sql.

CREATE DATABASE IF NOT EXISTS DBMS_PROJECT;
USE DBMS_PROJECT;

-- 1. Department
CREATE TABLE IF NOT EXISTS DEPARTMENT
(
    department_id INT PRIMARY KEY,
    department_name VARCHAR(40) UNIQUE
);

-- 2. Researcher
CREATE TABLE IF NOT EXISTS RESEARCHER
(
    researcher_id INT PRIMARY KEY,
    researcher_name VARCHAR(40) UNIQUE,
    department_id INT,
    researcher_designation VARCHAR(40),

    FOREIGN KEY (department_id)
        REFERENCES DEPARTMENT(department_id)
);

-- 3. Research Project
CREATE TABLE IF NOT EXISTS RESEARCH_PROJECT
(
    project_id INT PRIMARY KEY,
    project_title VARCHAR(40) UNIQUE,
    project_description VARCHAR(200),
    project_start_date DATE,
    project_end_date DATE,
    researcher_id INT,
    project_status VARCHAR(20),

    FOREIGN KEY (researcher_id)
        REFERENCES RESEARCHER(researcher_id)
);

-- 4. Funding Agency
CREATE TABLE IF NOT EXISTS FUNDING_AGENCY
(
    agency_id INT PRIMARY KEY,
    agency_name VARCHAR(40) UNIQUE,
    agency_mail_id VARCHAR(40) UNIQUE,
    agency_website VARCHAR(40) UNIQUE
);

-- 5. Grant Application
CREATE TABLE IF NOT EXISTS GRANT_APPLICATION
(
    application_id INT PRIMARY KEY,
    project_id INT,
    agency_id INT,
    application_date DATE,
    requested_amount DECIMAL(12,2),
    grant_status VARCHAR(20),

    FOREIGN KEY (project_id)
        REFERENCES RESEARCH_PROJECT(project_id),

    FOREIGN KEY (agency_id)
        REFERENCES FUNDING_AGENCY(agency_id)
);

-- 6. Grants
CREATE TABLE IF NOT EXISTS GRANTS
(
    grant_id INT PRIMARY KEY,
    application_id INT,
    approved_amount DECIMAL(12,2),
    approval_date DATE,
    grant_status VARCHAR(20),

    FOREIGN KEY (application_id)
        REFERENCES GRANT_APPLICATION(application_id)
);

-- 7. Expense
CREATE TABLE IF NOT EXISTS EXPENSE
(
    expense_id INT PRIMARY KEY,
    grant_id INT,
    category VARCHAR(40),
    amount DECIMAL(12,2),
    expense_description VARCHAR(200),

    FOREIGN KEY (grant_id)
        REFERENCES GRANTS(grant_id)
);

-- 8. Milestone
CREATE TABLE IF NOT EXISTS MILESTONE
(
    milestone_id INT PRIMARY KEY,
    project_id INT,
    milestone_name VARCHAR(40),
    due_date DATE,
    milestone_status VARCHAR(20),

    FOREIGN KEY (project_id)
        REFERENCES RESEARCH_PROJECT(project_id)
);

-- 9. Users (Authentication & Role-Based Access)
CREATE TABLE IF NOT EXISTS USERS
(
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('Admin', 'Researcher', 'Faculty') NOT NULL DEFAULT 'Researcher',
    researcher_id INT NULL,
    department_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (researcher_id) REFERENCES RESEARCHER(researcher_id),
    FOREIGN KEY (department_id) REFERENCES DEPARTMENT(department_id)
);

-- 10. Audit Log (Trigger-populated)
CREATE TABLE IF NOT EXISTS AUDIT_LOG
(
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    action ENUM('UPDATE', 'DELETE') NOT NULL,
    old_values JSON,
    new_values JSON,
    changed_by VARCHAR(50) DEFAULT 'SYSTEM',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger 1: Budget Guard — prevent expenses exceeding approved grant amount
DROP TRIGGER IF EXISTS trg_expense_budget_guard;
DELIMITER //
CREATE TRIGGER trg_expense_budget_guard
BEFORE INSERT ON EXPENSE
FOR EACH ROW
BEGIN
    DECLARE current_total DECIMAL(12,2);
    DECLARE budget_limit DECIMAL(12,2);

    SELECT approved_amount INTO budget_limit
    FROM GRANTS WHERE grant_id = NEW.grant_id;

    SELECT COALESCE(SUM(amount), 0) INTO current_total
    FROM EXPENSE WHERE grant_id = NEW.grant_id;

    IF (current_total + NEW.amount) > budget_limit THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'BUDGET_EXCEEDED: Total expenses would exceed the approved grant amount.';
    END IF;
END //
DELIMITER ;


-- Trigger 2: Auto-complete project when all milestones are completed
DROP TRIGGER IF EXISTS trg_milestone_project_status;
DELIMITER //
CREATE TRIGGER trg_milestone_project_status
AFTER UPDATE ON MILESTONE
FOR EACH ROW
BEGIN
    DECLARE total_milestones INT;
    DECLARE completed_milestones INT;

    SELECT COUNT(*), SUM(CASE WHEN milestone_status = 'Completed' THEN 1 ELSE 0 END)
    INTO total_milestones, completed_milestones
    FROM MILESTONE WHERE project_id = NEW.project_id;

    IF total_milestones > 0 AND total_milestones = completed_milestones THEN
        UPDATE RESEARCH_PROJECT
        SET project_status = 'Completed'
        WHERE project_id = NEW.project_id;
    END IF;
END //
DELIMITER ;


-- Trigger 3: Sync grant application status when a grant is inserted
DROP TRIGGER IF EXISTS trg_grant_application_sync;
DELIMITER //
CREATE TRIGGER trg_grant_application_sync
AFTER INSERT ON GRANTS
FOR EACH ROW
BEGIN
    UPDATE GRANT_APPLICATION
    SET grant_status = 'Approved'
    WHERE application_id = NEW.application_id;
END //
DELIMITER ;


-- Trigger 4a: Audit log for grant updates
DROP TRIGGER IF EXISTS trg_grant_audit_update;
DELIMITER //
CREATE TRIGGER trg_grant_audit_update
AFTER UPDATE ON GRANTS
FOR EACH ROW
BEGIN
    INSERT INTO AUDIT_LOG (table_name, record_id, action, old_values, new_values)
    VALUES (
        'GRANTS',
        OLD.grant_id,
        'UPDATE',
        JSON_OBJECT(
            'application_id', OLD.application_id,
            'approved_amount', OLD.approved_amount,
            'approval_date', OLD.approval_date,
            'grant_status', OLD.grant_status
        ),
        JSON_OBJECT(
            'application_id', NEW.application_id,
            'approved_amount', NEW.approved_amount,
            'approval_date', NEW.approval_date,
            'grant_status', NEW.grant_status
        )
    );
END //
DELIMITER ;


-- Trigger 4b: Audit log for grant deletions
DROP TRIGGER IF EXISTS trg_grant_audit_delete;
DELIMITER //
CREATE TRIGGER trg_grant_audit_delete
AFTER DELETE ON GRANTS
FOR EACH ROW
BEGIN
    INSERT INTO AUDIT_LOG (table_name, record_id, action, old_values, new_values)
    VALUES (
        'GRANTS',
        OLD.grant_id,
        'DELETE',
        JSON_OBJECT(
            'application_id', OLD.application_id,
            'approved_amount', OLD.approved_amount,
            'approval_date', OLD.approval_date,
            'grant_status', OLD.grant_status
        ),
        NULL
    );
END //
DELIMITER ;