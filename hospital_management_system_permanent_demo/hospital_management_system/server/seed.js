require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  const conn = await db.getConnection();
  try {
    const accounts = [
      ['admin','Hospital Admin','admin',null],
      ['doctor1','Dr. Meera Joshi','doctor','Physician'],
      ['nurse1','Anita Verma','nurse',null],
      ['reception1','Rohit Singh','receptionist',null],
      ['lab1','Kavita Rao','lab_technician',null]
    ];
    const hash = await bcrypt.hash('Demo@123', 10);
    for (const [username, fullName, role, specialty] of accounts) {
      await conn.execute(
        `INSERT INTO staff (username,password_hash,full_name,role,specialty)
         VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), role=VALUES(role), specialty=VALUES(specialty)`,
        [username, hash, fullName, role, specialty]
      );
    }

    const [doctors] = await conn.execute("SELECT id FROM staff WHERE username='doctor1'");
    const doctorId = doctors[0].id;
    await conn.execute(
      `INSERT INTO patients (uhid,full_name,email,age,gender,mobile,address,treating_doctor_id)
       VALUES ('UHID1001','Aarav Sharma','aarav@example.com',24,'Male','9876543210','Jodhpur, Rajasthan',?)
       ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), treating_doctor_id=VALUES(treating_doctor_id)`,
      [doctorId]
    );
    const [patients] = await conn.execute("SELECT id FROM patients WHERE uhid='UHID1001'");
    const patientId = patients[0].id;
    const [admissions] = await conn.execute("SELECT id FROM admissions WHERE ipd_no='IPD2026001'");
    if (!admissions.length) {
      await conn.execute(
        "INSERT INTO admissions (patient_id,ipd_no,room_no,admitted_on,status) VALUES (?,?,?,?, 'Admitted')",
        [patientId,'IPD2026001','204','2026-10-30']
      );
    }
    const [labs] = await conn.execute("SELECT id FROM lab_requests WHERE patient_id=? AND test_name='Complete Blood Count'", [patientId]);
    if (!labs.length) {
      await conn.execute(
        "INSERT INTO lab_requests (patient_id,test_name,sample_type,sample_status,result_status,result_summary,requested_on) VALUES (?,?,?,?,?,?,?)",
        [patientId,'Complete Blood Count','Blood','Collected','Completed','Demo result: within expected range','2026-10-30']
      );
    }
    const [meds] = await conn.execute("SELECT id FROM medications WHERE patient_id=? AND medicine_name='Demo medication'", [patientId]);
    if (!meds.length) {
      await conn.execute(
        "INSERT INTO medications (patient_id,medicine_name,dosage,schedule,prescribed_by,prescribed_on) VALUES (?,?,?,?,?,?)",
        [patientId,'Demo medication','As prescribed','As directed',doctorId,'2026-10-30']
      );
    }
    console.log('Demo data ready. Staff password: Demo@123');
  } finally { conn.release(); await db.end(); }
}
seed().catch(err => { console.error(err); process.exit(1); });
