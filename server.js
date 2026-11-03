const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Initialize DB (this seeds data on first run)
require('./db');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const assetRoutes = require('./routes/assets');
const borrowRoutes = require('./routes/borrows');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://apisit.sites.hwp.ac.th',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads (under /Asset/uploads)
app.use('/Asset/uploads', express.static(uploadsDir));

// API Routes — all mounted under /Asset/api
app.use('/Asset/api/auth', authRoutes);
app.use('/Asset/api/rooms', roomRoutes);
app.use('/Asset/api/assets', assetRoutes);
app.use('/Asset/api/borrows', borrowRoutes);
app.use('/Asset/api/reports', reportRoutes);

// Health check
app.get('/Asset/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Serve static frontend files from ../frontend/dist at /Asset
app.use('/Asset', express.static(path.join(__dirname, '../frontend/dist')));

// SPA fallback — serve index.html for any /Asset/* route not matched above
app.get('/Asset/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Redirect root to /Asset for convenience
app.get('/', (req, res) => {
  res.redirect('/Asset');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`App accessible at http://localhost:${PORT}/Asset`);
});

module.exports = app;
