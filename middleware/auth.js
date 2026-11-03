const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'school-assets-secret-key-2024';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'ไม่พบ token กรุณาเข้าสู่ระบบ' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'สิทธิ์ไม่เพียงพอ ต้องการสิทธิ์ผู้ดูแลระบบ' });
  }
  next();
}

module.exports = { authMiddleware, adminOnly, JWT_SECRET };
