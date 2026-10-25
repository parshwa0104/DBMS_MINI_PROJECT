-- Research Grants Management System
-- seed.sql: Insert sample data
-- Run db.sql first.

USE DBMS_PROJECT;

-- 1. Departments
INSERT INTO DEPARTMENT (department_id, department_name) VALUES
(1, 'Computer Science & Engineering'),
(2, 'Electrical & Electronics Engineering'),
(3, 'Mechanical Engineering'),
(4, 'Biotechnology');

-- 2. Researchers
INSERT INTO RESEARCHER
(researcher_id, researcher_name, department_id, researcher_designation) VALUES
(101, 'Dr. Alan Turing', 1, 'Professor & Lead Researcher'),
(102, 'Dr. Ada Lovelace', 1, 'Associate Professor'),
(103, 'Dr. Grace Hopper', 2, 'Senior Scientist'),
(104, 'Dr. Claude Shannon', 2, 'Professor');

-- 3. Research Projects
INSERT INTO RESEARCH_PROJECT
(project_id, project_title, project_description, project_start_date,
 project_end_date, researcher_id, project_status) VALUES
(201, 'Neural Network Optimization',
 'Research on accelerating neural network inference on edge devices',
 '2025-01-15', '2026-12-31', 101, 'Active'),
(202, 'Quantum Computing Architectures',
 'Exploration of quantum error correction codes and algorithms',
 '2025-03-01', '2027-02-28', 102, 'Active'),
(203, 'NextGen Compiler Systems',
 'Autonomous verification and compiler optimization techniques',
 '2024-08-01', '2025-07-31', 103, 'Completed');

-- 4. Funding Agencies
INSERT INTO FUNDING_AGENCY
(agency_id, agency_name, agency_mail_id, agency_website) VALUES
(301, 'National Science Foundation',
 'contact@nsf.gov', 'www.nsf.gov'),
(302, 'Department of Science and Tech',
 'support@dst.gov.in', 'www.dst.gov.in'),
(303, 'Global AI Research Consortium',
 'grants@gairc.org', 'www.gairc.org');

-- 5. Grant Applications
INSERT INTO GRANT_APPLICATION
(application_id, project_id, agency_id, application_date,
 requested_amount, grant_status) VALUES
(401, 201, 301, '2024-11-10', 80000.00, 'Approved'),
(402, 202, 303, '2024-12-05', 150000.00, 'Approved'),
(403, 203, 302, '2024-06-15', 55000.00, 'Approved'),
(404, 201, 302, '2025-02-01', 40000.00, 'Under Review');

-- 6. Grants
INSERT INTO GRANTS
(grant_id, application_id, approved_amount, approval_date, grant_status) VALUES
(501, 401, 75000.00, '2025-01-10', 'Approved'),
(502, 402, 140000.00, '2025-02-15', 'Active'),
(503, 403, 50000.00, '2024-07-20', 'Completed');

-- 7. Expenses
INSERT INTO EXPENSE
(expense_id, grant_id, category, amount, expense_description) VALUES
(601, 501, 'Equipment', 25000.00, 'Computing equipment'),
(602, 501, 'Software', 10000.00, 'Research software licences'),
(603, 502, 'Equipment', 45000.00, 'Quantum computing equipment'),
(604, 503, 'Travel', 5000.00, 'Research conference travel');

-- 8. Milestones
INSERT INTO MILESTONE
(milestone_id, project_id, milestone_name, due_date, milestone_status) VALUES
(701, 201, 'Model Development', '2026-09-30', 'In Progress'),
(702, 201, 'Performance Evaluation', '2026-11-30', 'Pending'),
(703, 202, 'Architecture Design', '2026-12-15', 'In Progress'),
(704, 203, 'Compiler Testing', '2025-06-30', 'Completed');