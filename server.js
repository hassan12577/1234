const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.epub', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم. يرجى رفع ملفات PDF، EPUB، أو TXT فقط.'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Database setup
const db = new sqlite3.Database('./books.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    createTables();
  }
});

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'غير مصنف',
    filename TEXT NOT NULL,
    originalname TEXT NOT NULL,
    rating REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )`, () => {
    // Insert default categories
    const defaultCategories = ['روايات', 'علمية', 'تاريخية', 'دينية', 'أطفال'];
    defaultCategories.forEach(category => {
      db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [category]);
    });
  });
}

// Routes

// Get all books
app.get('/api/books', (req, res) => {
  db.all('SELECT * FROM books ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Upload a book
app.post('/api/books', upload.single('file'), (req, res) => {
  const { title, author, description, category } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'يرجى رفع ملف الكتاب.' });
  }

  const sql = 'INSERT INTO books (title, author, description, category, filename, originalname) VALUES (?, ?, ?, ?, ?, ?)';
  const params = [title, author, description || '', category || 'غير مصنف', file.filename, file.originalname];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: 'تم رفع الكتاب بنجاح!',
      id: this.lastID
    });
  });
});

// Download a book
app.get('/api/books/:id/download', (req, res) => {
  const id = req.params.id;

  db.get('SELECT * FROM books WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!row) {
      res.status(404).json({ error: 'الكتاب غير موجود.' });
      return;
    }

    const filePath = path.join(__dirname, 'uploads', row.filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath, row.originalname);
    } else {
      res.status(404).json({ error: 'الملف غير موجود.' });
    }
  });
});

// Update book rating
app.put('/api/books/:id/rating', (req, res) => {
  const id = req.params.id;
  const { rating } = req.body;

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'التقييم يجب أن يكون بين 1 و 5.' });
  }

  db.run('UPDATE books SET rating = ? WHERE id = ?', [rating, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (this.changes === 0) {
      res.status(404).json({ error: 'الكتاب غير موجود.' });
      return;
    }

    res.json({ message: 'تم تحديث التقييم بنجاح!' });
  });
});

// Get categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'حجم الملف كبير جداً. الحد الأقصى هو 50 ميجابايت.' });
    }
  }

  console.error(err.stack);
  res.status(500).json({ error: 'حدث خطأ في الخادم.' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Accessible at: http://localhost:${PORT}`);
  console.log(`Network access: http://YOUR_IP_ADDRESS:${PORT}`);

  // Open browser automatically
  exec(`start http://localhost:${PORT}`, (err) => {
    if (err) {
      console.log('Could not open browser automatically');
    }
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
