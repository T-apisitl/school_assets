const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const path = require('path');

const DB_PATH = path.join(__dirname, 'school_assets.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    building TEXT,
    floor INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    room_id INTEGER REFERENCES rooms(id),
    status TEXT DEFAULT 'ปกติ',
    purchase_date TEXT,
    purchase_price REAL,
    quantity INTEGER DEFAULT 1,
    image_url TEXT,
    qr_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS borrow_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER REFERENCES assets(id),
    borrower_name TEXT NOT NULL,
    borrower_dept TEXT,
    borrow_date TEXT NOT NULL,
    due_date TEXT,
    return_date TEXT,
    status TEXT DEFAULT 'ยืม',
    note TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed data function
function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) return;

  console.log('Seeding database...');

  // Seed users
  const adminPass = bcrypt.hashSync('admin1234', 10);
  const staffPass = bcrypt.hashSync('staff1234', 10);

  db.prepare(`INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`).run(
    'admin', adminPass, 'ผู้ดูแลระบบ', 'admin'
  );
  db.prepare(`INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`).run(
    'staff', staffPass, 'เจ้าหน้าที่', 'staff'
  );

  // Seed rooms
  const rooms = [
    { name: 'ห้องวิทยาศาสตร์', description: 'ห้องปฏิบัติการวิทยาศาสตร์', building: 'อาคาร 1', floor: 1 },
    { name: 'ห้องคณิตศาสตร์', description: 'ห้องเรียนคณิตศาสตร์', building: 'อาคาร 1', floor: 2 },
    { name: 'ห้องคอมพิวเตอร์', description: 'ห้องปฏิบัติการคอมพิวเตอร์', building: 'อาคาร 2', floor: 1 },
    { name: 'ห้องศิลปะ', description: 'ห้องเรียนศิลปะและหัตถกรรม', building: 'อาคาร 2', floor: 2 },
    { name: 'ห้องดนตรี', description: 'ห้องเรียนดนตรีและนาฏศิลป์', building: 'อาคาร 3', floor: 1 },
  ];

  const insertRoom = db.prepare(
    'INSERT INTO rooms (name, description, building, floor) VALUES (?, ?, ?, ?)'
  );

  for (const r of rooms) {
    insertRoom.run(r.name, r.description, r.building, r.floor);
  }

  // Seed assets
  const assets = [
    { asset_code: 'SCI-001', name: 'กล้องจุลทรรศน์', description: 'กล้องจุลทรรศน์ดิจิทัล 1000x', category: 'อุปกรณ์วิทยาศาสตร์', room_id: 1, status: 'ปกติ', purchase_date: '2023-01-15', purchase_price: 15000, quantity: 5 },
    { asset_code: 'SCI-002', name: 'บีกเกอร์แก้ว', description: 'บีกเกอร์ 500ml', category: 'อุปกรณ์วิทยาศาสตร์', room_id: 1, status: 'ปกติ', purchase_date: '2023-01-15', purchase_price: 200, quantity: 20 },
    { asset_code: 'COM-001', name: 'คอมพิวเตอร์ตั้งโต๊ะ', description: 'Intel Core i5 RAM 8GB', category: 'อุปกรณ์คอมพิวเตอร์', room_id: 3, status: 'ปกติ', purchase_date: '2022-06-01', purchase_price: 25000, quantity: 30 },
    { asset_code: 'COM-002', name: 'เครื่องพิมพ์ Laser', description: 'HP LaserJet Pro', category: 'อุปกรณ์คอมพิวเตอร์', room_id: 3, status: 'ชำรุด', purchase_date: '2021-03-10', purchase_price: 8000, quantity: 2 },
    { asset_code: 'ART-001', name: 'โต๊ะวาดภาพ', description: 'โต๊ะวาดภาพขนาดใหญ่', category: 'เฟอร์นิเจอร์', room_id: 4, status: 'ปกติ', purchase_date: '2022-08-20', purchase_price: 3500, quantity: 15 },
    { asset_code: 'MUS-001', name: 'เปียโนไฟฟ้า', description: 'Yamaha PSR-E363', category: 'เครื่องดนตรี', room_id: 5, status: 'ปกติ', purchase_date: '2023-02-14', purchase_price: 12000, quantity: 3 },
    { asset_code: 'MUS-002', name: 'กีตาร์โปร่ง', description: 'กีตาร์โปร่งคลาสสิก', category: 'เครื่องดนตรี', room_id: 5, status: 'ส่งซ่อม', purchase_date: '2020-09-01', purchase_price: 2500, quantity: 8 },
    { asset_code: 'MAT-001', name: 'กระดานไวท์บอร์ด', description: 'กระดานไวท์บอร์ด 120x240 ซม.', category: 'อุปกรณ์การสอน', room_id: 2, status: 'ปกติ', purchase_date: '2021-05-12', purchase_price: 4500, quantity: 1 },
    { asset_code: 'MAT-002', name: 'โปรเจกเตอร์', description: 'Epson EB-X51 XGA', category: 'อุปกรณ์การสอน', room_id: 2, status: 'ปกติ', purchase_date: '2022-11-30', purchase_price: 18000, quantity: 1 },
    { asset_code: 'SCI-003', name: 'ตาชั่งดิจิทัล', description: 'ตาชั่งดิจิทัล 0.01g', category: 'อุปกรณ์วิทยาศาสตร์', room_id: 1, status: 'ปกติ', purchase_date: '2023-03-01', purchase_price: 3200, quantity: 4 },
  ];

  const insertAsset = db.prepare(`
    INSERT INTO assets (asset_code, name, description, category, room_id, status, purchase_date, purchase_price, quantity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const a of assets) {
    insertAsset.run(a.asset_code, a.name, a.description, a.category, a.room_id, a.status, a.purchase_date, a.purchase_price, a.quantity);
  }

  // Seed borrow records
  const borrows = [
    { asset_id: 1, borrower_name: 'นายสมชาย ใจดี', borrower_dept: 'แผนกวิทยาศาสตร์', borrow_date: '2024-01-10', due_date: '2024-01-17', return_date: '2024-01-15', status: 'คืนแล้ว', note: '', created_by: 2 },
    { asset_id: 3, borrower_name: 'นางสาวสมหญิง รักเรียน', borrower_dept: 'แผนกคอมพิวเตอร์', borrow_date: '2024-02-01', due_date: '2024-02-08', return_date: null, status: 'ยืม', note: 'ใช้สอนพิเศษ', created_by: 2 },
    { asset_id: 6, borrower_name: 'นายประสิทธิ์ มีแรง', borrower_dept: 'แผนกดนตรี', borrow_date: '2024-02-05', due_date: '2024-02-12', return_date: null, status: 'ยืม', note: '', created_by: 1 },
  ];

  const insertBorrow = db.prepare(`
    INSERT INTO borrow_records (asset_id, borrower_name, borrower_dept, borrow_date, due_date, return_date, status, note, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const b of borrows) {
    insertBorrow.run(b.asset_id, b.borrower_name, b.borrower_dept, b.borrow_date, b.due_date, b.return_date, b.status, b.note, b.created_by);
  }

  console.log('Database seeded successfully!');
}

seedData();

// Generate QR codes for any assets missing them (runs on startup)
async function generateMissingQRCodes() {
  const assetsWithoutQR = db.prepare("SELECT id, asset_code, name FROM assets WHERE qr_code IS NULL OR qr_code = ''").all();
  for (const asset of assetsWithoutQR) {
    try {
      const qr = await QRCode.toDataURL(JSON.stringify({ id: asset.id, asset_code: asset.asset_code, name: asset.name }), {
        errorCorrectionLevel: 'M', margin: 2, width: 300,
      });
      db.prepare('UPDATE assets SET qr_code = ? WHERE id = ?').run(qr, asset.id);
    } catch (e) {
      console.error(`QR gen error for ${asset.asset_code}:`, e);
    }
  }
  if (assetsWithoutQR.length > 0) {
    console.log(`Generated QR codes for ${assetsWithoutQR.length} assets`);
  }
}

generateMissingQRCodes().catch(console.error);

module.exports = db;
