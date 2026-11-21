import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BedDouble, FlaskConical, HeartPulse, LogOut, Menu, Plus, Search, ShieldCheck, Users } from 'lucide-react';

const roleLabels = {admin:'Administrator',doctor:'Doctor',nurse:'Nurse',receptionist:'Receptionist',lab_technician:'Lab Technician',patient:'Patient'};
const canManageAdmission = r => ['admin','receptionist'].includes(r);
const canWriteClinical = r => ['admin','doctor'].includes(r);
const canUpdateLab = r => ['admin','nurse','lab_technician'].includes(r);
const api = async (path, options={}) => {
  const token = localStorage.getItem('hms_token');
  const res = await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...(options.headers||{})}});
  const data = await res.json().catch(()=>({message:'Unexpected server response'}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export default function App(){
  const [user,setUser] = useState(()=>{try{return JSON.parse(localStorage.getItem('hms_user'))}catch{return null}});
  const [mode,setMode] = useState('staff');
  const [tab,setTab] = useState('overview');
  const [patients,setPatients] = useState([]);
  const [selected,setSelected] = useState(null);
  const [records,setRecords] = useState(null);
  const [stats,setStats] = useState(null);
  const [labs,setLabs] = useState([]);
  const [search,setSearch] = useState('');
  const [notice,setNotice] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);

  const role = user?.role;
  const patientMode = role === 'patient';

  async function load(){
    if(!user) return;
    try{
      if(patientMode){
        const data = await api(`/patients/${user.patientId}/records`);
        setRecords(data); setSelected(data.patient);
      } else {
        const [p,s,l] = await Promise.all([api('/patients'),api('/dashboard'),api('/lab-requests')]);
        setPatients(p); setStats(s); setLabs(l);
      }
    }catch(e){setError(e.message)}
  }
  useEffect(()=>{load()},[user]);
  function logout(){localStorage.removeItem('hms_token');localStorage.removeItem('hms_user');setUser(null);setRecords(null);setSelected(null);setTab('overview');setError('');setNotice('')}

  async function login(e){
    e.preventDefault(); setBusy(true);setError('');
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    try{
      const result = await api(mode==='staff'?'/auth/staff-login':'/auth/patient-login',{method:'POST',body:JSON.stringify(body)});
      localStorage.setItem('hms_token',result.token);localStorage.setItem('hms_user',JSON.stringify(result.user));setUser(result.user);
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  async function openPatient(p){
    setSelected(p);
    try{setRecords(await api(`/patients/${p.id}/records`));setTab('patient-detail')}catch(e){setError(e.message)}
  }
  async function action(path,method,body){
    setError('');setNotice('');
    try{const result=await api(path,{method,body:body?JSON.stringify(body):undefined});setNotice(result.message);await load();if(selected) await openPatient(selected);}
    catch(e){setError(e.message)}
  }
  const filtered = useMemo(()=>patients.filter(p=>`${p.full_name} ${p.uhid} ${p.email}`.toLowerCase().includes(search.toLowerCase())),[patients,search]);

  if(!user) return <div className="login-shell"><div className="login-art"><div className="brand"><HeartPulse/> CarePoint</div><div><span className="eyebrow">HOSPITAL MANAGEMENT SYSTEM</span><h1>Care that connects.<br/>Records that matter.</h1><p>A simple, secure demo workspace for hospital teams and patients.</p></div><div className="art-foot">Patient-first • Connected care • Clear records</div></div><div className="login-panel"><div className="login-card"><div className="mobile-brand"><HeartPulse/> CarePoint</div><span className="eyebrow">WELCOME BACK</span><h2>Sign in to continue</h2><p className="muted">Choose how you want to access the demo.</p><div className="switch"><button className={mode==='staff'?'active':''} onClick={()=>setMode('staff')}>Staff login</button><button className={mode==='patient'?'active':''} onClick={()=>setMode('patient')}>Patient login</button></div><form onSubmit={login} className="form">
{mode==='staff'?<><label>Username<input name="username" placeholder="e.g. doctor1" required/></label><label>Password<input name="password" type="password" placeholder="Enter password" required/></label></>:<><label>Full name<input name="name" placeholder="Aarav Sharma" required/></label><label>Email address<input name="email" type="email" placeholder="aarav@example.com" required/></label><label>UHID<input name="uhid" placeholder="UHID1001" required/></label></>}
{error&&<div className="alert error">{error}</div>}<button className="primary full" disabled={busy}>{busy?'Signing in…':'Sign in securely'}</button></form><div className="demo-hint"><b>Demo access</b>{mode==='staff'?<span>Username: <code>admin</code> · Password: <code>Demo@123</code></span>:<span>Aarav Sharma · aarav@example.com · UHID1001</span>}</div><small className="muted">Educational demo only. Use fictional data.</small></div></div></div>;

  const nav = patientMode ? [{id:'overview',label:'My health',icon:HeartPulse}] : [
    {id:'overview',label:'Overview',icon:Activity},{id:'patients',label:'Patients',icon:Users},{id:'labs',label:'Laboratory',icon:FlaskConical}
  ];
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><HeartPulse/> CarePoint</div><div className="side-caption">WORKSPACE</div>{nav.map(n=><button key={n.id} className={`nav-item ${tab===n.id?'selected':''}`} onClick={()=>setTab(n.id)}><n.icon size={18}/>{n.label}</button>)}<div className="sidebar-bottom"><div className="secure"><ShieldCheck size={17}/><span>Role-based access<br/><small>Session protected</small></span></div><button className="nav-item" onClick={logout}><LogOut size={18}/>Sign out</button></div></aside>
  <main className="main"><header className="topbar"><div><div className="eyebrow">CAREPOINT HOSPITAL</div><h2>{patientMode?'Patient portal':roleLabels[role]+' workspace'}</h2></div><div className="profile"><div className="avatar">{(user.name||'U').split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><b>{user.name}</b><small>{roleLabels[role]}</small></div></div></header>
  {notice&&<div className="alert success">{notice}<button onClick={()=>setNotice('')}>×</button></div>}{error&&<div className="alert error">{error}<button onClick={()=>setError('')}>×</button></div>}
  {patientMode ? <PatientPortal records={records} /> : <>
    {tab==='overview'&&<><div className="welcome"><div><span className="eyebrow">YOUR HOSPITAL AT A GLANCE</span><h1>Good day, {user.name.split(' ')[0]}.</h1><p>Here’s the latest snapshot of hospital activity.</p></div><div className="welcome-icon"><HeartPulse size={38}/></div></div><div className="stat-grid"><Stat icon={Users} label="Registered patients" value={stats?.patients??'—'}/><Stat icon={BedDouble} label="Currently admitted" value={stats?.admitted??'—'}/><Stat icon={FlaskConical} label="Pending lab work" value={stats?.pendingLabs??'—'}/><Stat icon={Activity} label="Referral reviews" value={stats?.pendingReferrals??'—'}/></div><section className="panel"><div className="panel-head"><div><h3>Recent patients</h3><p className="muted">Open a patient record to view clinical details.</p></div><button className="outline" onClick={()=>setTab('patients')}>View all</button></div><PatientTable rows={patients.slice(0,5)} onOpen={openPatient}/></section></>}
    {tab==='patients'&&<section className="panel"><div className="panel-head"><div><h3>Patient directory</h3><p className="muted">Search and open patient records.</p></div><div className="search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or UHID"/></div></div><PatientTable rows={filtered} onOpen={openPatient}/>{canManageAdmission(role)&&<RegisterPatient onSave={body=>action('/patients','POST',body)}/>}</section>}
    {tab==='labs'&&<section className="panel"><div className="panel-head"><div><h3>Laboratory requests</h3><p className="muted">Track samples and result progress.</p></div></div><LabTable rows={labs} canUpdate={canUpdateLab(role)} onUpdate={(id,body)=>action(`/lab-requests/${id}/status`,'PATCH',body)}/></section>}
    {tab==='patient-detail'&&records&&<PatientDetail records={records} role={role} onAction={action} onBack={()=>setTab('patients')}/>}
  </>}
  </main></div>;
}

function Stat({icon:Icon,label,value}){return <div className="stat-card"><div className="stat-icon"><Icon size={19}/></div><div><strong>{value}</strong><span>{label}</span></div></div>}
function PatientTable({rows,onOpen}){return <div className="table-wrap"><table><thead><tr><th>Patient</th><th>UHID</th><th>Age / Gender</th><th>Attending physician</th><th>Admission</th><th></th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><b>{p.full_name}</b><small>{p.email}</small></td><td>{p.uhid}</td><td>{p.age} / {p.gender}</td><td>{p.treating_doctor||'Not assigned'}</td><td><span className={`pill ${p.admission_status==='Admitted'?'green':'gray'}`}>{p.admission_status||'Outpatient'}</span></td><td><button className="text-button" onClick={()=>onOpen(p)}>View record →</button></td></tr>)}{!rows.length&&<tr><td colSpan="6" className="empty">No patients found.</td></tr>}</tbody></table></div>}
function RegisterPatient({onSave}){const [open,setOpen]=useState(false);return <div className="inline-action"><button className="primary" onClick={()=>setOpen(!open)}><Plus size={16}/> Register patient</button>{open&&<form className="mini-form" onSubmit={e=>{e.preventDefault();onSave(Object.fromEntries(new FormData(e.currentTarget).entries()));e.currentTarget.reset();setOpen(false)}}>{[['uhid','UHID'],['full_name','Full name'],['email','Email'],['age','Age'],['gender','Gender'],['mobile','Mobile'],['address','Address']].map(([n,l])=><label key={n}>{l}<input name={n} required={['uhid','full_name','email','age','gender'].includes(n)} type={n==='age'?'number':n==='email'?'email':'text'}/></label>)}<button className="primary">Save patient</button></form>}</div>}
function LabTable({rows,canUpdate,onUpdate}){return <div className="table-wrap"><table><thead><tr><th>Patient</th><th>Test</th><th>Sample</th><th>Sample status</th><th>Result status</th><th>Update</th></tr></thead><tbody>{rows.map(l=><tr key={l.id}><td><b>{l.full_name}</b><small>{l.uhid}</small></td><td>{l.test_name}</td><td>{l.sample_type||'—'}</td><td><span className="pill blue">{l.sample_status}</span></td><td><span className={`pill ${l.result_status==='Completed'?'green':'gray'}`}>{l.result_status}</span></td><td>{canUpdate?<select defaultValue="" onChange={e=>e.target.value&&onUpdate(l.id,{result_status:e.target.value})}><option value="" disabled>Set result…</option><option>Pending</option><option>In Progress</option><option>Completed</option></select>:'View only'}</td></tr>)}{!rows.length&&<tr><td colSpan="6" className="empty">No lab requests.</td></tr>}</tbody></table></div>}
function PatientPortal({records}){if(!records)return <div className="panel">Loading your health records…</div>;const {patient:p,admissions,labs,investigations,medications,referrals}=records;const active=admissions.find(a=>a.status==='Admitted');return <><div className="welcome"><div><span className="eyebrow">YOUR PATIENT PROFILE</span><h1>Hello, {p.full_name.split(' ')[0]}.</h1><p>Your health information in one convenient place.</p></div><div className="welcome-icon"><HeartPulse size={38}/></div></div><div className="profile-grid"><div className="panel"><h3>Personal details</h3><div className="detail-grid">{[['UHID',p.uhid],['Age',p.age],['Gender',p.gender],['Mobile',p.mobile],['Email',p.email],['Address',p.address]].map(([k,v])=><div key={k}><small>{k}</small><b>{v||'—'}</b></div>)}</div></div><div className="panel admission-card"><h3>Admission status</h3><span className={`pill ${active?'green':'gray'}`}>{active?'Currently admitted':'Not admitted'}</span>{active?<div className="detail-grid"><div><small>Room</small><b>{active.room_no}</b></div><div><small>IPD number</small><b>{active.ipd_no}</b></div><div><small>Admitted on</small><b>{active.admitted_on}</b></div></div>:<p className="muted">There is no active admission linked to your profile.</p>}<div className="doctor-chip"><div className="avatar">DR</div><div><small>Treating physician</small><b>{p.treating_doctor||'Not assigned'}</b><small>{p.doctor_specialty||''}</small></div></div></div></div><div className="records-grid"><RecordCard title="Laboratory & samples" icon={FlaskConical} items={labs.map(x=>`${x.test_name} · ${x.sample_status} · ${x.result_status}${x.result_summary?' — '+x.result_summary:''}`)}/><RecordCard title="Investigations" icon={Activity} items={investigations.map(x=>`${x.investigation_name}${x.notes?' — '+x.notes:''}`)}/><RecordCard title="Medications" icon={HeartPulse} items={medications.map(x=>`${x.medicine_name} · ${x.dosage||''} · ${x.schedule||''}`)}/><RecordCard title="Specialist referrals" icon={Users} items={referrals.map(x=>`${x.suggested_specialty} · ${x.status} — ${x.reason}`)}/></div></>}
function RecordCard({title,icon:Icon,items}){return <div className="panel record-card"><div className="record-title"><Icon size={18}/><h3>{title}</h3></div>{items.length?<ul>{items.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p className="muted">No records available.</p>}</div>}
function PatientDetail({records,role,onAction,onBack}){const {patient:p,admissions,labs,investigations,medications,referrals}=records;const active=admissions.find(a=>a.status==='Admitted');const [room,setRoom]=useState('');const [ipd,setIpd]=useState('');const [med,setMed]=useState('');const [dose,setDose]=useState('');const [schedule,setSchedule]=useState('');const [inv,setInv]=useState('');const [specialty,setSpecialty]=useState('');const [reason,setReason]=useState('');return <><button className="back" onClick={onBack}>← Back to patients</button><div className="detail-heading"><div><span className="eyebrow">PATIENT RECORD</span><h1>{p.full_name}</h1><p className="muted">{p.uhid} · {p.age} years · {p.gender}</p></div><span className={`pill ${active?'green':'gray'}`}>{active?'Admitted':'Outpatient'}</span></div><div className="profile-grid"><div className="panel"><h3>Patient information</h3><div className="detail-grid"><div><small>Email</small><b>{p.email}</b></div><div><small>Mobile</small><b>{p.mobile||'—'}</b></div><div><small>Address</small><b>{p.address||'—'}</b></div><div><small>Treating physician</small><b>{p.treating_doctor||'—'}</b></div></div></div><div className="panel"><h3>Admission management</h3>{active?<><p>Room <b>{active.room_no}</b> · IPD <b>{active.ipd_no}</b></p>{canManageAdmission(role)&&<button className="danger" onClick={()=>onAction(`/patients/${p.id}/admission`,'PATCH',{action:'discharge'})}>Discharge patient</button>}</>:canManageAdmission(role)?<form className="stack-form" onSubmit={e=>{e.preventDefault();onAction(`/patients/${p.id}/admission`,'PATCH',{action:'admit',room_no:room,ipd_no:ipd})}}><label>Room number<input value={room} onChange={e=>setRoom(e.target.value)} required/></label><label>IPD number<input value={ipd} onChange={e=>setIpd(e.target.value)} required/></label><button className="primary">Admit patient</button></form>:<p className="muted">No active admission.</p>}</div></div><div className="records-grid"><RecordCard title="Laboratory records" icon={FlaskConical} items={labs.map(x=>`${x.test_name} · ${x.sample_type} · ${x.sample_status} · ${x.result_status}`)}/><RecordCard title="Investigations" icon={Activity} items={investigations.map(x=>`${x.investigation_name} — ${x.notes||''}`)}/><RecordCard title="Medications" icon={HeartPulse} items={medications.map(x=>`${x.medicine_name} — ${x.dosage||''} — ${x.schedule||''}`)}/><RecordCard title="Referral suggestions" icon={Users} items={referrals.map(x=>`${x.suggested_specialty} — ${x.status}: ${x.reason}`)}/></div>{canWriteClinical(role)&&<div className="panel"><h3>Clinical actions</h3><div className="action-grid"><form className="stack-form" onSubmit={e=>{e.preventDefault();onAction(`/patients/${p.id}/medications`,'POST',{medicine_name:med,dosage:dose,schedule});setMed('');setDose('');setSchedule('')}}><b>Add medication</b><label>Medicine<input value={med} onChange={e=>setMed(e.target.value)} required/></label><label>Dosage<input value={dose} onChange={e=>setDose(e.target.value)}/></label><label>Schedule<input value={schedule} onChange={e=>setSchedule(e.target.value)}/></label><button className="primary">Add medication</button></form><form className="stack-form" onSubmit={e=>{e.preventDefault();onAction(`/patients/${p.id}/investigations`,'POST',{investigation_name:inv});setInv('')}}><b>Add investigation</b><label>Investigation<input value={inv} onChange={e=>setInv(e.target.value)} required/></label><button className="primary">Add investigation</button></form><form className="stack-form" onSubmit={e=>{e.preventDefault();onAction(`/patients/${p.id}/referrals/suggest`,'POST',{suggested_specialty:specialty,reason});setSpecialty('');setReason('')}}><b>Suggest specialist referral</b><label>Specialty<select value={specialty} onChange={e=>setSpecialty(e.target.value)} required><option value="">Choose specialty</option>{['Physician','Neurologist','Orthopedician','Physiotherapist','ENT','Dentist','Pediatrician','Urologist','Cardiologist'].map(x=><option key={x}>{x}</option>)}</select></label><label>Reason<input value={reason} onChange={e=>setReason(e.target.value)} required/></label><button className="primary">Send for review</button></form></div><h4>Review referral suggestions</h4>{referrals.filter(r=>r.status==='Suggested').map(r=><div className="review-row" key={r.id}><span><b>{r.suggested_specialty}</b> — {r.reason}</span><div><button className="outline" onClick={()=>onAction(`/referrals/${r.id}/approve`,'PATCH',{decision:'Approved'})}>Approve</button> <button className="danger" onClick={()=>onAction(`/referrals/${r.id}/approve`,'PATCH',{decision:'Declined'})}>Decline</button></div></div>)}{!referrals.some(r=>r.status==='Suggested')&&<p className="muted">No referrals waiting for review.</p>}</div>}</>}
