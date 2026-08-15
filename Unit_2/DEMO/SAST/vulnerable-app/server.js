/**
 * VulnerableSASTApp – Intentionally insecure Node.js application
 * ================================================================
 * WARNING: This application contains deliberate security vulnerabilities.
 * For educational / SAST training use ONLY. Do NOT deploy in production.
 *
 * Vulnerabilities included (detectable via Snyk Code + Snyk SCA):
 *
 *  [SAST – Snyk Code]
 *  V01 – SQL Injection              (string concatenation in query)
 *  V02 – Command Injection          (exec with unsanitized user input)
 *  V03 – Hardcoded Credentials      (passwords & API keys in source)
 *  V04 – Insecure Cryptography      (MD5 for password hashing)
 *  V05 – Path Traversal             (fs.readFile with user-controlled path)
 *  V06 – eval() with user input     (arbitrary code execution)
 *  V07 – Weak Random                (Math.random for security tokens)
 *  V08 – ReDoS                      (catastrophic backtracking regex)
 *  V09 – XSS                        (unescaped user input in HTML response)
 *  V10 – Insecure Deserialization   (node-serialize with user input)
 *  V11 – Prototype Pollution        (lodash merge with user-controlled object)
 *  V12 – SSL verification disabled  (axios with rejectUnauthorized: false)
 *  V13 – JWT secret hardcoded       (weak + hardcoded signing secret)
 *  V14 – Open Redirect              (redirect to user-supplied URL)
 *
 *  [SCA – Snyk Open Source]
 *  D01 – lodash      4.17.4   → Prototype Pollution (CVE-2019-10744)
 *  D02 – axios       0.21.1   → SSRF / ReDoS (CVE-2021-3749)
 *  D03 – marked      2.0.0    → XSS (CVE-2022-21681)
 *  D04 – jsonwebtoken 8.5.1   → Weak algorithm bypass
 *  D05 – node-serialize 0.0.4 → Remote Code Execution
 *  D06 – mysql       2.16.0   → SQL Injection helpers
 */

'use strict';

const express   = require('express');
const fs        = require('fs');
const path      = require('path');
const crypto    = require('crypto');
const { exec }  = require('child_process');
const axios     = require('axios');
const jwt       = require('jsonwebtoken');
const serialize = require('node-serialize');
const _         = require('lodash');
const marked    = require('marked');

const app  = express();
const PORT = 4000;

// ─── V03: Hardcoded credentials ───────────────────────────────────────────────
const DB_HOST     = 'db.internal';
const DB_USER     = 'root';
const DB_PASSWORD = 'SuperSecret123!';           // hardcoded DB password
const ADMIN_TOKEN = 'tok_admin_HARDCODED_4321';  // hardcoded admin token
const JWT_SECRET  = 'mysecretkey';               // V13: weak hardcoded JWT secret
const STRIPE_KEY  = 'sk_test_DEMO_KEY_REPLACE_ME';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Simulated in-memory user store ──────────────────────────────────────────
const users = [
  { id: 1, username: 'admin',   password: 'admin123',   role: 'admin' },
  { id: 2, username: 'alice',   password: 'Password1',  role: 'user'  },
  { id: 3, username: 'bob',     password: 'qwerty123',  role: 'user'  },
];

// ─── Helper: simulate a SQL query (shows injection pattern) ──────────────────
function queryDatabase(sql) {
  console.log(`[DB QUERY] ${sql}`);
  // In a real app this would hit MySQL. Here we just log for SAST detection.
  return [];
}

// =============================================================================
//  V01 – SQL Injection
//  Route: GET /user?name=alice
// =============================================================================
app.get('/user', (req, res) => {
  const name = req.query.name;
  // VULN: direct string concatenation → SQL Injection
  const sql = "SELECT * FROM users WHERE username = '" + name + "'";
  queryDatabase(sql);
  const user = users.find(u => u.username === name);
  res.json(user || { error: 'not found' });
});

// =============================================================================
//  V02 – Command Injection
//  Route: GET /ping?host=8.8.8.8
// =============================================================================
app.get('/ping', (req, res) => {
  const host = req.query.host;
  // VULN: unsanitized input passed directly to exec → Command Injection
  exec('ping -c 1 ' + host, (err, stdout, stderr) => {
    res.send(`<pre>${stdout}${stderr}</pre>`);
  });
});

