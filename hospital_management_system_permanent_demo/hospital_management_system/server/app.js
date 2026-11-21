require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { sign, requireAuth, allow, patientOwnsRecord } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req,res) => res.json({ status:'ok', service:'Hospital Management API' }));

app.post('/api/auth/staff-login', async (req,res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({message:'Enter username and password.'});
    const [rows] = await db.execute('SELECT * FROM staff WHERE username=?', [username]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({message:'Invalid staff login details.'});
    }
    const s = rows[0];
    const user = { id:s.id, name:s.full_name, role:s.role, specialty:s.specialty };
    res.json({ token:sign(user), user });
  } catch (e) { console.error(e); res.status(500).json({message:'Server error. Check database settings.'}); }
});

app.post('/api/auth/patient-login', async (req,res) => {
  try {
    const { name, email, uhid } = req.body;
    if (!name || !email || !uhid) return res.status(400).json({message:'Enter name, email and UHID.'});
    const [rows] = await db.execute(
      'SELECT id,uhid,full_name,email FROM patients WHERE LOWER(full_name)=LOWER(?) AND LOWER(email)=LOWER(?) AND uhid=?',
      [name.trim(),email.trim(),uhid.trim()]
    );
    if (!rows.length) return res.status(401).json({message:'Patient details did not match the demo record.'});
    const p = rows[0];
    const user = { id:p.id, patientId:p.id, name:p.full_name, role:'patient', uhid:p.uhid };
    res.json({ token:sign(user), user });
  } catch (e) { console.error(e); res.status(500).json({message:'Server error. Check database settings.'}); }
});

app.use('/api', requireAuth);

app.get('/api/dashboard', allow('admin','doctor','nurse','receptionist','lab_technician'), async (req,res) => {
  try {
    const [[{ patients }]] = await db.query('SELECT COUNT(*) AS patients FROM patients');
    const [[{ admitted }]] = await db.query("SELECT COUNT(*) AS admitted FROM admissions WHERE status='Admitted'");
    const [[{ pendingLabs }]] = await db.query("SELECT COUNT(*) AS pendingLabs FROM lab_requests WHERE result_status!='Completed'");
    const [[{ pendingReferrals }]] = await db.query("SELECT COUNT(*) AS pendingReferrals FROM referrals WHERE status='Suggested'");
    res.json({patients,admitted,pendingLabs,pendingReferrals});
  } catch(e) { res.status(500).json({message:'Could not load dashboard.'}); }
});

