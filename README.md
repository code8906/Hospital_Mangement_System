# Hospital_Mangement_System
Full-stack Hospital Management ERP System built with React, Node.js, Express, and MySQL. Features staff and patient portals, role-based access, smart specialty routing, specialist referral approvals, and CRUD operations.


# 🏥 Hospital Management System (ERP)

A full-stack Hospital Management ERP web application built with **React**, **Node.js**, **Express**, and **MySQL**. Designed to manage patient admissions, clinical records, multi-specialty consultations, specialist referrals, and database-driven CRUD workflows.

## 🚀 Key Features

* **Dual Login Portals:** Separate login flows for staff (username/password) and patients (Name, Email, and UHID demo access).
* **Role-Based Staff Dashboard:** Supports roles including Admin, Doctor, Nurse, Receptionist, and Lab Technician with role-specific workflows.
* **Patient Dashboard:** Displays patient demographics, UHID, IPD number, room number, admission status, attending doctors, samples, lab investigations, and medication phases.
* **Specialty Routing & Specialist Referrals:** Supports multi-specialty care (including age/gender specialty rules, Physician routing for high blood pressure, and Physiotherapy support for orthopedic body pain) with a referral suggestion and approval workflow.
* **CRUD & Search:** Built on a relational MySQL schema (`database/schema.sql`) with patient search/filtering and record management.

## 🛠️ Tech Stack

* **Frontend:** React, Axios, HTML5, CSS3
* **Backend:** Node.js, Express
* **Database:** MySQL

## ⚙️ Setup & Running

1. **Database Setup:** Import `database/schema.sql` into MySQL.
2. **Backend:** Navigate to `server/`, install dependencies (`npm install`), configure your MySQL connection settings, and run `npm start` (runs on `http://localhost:5000`).
3. **Frontend:** Navigate to `client/`, install dependencies (`npm install`), and run `npm start` (runs on `http://localhost:3000`).