// =============================================================================
//  V04 – Insecure Cryptography (MD5 password hashing)
//  Route: POST /register  { username, password }
// =============================================================================
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  // VULN: MD5 is cryptographically broken – should use bcrypt/argon2
  const hash = crypto.createHash('md5').update(password).digest('hex');
  users.push({ id: users.length + 1, username, password: hash, role: 'user' });
  res.json({ message: 'User registered', hash });
});

// =============================================================================
//  V05 – Path Traversal
//  Route: GET /file?name=readme.txt
// =============================================================================
app.get('/file', (req, res) => {
  const fileName = req.query.name;
  // VULN: no path sanitization → Path Traversal (../../etc/passwd)
  const filePath = path.join(__dirname, 'files', fileName);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).send('File not found');
    res.send(data);
  });
});

// =============================================================================
//  V06 – eval() with user input
//  Route: POST /calc  { expr: "2+2" }
// =============================================================================
app.post('/calc', (req, res) => {
  const expr = req.body.expr;
  // VULN: eval() with user input → arbitrary server-side code execution
  try {
    const result = eval(expr);
    res.json({ result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// =============================================================================
//  V07 – Weak Random (Math.random for security token)
//  Route: POST /login  { username, password }
// =============================================================================
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // VULN: Math.random is not cryptographically secure → predictable token
  const sessionToken = Math.random().toString(36).substr(2);

  // V13: sign JWT with hardcoded weak secret
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

  res.json({ sessionToken, token });
});

// =============================================================================
//  V08 – ReDoS (Regular Expression Denial of Service)
//  Route: GET /validate-email?email=...
// =============================================================================
app.get('/validate-email', (req, res) => {
  const email = req.query.email;
  // VULN: catastrophic backtracking on malicious input
  const unsafeRegex = /^([a-zA-Z0-9])(([a-zA-Z0-9])*([._-]){0,1})*([a-zA-Z0-9])*@.*$/;
  const valid = unsafeRegex.test(email);
  res.json({ valid });
});

// =============================================================================
//  V09 – XSS (Reflected Cross-Site Scripting)
//  Route: GET /greet?name=World
// =============================================================================
app.get('/greet', (req, res) => {
  const name = req.query.name;
  // VULN: user input reflected unescaped into HTML → XSS
  res.send(`<html><body><h1>Hello, ${name}!</h1></body></html>`);
});

// =============================================================================
//  V10 – Insecure Deserialization
//  Route: POST /profile  { data: "<serialized>" }
// =============================================================================
app.post('/profile', (req, res) => {
  const data = req.body.data;
  // VULN: node-serialize unserialize with user input → Remote Code Execution
  const obj = serialize.unserialize(data);
  res.json({ profile: obj });
});

// =============================================================================
//  V11 – Prototype Pollution (lodash merge)
//  Route: POST /settings  { config: {...} }
// =============================================================================
app.post('/settings', (req, res) => {
  const userConfig = req.body.config;
  const baseConfig = { theme: 'light', language: 'de' };
  // VULN: _.merge with user-controlled object → Prototype Pollution
  const merged = _.merge(baseConfig, userConfig);
  res.json({ config: merged });
});

// =============================================================================
//  V12 – SSL verification disabled
//  Route: GET /fetch?url=https://example.com
// =============================================================================
app.get('/fetch', async (req, res) => {
  const url = req.query.url;
  try {
    // VULN: rejectUnauthorized: false disables TLS certificate validation
    const response = await axios.get(url, {
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });
    res.send(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =============================================================================
//  V14 – Open Redirect
//  Route: GET /redirect?url=https://evil.com
// =============================================================================
app.get('/redirect', (req, res) => {
  const target = req.query.url;
  // VULN: no validation of redirect target → Open Redirect
  res.redirect(target);
});

// =============================================================================
//  V09b – Stored XSS via marked (dependency + code pattern)
//  Route: POST /post  { content: "# Hello <script>..." }
// =============================================================================
app.post('/post', (req, res) => {
  const content = req.body.content;
  // VULN: marked 2.0.0 does not sanitize HTML → Stored XSS
  const html = marked(content);
  res.send(`<html><body>${html}</body></html>`);
});

// =============================================================================
//  Admin endpoint with hardcoded token check
// =============================================================================
app.get('/admin', (req, res) => {
  const token = req.headers['x-admin-token'];
  // VULN: hardcoded token comparison (V03)
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json({
    users,
    dbPassword: DB_PASSWORD,   // VULN: leaking credentials in API response
    stripeKey: STRIPE_KEY,
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[VulnerableSASTApp] Running on http://localhost:${PORT}`);
  console.log('WARNING: This app is intentionally insecure. For training only.');
});
