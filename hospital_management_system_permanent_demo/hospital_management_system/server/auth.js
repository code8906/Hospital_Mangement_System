const jwt = require('jsonwebtoken');
const db = require('./db');

function sign(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'development_only_change_me', { expiresIn: '30d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please sign in.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'development_only_change_me');
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
}

function allow(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission for this action.' });
    }
    next();
  };
}

async function patientOwnsRecord(req, res, next) {
  if (req.user.role !== 'patient') return next();
  const patientId = Number(req.params.id);
  if (patientId !== Number(req.user.patientId)) {
    return res.status(403).json({ message: 'You can only access your own records.' });
  }
  next();
}

module.exports = { sign, requireAuth, allow, patientOwnsRecord };