app.get('/api/patients', allow('admin','doctor','nurse','receptionist','lab_technician'), async (req,res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id,p.uhid,p.full_name,p.email,p.age,p.gender,p.mobile,p.address,
      s.full_name AS treating_doctor,
      a.room_no,a.ipd_no,a.status AS admission_status
      FROM patients p LEFT JOIN staff s ON p.treating_doctor_id=s.id
      LEFT JOIN admissions a ON a.patient_id=p.id AND a.status='Admitted'
      ORDER BY p.id DESC`);
    res.json(rows);
  } catch(e) { res.status(500).json({message:'Could not load patients.'}); }
});

app.post('/api/patients', allow('admin','receptionist'), async (req,res) => {
  try {
    const {uhid,full_name,email,age,gender,mobile,address} = req.body;
    if (!uhid || !full_name || !email || !age || !gender) return res.status(400).json({message:'Complete the required patient fields.'});
    const [result] = await db.execute(
      'INSERT INTO patients (uhid,full_name,email,age,gender,mobile,address) VALUES (?,?,?,?,?,?,?)',
      [uhid,full_name,email,Number(age),gender,mobile || null,address || null]);
    res.status(201).json({id:result.insertId,message:'Patient registered.'});
  } catch(e) { res.status(400).json({message:'Could not register patient. Check that UHID is unique.'}); }
});

app.patch('/api/patients/:id/admission', allow('admin','receptionist'), async (req,res) => {
  try {
    const patientId = Number(req.params.id);
    const { action, room_no, ipd_no } = req.body;
    if (action === 'admit') {
      if (!room_no || !ipd_no) return res.status(400).json({message:'Room number and IPD number are required.'});
      await db.execute("UPDATE admissions SET status='Discharged' WHERE patient_id=? AND status='Admitted'",[patientId]);
      await db.execute("INSERT INTO admissions (patient_id,ipd_no,room_no,admitted_on,status) VALUES (?,?,?,CURDATE(),'Admitted')",
        [patientId,ipd_no,room_no]);
    } else if (action === 'discharge') {
      const [result] = await db.execute("UPDATE admissions SET status='Discharged', discharged_on=CURDATE() WHERE patient_id=? AND status='Admitted'",[patientId]);
      if (!result.affectedRows) return res.status(404).json({message:'No active admission found.'});
    } else return res.status(400).json({message:'Action must be admit or discharge.'});
    res.json({message: action === 'admit' ? 'Patient admitted.' : 'Patient discharged.'});
  } catch(e) { res.status(400).json({message:'Admission update failed. Check IPD number is unique.'}); }
});

app.get('/api/patients/:id/records', patientOwnsRecord, async (req,res) => {
  try {
    const id = Number(req.params.id);
    const [[patient]] = await db.execute(`
      SELECT p.id,p.uhid,p.full_name,p.email,p.age,p.gender,p.mobile,p.address,
      s.full_name AS treating_doctor,s.specialty AS doctor_specialty
      FROM patients p LEFT JOIN staff s ON p.treating_doctor_id=s.id WHERE p.id=?`,[id]);
    if (!patient) return res.status(404).json({message:'Patient not found.'});
    const [admissions] = await db.execute('SELECT * FROM admissions WHERE patient_id=? ORDER BY id DESC',[id]);
    const [labs] = await db.execute('SELECT * FROM lab_requests WHERE patient_id=? ORDER BY id DESC',[id]);
    const [investigations] = await db.execute('SELECT * FROM investigations WHERE patient_id=? ORDER BY id DESC',[id]);
    const [medications] = await db.execute(`
      SELECT m.*,s.full_name AS prescribed_by_name FROM medications m
      LEFT JOIN staff s ON m.prescribed_by=s.id WHERE m.patient_id=? ORDER BY m.id DESC`,[id]);
    const [referrals] = await db.execute('SELECT * FROM referrals WHERE patient_id=? ORDER BY id DESC',[id]);
    res.json({patient,admissions,labs,investigations,medications,referrals});
  } catch(e) { console.error(e); res.status(500).json({message:'Could not load patient records.'}); }
});

app.post('/api/patients/:id/medications', allow('admin','doctor'), async (req,res) => {
  try {
    const {medicine_name,dosage,schedule} = req.body;
    if (!medicine_name) return res.status(400).json({message:'Medicine name is required.'});
    await db.execute('INSERT INTO medications (patient_id,medicine_name,dosage,schedule,prescribed_by,prescribed_on) VALUES (?,?,?,?,?,CURDATE())',
      [Number(req.params.id),medicine_name,dosage || '',schedule || '',req.user.id]);
    res.status(201).json({message:'Medication added.'});
  } catch(e) { res.status(400).json({message:'Could not add medication.'}); }
});

app.post('/api/patients/:id/investigations', allow('admin','doctor'), async (req,res) => {
  try {
    const {investigation_name,notes} = req.body;
    if (!investigation_name) return res.status(400).json({message:'Investigation name is required.'});
    await db.execute('INSERT INTO investigations (patient_id,investigation_name,notes,created_by) VALUES (?,?,?,?)',
      [Number(req.params.id),investigation_name,notes || '',req.user.id]);
    res.status(201).json({message:'Investigation added.'});
  } catch(e) { res.status(400).json({message:'Could not add investigation.'}); }
});

app.post('/api/patients/:id/referrals/suggest', allow('admin','doctor'), async (req,res) => {
  try {
    const {suggested_specialty,reason} = req.body;
    if (!suggested_specialty || !reason) return res.status(400).json({message:'Specialty and reason are required.'});
    await db.execute("INSERT INTO referrals (patient_id,suggested_specialty,reason,status,suggested_by) VALUES (?,?,?,'Suggested',?)",
      [Number(req.params.id),suggested_specialty,reason,req.user.id]);
    res.status(201).json({message:'Referral suggestion sent for treating-doctor review.'});
  } catch(e) { res.status(400).json({message:'Could not create referral suggestion.'}); }
});

app.patch('/api/referrals/:id/approve', allow('admin','doctor'), async (req,res) => {
  try {
    const {decision} = req.body;
    if (!['Approved','Declined'].includes(decision)) return res.status(400).json({message:'Decision must be Approved or Declined.'});
    const [result] = await db.execute("UPDATE referrals SET status=?,reviewed_by=?,reviewed_at=NOW() WHERE id=? AND status='Suggested'",
      [decision,req.user.id,Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({message:'Suggestion not found or already reviewed.'});
    res.json({message:`Referral ${decision.toLowerCase()}.`});
  } catch(e) { res.status(500).json({message:'Could not review referral.'}); }
});

app.get('/api/lab-requests', allow('admin','doctor','nurse','lab_technician'), async (req,res) => {
  try {
    const [rows] = await db.query(`
      SELECT l.*,p.full_name,p.uhid FROM lab_requests l
      JOIN patients p ON p.id=l.patient_id ORDER BY l.id DESC`);
    res.json(rows);
  } catch(e) { res.status(500).json({message:'Could not load lab requests.'}); }
});

app.patch('/api/lab-requests/:id/status', allow('admin','nurse','lab_technician'), async (req,res) => {
  try {
    const {sample_status,result_status,result_summary} = req.body;
    const validSample = ['Pending','Collected','Received'];
    const validResult = ['Pending','In Progress','Completed'];
    if (sample_status && !validSample.includes(sample_status)) return res.status(400).json({message:'Invalid sample status.'});
    if (result_status && !validResult.includes(result_status)) return res.status(400).json({message:'Invalid result status.'});
    await db.execute(`UPDATE lab_requests SET
      sample_status=COALESCE(?,sample_status),
      result_status=COALESCE(?,result_status),
      result_summary=COALESCE(?,result_summary) WHERE id=?`,
      [sample_status || null,result_status || null,result_summary || null,Number(req.params.id)]);
    res.json({message:'Lab record updated.'});
  } catch(e) { res.status(400).json({message:'Could not update lab record.'}); }
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`Hospital API running at http://localhost:${port}`));
