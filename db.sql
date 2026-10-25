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