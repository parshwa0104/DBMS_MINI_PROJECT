DROP DATABASE IF EXISTS DBMS_PROJECT;
CREATE DATABASE DBMS_PROJECT;
USE DBMS_PROJECT;


DROP TABLE IF EXISTS DEPARTMENT;
CREATE TABLE DEPARTMENT
(
    department_id INT PRIMARY KEY,
    department_name VARCHAR(40) UNIQUE
);


DROP TABLE IF EXISTS RESEARCHER;
CREATE TABLE RESEARCHER
(
    researcher_id INT PRIMARY KEY,
    researcher_name VARCHAR(40) UNIQUE,
    department_id INT,

    FOREIGN KEY (department_id)
    REFERENCES DEPARTMENT(department_id),

    researcher_designation VARCHAR(40)
);


DROP TABLE IF EXISTS RESEARCH_PROJECT;
CREATE TABLE RESEARCH_PROJECT
(
    project_id INT PRIMARY KEY,
    project_title VARCHAR(40) UNIQUE,
    project_description VARCHAR(200),
    project_start_date DATE,
    project_end_date DATE,

    researcher_id INT,
    FOREIGN KEY (researcher_id)
    REFERENCES RESEARCHER(researcher_id),

    project_status VARCHAR(20)
);


DROP TABLE IF EXISTS FUNDING_AGENCY;
CREATE TABLE FUNDING_AGENCY
(
    agency_id INT PRIMARY KEY,
    agency_name VARCHAR(40) UNIQUE,
    agency_mail_id VARCHAR(40) UNIQUE,
    agency_website VARCHAR(40) UNIQUE
);


DROP TABLE IF EXISTS GRANT_APPLICATION;
CREATE TABLE GRANT_APPLICATION
(
    application_id INT PRIMARY KEY,

    project_id INT,
    FOREIGN KEY (project_id)
    REFERENCES RESEARCH_PROJECT(project_id),

    agency_id INT,
    FOREIGN KEY (agency_id)
    REFERENCES FUNDING_AGENCY(agency_id),

    application_date DATE,
    requested_amount DECIMAL(12,2),
    grant_status VARCHAR(20)
);


DROP TABLE IF EXISTS GRANTS;
CREATE TABLE GRANTS
(
    grant_id INT PRIMARY KEY,

    application_id INT,
    FOREIGN KEY (application_id)
    REFERENCES GRANT_APPLICATION(application_id),

    approved_amount DECIMAL(12,2),
    approval_date DATE,
    grant_status VARCHAR(20)
);


DROP TABLE IF EXISTS EXPENSE;
CREATE TABLE EXPENSE
(
    expense_id INT PRIMARY KEY,

    grant_id INT,
    FOREIGN KEY (grant_id)
    REFERENCES GRANTS(grant_id),

    --expense_date VARCHAR(40),

    category VARCHAR(40),
    amount DECIMAL(12,2),
    expense_description VARCHAR(200)
);


DROP TABLE IF EXISTS MILESTONE;
CREATE TABLE MILESTONE
(
    milestone_id INT PRIMARY KEY,

    project_id INT,
    FOREIGN KEY (project_id)
    REFERENCES RESEARCH_PROJECT(project_id),

    milestone_name VARCHAR(40),
    due_date DATE,
    milestone_status VARCHAR(20)
);


-- 1. DEPARTMENT
INSERT INTO DEPARTMENT
VALUES
(1, 'Computer Science'),
(2, 'Mechanical Engineering'),
(3, 'Electronics Engineering');

-- 2. FUNDING_AGENCY
INSERT INTO FUNDING_AGENCY
VALUES
(301, 'National Research Fund',
 'grants@nrf.example', 'https://nrf.example'),
(302, 'Innovation Foundation',
 'research@if.example', 'https://if.example'),
(303, 'Green Energy Council',
 'grants@gec.example', 'https://gec.example');

-- 3. RESEARCHER
INSERT INTO RESEARCHER
VALUES
(101, 'Aarav Sharma', 1, 'Assistant Professor'),
(102, 'Neha Patel', 2, 'Associate Professor'),
(103, 'Rohan Mehta', 3, 'Research Associate');

-- 4. RESEARCH_PROJECT
INSERT INTO RESEARCH_PROJECT
VALUES
(201, 'AI for Healthcare',
 'AI-assisted medical data analysis',
 '2026-01-15', '2027-01-15', 101, 'Active'),
(202, 'Smart Manufacturing',
 'Improving manufacturing efficiency',
 '2026-03-01', '2027-03-01', 102, 'Active'),
(203, 'Solar Energy Storage',
 'Efficient solar energy storage',
 '2026-02-01', '2026-12-31', 103, 'Active');

-- 5. GRANT_APPLICATION
INSERT INTO GRANT_APPLICATION
VALUES
(401, 201, 301, '2026-01-20', 500000.00, 'Approved'),
(402, 202, 302, '2026-03-05', 750000.00, 'Pending'),
(403, 203, 303, '2026-02-10', 600000.00, 'Approved');

-- 6. GRANTS
INSERT INTO GRANTS
VALUES
(501, 401, 450000.00, '2026-02-15', 'Active'),
(502, 403, 550000.00, '2026-03-01', 'Active');

-- 7. EXPENSE
INSERT INTO EXPENSE
VALUES
(601, 501, 'Equipment', 75000.00,
 'Purchase of computing equipment'),
(602, 501, 'Software', 25000.00,
 'Research software licences'),
(603, 502, 'Equipment', 100000.00,
 'Purchase of energy testing equipment');

-- 8. MILESTONE
INSERT INTO MILESTONE
VALUES
(701, 201, 'Data Collection', '2026-05-31', 'Completed'),
(702, 201, 'Model Development', '2026-09-30', 'In Progress'),
(703, 202, 'Prototype Development', '2026-11-30', 'Pending'),
(704, 203, 'Performance Testing', '2026-10-31', 'In Progress');

USE DBMS_PROJECT;

SELECT * FROM DEPARTMENT;
SELECT * FROM FUNDING_AGENCY;
SELECT * FROM RESEARCHER;
SELECT * FROM RESEARCH_PROJECT;
SELECT * FROM GRANT_APPLICATION;
SELECT * FROM GRANTS;
SELECT * FROM EXPENSE;
SELECT * FROM MILESTONE;
