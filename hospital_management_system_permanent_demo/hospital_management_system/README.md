# Hospital Management System (Mini Project)

A learning/demo Hospital Management System built with **React + Vite**, **Node.js + Express**, and **MySQL**.

## Included
- Separate staff and patient login screens.
- Staff roles: admin, doctor, nurse, receptionist, lab technician.
- Role-based API permissions (enforced on the server, not just hidden in the UI).
- Patient records and admission/discharge workflow.
- Lab tests, sample status, investigations, and medication records.
- Specialist referral suggestions. Suggestions are not confirmed referrals until the treating doctor approves them.
- Fictional demo records only.

> This is an educational demo, not a production system. Do not enter real patient information. A real hospital deployment needs security review, audit logging, backups, privacy/legal compliance, and stronger identity verification.

## Requirements
- Node.js 18 or newer
- MySQL 8 or compatible
- npm

## 1. Create the database
Open MySQL Workbench or the MySQL command line and run `database/schema.sql`.

The script creates the `hospital_management` database and demo tables/data.

## 2. Configure the server
Open `server/.env.example`, copy it to `server/.env`, and set your MySQL username/password and a long random JWT secret.

Example:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hospital_management
JWT_SECRET=replace_this_with_a_long_random_secret
```

## 3. Start the backend
```bash
cd server
npm install
npm run dev
```
The API runs at `http://localhost:5000`.

## 4. Start the frontend
Open a second terminal:
```bash
cd client
npm install
npm run dev
```
Open the URL printed by Vite (usually `http://localhost:5173`).

## Demo login details
All demo accounts use password `Demo@123`.

### Staff
| Role | Username |
|---|---|
| Admin | `admin` |
| Doctor | `doctor1` |
| Nurse | `nurse1` |
| Receptionist | `reception1` |
| Lab technician | `lab1` |

### Patient
- Name: `Aarav Sharma`
- Email: `aarav@example.com`
- UHID: `UHID1001`

Patient demo login is intentionally a simple classroom demonstration. It is not suitable for real patient authentication.

## Main permissions
- **Admin:** overview, staff/patient records, admission/discharge, all clinical records.
- **Doctor:** view patients, add medication/investigation/referral suggestions, approve referrals.
- **Nurse:** view patients and update sample status / nursing notes.
- **Receptionist:** register patients and manage admission/discharge.
- **Lab technician:** view lab requests and update sample/test status.
- **Patient:** view only their own profile, admission, doctors, lab records, investigations, and medications.

## API overview
- `POST /api/auth/staff-login`
- `POST /api/auth/patient-login`
- `GET /api/dashboard`
- `GET /api/patients`
- `POST /api/patients`
- `PATCH /api/patients/:id/admission`
- `GET /api/patients/:id/records`
- `POST /api/patients/:id/medications`
- `POST /api/patients/:id/investigations`
- `POST /api/patients/:id/referrals/suggest`
- `PATCH /api/referrals/:id/approve`
- `GET /api/lab-requests`
- `PATCH /api/lab-requests/:id/status`

## Troubleshooting
- **`USE hospital_management` fails:** run the complete `database/schema.sql` script first; it creates the database.
- **`nodemon app crashed`:** check that `server/.env` exists, MySQL is running, credentials are correct, and `npm install` completed inside `server`.
- **Frontend cannot reach API:** keep backend running on port 5000. The Vite dev server proxies `/api` to it.
- **Blank page:** open browser DevTools → Console and check for errors. Confirm `npm install` completed inside `client`.


## Keeping demo access available
Demo accounts and patient records remain in MySQL after closing the app or restarting the computer. Run `npm run seed` once after importing the database, or again if the database is reset. Demo sign-in sessions last 30 days; after that, sign in again. This is for classroom demonstration only, not real patient data.
