'use strict';

const express      = require('express');
const fs           = require('fs');
const path         = require('path');
const crypto       = require('crypto');
const { exec }     = require('child_process');
const axios        = require('axios');
const jwt          = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const _            = require('lodash');
const marked       = require('marked');

const app  = express();
const PORT = 5000;

// ── Hardcoded secrets (deliberate vulnerability) ─────────────────────────────
const JWT_SECRET   = 'bookstore_secret_123';
const ADMIN_KEY    = 'admin-key-do-not-share';
const DB_PASSWORD  = 'dbpass_Bookstore2024!';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── In-memory data ────────────────────────────────────────────────────────────
let books = [
  { id: 1, title: 'Clean Code',        author: 'Robert C. Martin', price: 35.00, stock: 10 },
  { id: 2, title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', price: 42.00, stock: 5  },
  { id: 3, title: 'Design Patterns',   author: 'GoF',               price: 50.00, stock: 3  },
];

let users = [
  { id: 1, username: 'admin',   password: 'admin123',  role: 'admin' },
  { id: 2, username: 'student', password: 'student1',  role: 'user'  },
  { id: 3, username: 'guest',   password: '123456',    role: 'user'  },
];

let reviews = [];
let nextBookId   = 4;
let nextUserId   = 4;
let nextReviewId = 1;

// ─────────────────────────────────────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────────────────────────────────────

// POST /auth/login
// Vulnerability: weak JWT secret, Math.random session token, password in plaintext
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // Weak random session token
  const sessionToken = Math.random().toString(36).substr(2);

  // JWT signed with hardcoded weak secret, algorithm not restricted
  const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, JWT_SECRET);

  // Session cookie without Secure/HttpOnly flags
  res.cookie('session', sessionToken, { httpOnly: false, secure: false });
  res.json({ token, sessionToken, user: { id: user.id, username, role: user.role } });
});

// POST /auth/register
// Vulnerability: MD5 for password hashing, no input validation
app.post('/auth/register', (req, res) => {
  const { username, password, role } = req.body;
  // MD5 is cryptographically broken
  const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
  const newUser = { id: nextUserId++, username, password: hashedPassword, role: role || 'user' };
  users.push(newUser);
  res.status(201).json({ message: 'User created', user: newUser });
});

// ─────────────────────────────────────────────────────────────────────────────
//  BOOKS
// ─────────────────────────────────────────────────────────────────────────────

// GET /books?author=GoF
// Vulnerability: SQL Injection pattern (string interpolation in query log)
app.get('/books', (req, res) => {
  const author = req.query.author;
  if (author) {
    // Simulates SQL injection vulnerability: direct string concatenation
    const sql = "SELECT * FROM books WHERE author = '" + author + "'";
    console.log('[DB]', sql);
    const filtered = books.filter(b => b.author.toLowerCase().includes(author.toLowerCase()));
    return res.json(filtered);
  }
  res.json(books);
});

// GET /books/search?q=clean
// Vulnerability: Reflected XSS – user input echoed unescaped in HTML
app.get('/books/search', (req, res) => {
  const q = req.query.q || '';
  const results = books.filter(b =>
    b.title.toLowerCase().includes(q.toLowerCase()) ||
    b.author.toLowerCase().includes(q.toLowerCase())
  );
  // XSS: q is reflected unescaped into the HTML response
  res.send(`
    <html>
      <body>
        <h2>Search results for: ${q}</h2>
        <pre>${JSON.stringify(results, null, 2)}</pre>
      </body>
    </html>
  `);
});

// POST /books
// Vulnerability: no authorization check – any user can add books
app.post('/books', (req, res) => {
  const { title, author, price, stock } = req.body;
  const book = { id: nextBookId++, title, author, price, stock };
  books.push(book);
  res.status(201).json(book);
});

// DELETE /books/:id
// Vulnerability: no authentication/authorization – anyone can delete
app.delete('/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  books = books.filter(b => b.id !== id);
  res.json({ message: 'Deleted' });
});

// ─────────────────────────────────────────────────────────────────────────────
//  REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

// POST /books/:id/review  { author, content }
// Vulnerability: Stored XSS via marked (renders user markdown including <script>)
app.post('/books/:id/review', (req, res) => {
  const { author, content } = req.body;
  const review = { id: nextReviewId++, bookId: parseInt(req.params.id), author, content };
  reviews.push(review);
  res.status(201).json(review);
});

// GET /books/:id/reviews
// Vulnerability: Stored XSS – marked 2.0.0 does not sanitize HTML in markdown
app.get('/books/:id/reviews', (req, res) => {
  const bookReviews = reviews.filter(r => r.bookId === parseInt(req.params.id));
  const html = bookReviews
    .map(r => `<div><strong>${r.author}</strong>: ${marked(r.content)}</div>`)
    .join('');
  res.send(`<html><body><h2>Reviews</h2>${html}</body></html>`);
});

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN
// ─────────────────────────────────────────────────────────────────────────────

// GET /admin/users
// Vulnerability: hardcoded API key check, returns plaintext passwords
app.get('/admin/users', (req, res) => {
  const key = req.headers['x-api-key'];
  if (key !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  // Returns passwords in plaintext
  res.json({ users, dbPassword: DB_PASSWORD });
});

// POST /admin/cmd?run=ls
// Vulnerability: Command Injection – executes arbitrary shell commands
app.post('/admin/cmd', (req, res) => {
  const cmd = req.body.run || req.query.run;
  // Direct exec with user input – Command Injection
  exec(cmd, (err, stdout, stderr) => {
    res.json({ stdout, stderr, error: err ? err.message : null });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  FILES
// ─────────────────────────────────────────────────────────────────────────────

// GET /files?name=readme.txt
// Vulnerability: Path Traversal – no path sanitization
app.get('/files', (req, res) => {
  const fileName = req.query.name;
  // No sanitization → ../../etc/passwd works
  const filePath = path.join(__dirname, 'public', fileName);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).json({ error: 'File not found' });
    res.send(data);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

// GET /validate-isbn?isbn=...
// Vulnerability: ReDoS – catastrophic backtracking regex
app.get('/validate-isbn', (req, res) => {
  const isbn = req.query.isbn || '';
  // Vulnerable regex with catastrophic backtracking
  const isbnRegex = /^(([0-9]{1,3}-?)+)([0-9X])$/;
  const valid = isbnRegex.test(isbn);
  res.json({ valid, isbn });
});

// POST /settings  { config: { ... } }
// Vulnerability: Prototype Pollution via lodash merge
app.post('/settings', (req, res) => {
  const userConfig = req.body.config || {};
  const defaultConfig = { currency: 'CHF', language: 'de', theme: 'light' };
  // lodash 4.17.4 merge is vulnerable to prototype pollution
  const config = _.merge(defaultConfig, userConfig);
  res.json({ config });
});

// GET /fetch?url=https://...
// Vulnerability: SSRF + SSL verification disabled
app.get('/fetch', async (req, res) => {
  const url = req.query.url;
  try {
    const response = await axios.get(url, {
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });
    res.json({ data: response.data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /redirect?to=https://...
// Vulnerability: Open Redirect
app.get('/redirect', (req, res) => {
  const target = req.query.to;
  res.redirect(target);
});

// POST /calc  { expr: "2+2" }
// Vulnerability: eval() with user input → RCE
app.post('/calc', (req, res) => {
  const expr = req.body.expr;
  try {
    // eslint-disable-next-line no-eval
    const result = eval(expr);
    res.json({ result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Bookstore API running on http://localhost:${PORT}`);
});
