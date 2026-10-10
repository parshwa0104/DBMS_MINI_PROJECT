DROP DATABASE IF EXISTS DBMS_PROJECT;
CREATE DATABASE DBMS_PROJECT;
USE DBMS_PROJECT;


DROP TABLE IF EXISTS DEPARTMENT;
CREATE TABLE DEPARTMENT
(
    depatrtment_id INT PRIMARY KEY,
    depatrtment_name VARCHAR(40) UNIQUE
);


DROP TABLE IF EXISTS RESEARCHER;
CREATE TABLE RESEARCHER
(
    reseacrher_id INT PRIMARY KEY,
    reseacrher_name VARCHAR(40) UNIQUE,
    depatrtment_id INT,

    FOREIGN KEY (depatrtment_id)
    REFERENCES DEPARTMENT(depatrtment_id),

    reseacrher_designation VARCHAR(40)
);


DROP TABLE IF EXISTS RESEARCH_PROJECT;
CREATE TABLE RESEARCH_PROJECT
(
    project_id INT PRIMARY KEY,
    project_title VARCHAR(40) UNIQUE,
    project_description VARCHAR(200),
    project_start_date DATE,
    project_end_date DATE,

    reseacrher_id INT,
    FOREIGN KEY (reseacrher_id)
    REFERENCES RESEARCHER(reseacrher_id),

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


