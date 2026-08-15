/**
 * VulnerableApp – Intentionally insecure Express API
 * ====================================================
 * WARNING: This application contains deliberate security vulnerabilities.
 * For educational / training use ONLY.  Do NOT deploy in production.
 *
 * Covered OWASP Top 10 (2021):
 *  A01 – Broken Access Control     (IDOR, missing auth on admin routes)
 *  A02 – Cryptographic Failures     (plaintext passwords, sensitive data in responses)
 *  A03 – Injection                  (SQL Injection, Reflected XSS, Stored XSS, Command Injection)
 *  A04 – Insecure Design            (no rate-limiting, predictable tokens)
 *  A05 – Security Misconfiguration  (no security headers, verbose errors, debug endpoint)
 *  A07 – Auth Failures              (no lockout, weak passwords accepted, credentials in URL)
 *  A08 – Data Integrity Failures    (no CSRF protection)
 *  A10 – SSRF                       (/api/fetch, /api/webhook)
 *  + Path Traversal, Open Redirect, CORS wildcard, Cookie flags missing
 */

'use strict';

const express  = require('express');
const alasql   = require('alasql');
const path     = require('path');
const fs       = require('fs');
const os       = require('os');
const http     = require('http');
const https    = require('https');
const { exec } = require('child_process');

const app  = express();
const PORT = 3000;

// ─── IN-MEMORY DATABASE (alasql – pure JavaScript, no native deps) ──────────

alasql('CREATE TABLE users  (id INT, username STRING, password STRING, email STRING, role STRING, token STRING)');
alasql('CREATE TABLE posts   (id INT, title STRING, content STRING, author STRING, created_at STRING)');
alasql('CREATE TABLE comments(id INT, post_id INT, author STRING, content STRING, created_at STRING)');
alasql('CREATE TABLE orders  (id INT, user_id INT, item STRING, amount NUMBER)');

// Seed – VULN A02: plaintext passwords
alasql("INSERT INTO users VALUES (1,'admin','admin123','admin@corp.local','admin','tok_admin_secret_a1b2c3')");
alasql("INSERT INTO users VALUES (2,'alice','Password1','alice@corp.local','user','tok_alice_d4e5f6')");
alasql("INSERT INTO users VALUES (3,'bob','qwerty123','bob@corp.local','user','tok_bob_g7h8i9')");
alasql("INSERT INTO users VALUES (4,'charlie','123456','charlie@corp.local','user','tok_charlie_j0k1l2')");

alasql("INSERT INTO posts VALUES (1,'Welcome to VulnerableApp','This app is intentionally insecure. Have fun scanning!','admin','2024-01-01')");
alasql("INSERT INTO posts VALUES (2,'Security Tips','Always use strong passwords and enable 2FA!','alice','2024-01-02')");
alasql("INSERT INTO posts VALUES (3,'Upcoming Maintenance','We will be offline on Saturday for updates.','admin','2024-01-03')");

alasql("INSERT INTO comments VALUES (1,1,'bob','Great post, very helpful!','2024-01-01')");
alasql("INSERT INTO comments VALUES (2,1,'charlie','Thanks for the heads up.','2024-01-01')");
alasql("INSERT INTO comments VALUES (3,2,'bob','I use 123456 -- is that okay?','2024-01-02')");

alasql("INSERT INTO orders VALUES (1,1,'Premium Subscription',99.99)");
alasql("INSERT INTO orders VALUES (2,2,'Basic Plan',9.99)");
alasql("INSERT INTO orders VALUES (3,3,'Enterprise License',499.99)");

let nextUserId    = 5;
let nextPostId    = 4;
let nextCommentId = 4;

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────

// VULN A05: No security headers (no helmet)
// VULN A05: CORS wildcard
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin',      '*');
  res.header('Access-Control-Allow-Methods',     'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers',     '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  // X-Powered-By: Express intentionally NOT disabled
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── HELPER ──────────────────────────────────────────────────────────────────

function htmlPage(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body>
<h2>${title}</h2>
${bodyHtml}
<p><a href="/">Home</a></p>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// A07 – AUTHENTICATION FAILURES
// ═══════════════════════════════════════════════════════════════════════════════

// VULN: SQL Injection + full user (including password) returned + no lockout
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  try {
    // SQL-Injection bypass: admin'--   OR   ' OR '1'='1
    const rows = alasql(sql);
    if (rows.length > 0) {
      const user = rows[0];
      // VULN: no HttpOnly / Secure / SameSite on cookie
      res.setHeader('Set-Cookie', `session=${user.token}; Path=/`);
      // VULN A02: plaintext password in response
      return res.json({ success: true, token: user.token, user });
    }
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (e) {
    // VULN A05: raw SQL query exposed in error response
    res.status(500).json({ error: e.message, sql });
  }
});

// VULN: credentials in GET parameters (URL, browser history, server logs)
app.get('/api/login', (req, res) => {
  const { username, password } = req.query;
  try {
    const rows = alasql(`SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`);
    if (rows.length > 0) return res.json({ success: true, token: rows[0].token });
    res.status(401).json({ success: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// VULN A04: no password policy, no validation, predictable token format
app.post('/api/register', (req, res) => {
  const { username, password, email } = req.body;
  const token = `tok_${username}_${Date.now()}`;
  try {
    alasql(`INSERT INTO users VALUES (${nextUserId},'${username}','${password}','${email || ''}','user','${token}')`);
    nextUserId++;
    res.json({ success: true, token, message: `Account created for ${username}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// A03 – INJECTION: SQL Injection
// NOTE: /api/users/search MUST be defined before /api/users/:id
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/users/search', (req, res) => {
  const q = req.query.q || '';
  try {
    // VULN: string concatenation into SQL
    const rows = alasql(`SELECT id, username, email, role FROM users WHERE username LIKE '%${q}%' OR email LIKE '%${q}%'`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/posts/search', (req, res) => {
  const q      = req.query.q      || '';
  const author = req.query.author || '';
  try {
    const rows = alasql(`SELECT * FROM posts WHERE (title LIKE '%${q}%' OR content LIKE '%${q}%') AND author LIKE '%${author}%'`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/orders/search', (req, res) => {
  const item = req.query.item || '';
  try {
    const rows = alasql(`SELECT * FROM orders WHERE item LIKE '%${item}%'`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// A01 – BROKEN ACCESS CONTROL: IDOR
// ═══════════════════════════════════════════════════════════════════════════════

// VULN: no authentication check, any user ID fetchable by anyone
// VULN A02: returns plaintext password
app.get('/api/users/:id', (req, res) => {
  const rows = alasql(`SELECT * FROM users WHERE id = ${Number(req.params.id)}`);
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

app.put('/api/users/:id', (req, res) => {
  const { email, password } = req.body;
  // VULN: no auth check – anyone can update any user record
  alasql(`UPDATE users SET email='${email}', password='${password}' WHERE id=${Number(req.params.id)}`);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// A01 – BROKEN ACCESS CONTROL: Missing auth on admin routes
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/admin/users', (req, res) => {
  // VULN: no authentication / authorization
  res.json(alasql('SELECT * FROM users'));
});

app.delete('/api/admin/users/:id', (req, res) => {
  alasql(`DELETE FROM users WHERE id = ${Number(req.params.id)}`);
  res.json({ success: true, deleted: req.params.id });
});

app.get('/api/admin/orders', (req, res) => {
  res.json(alasql('SELECT * FROM orders'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// A03 – INJECTION: Stored XSS (posts & comments)
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/posts', (req, res) => {
  res.json(alasql('SELECT * FROM posts ORDER BY id DESC'));
});

app.post('/api/posts', (req, res) => {
  const { title, content, author } = req.body;
  // VULN: no sanitization – XSS payload stored and returned to all users
  alasql(`INSERT INTO posts VALUES (${nextPostId},'${title}','${content}','${author}','${new Date().toISOString()}')`);
  res.json({ success: true, id: nextPostId++ });
});

app.get('/api/posts/:id/comments', (req, res) => {
  res.json(alasql(`SELECT * FROM comments WHERE post_id = ${Number(req.params.id)}`));
});

app.post('/api/posts/:id/comments', (req, res) => {
  const { author, content } = req.body;
  // VULN: no sanitization – stored XSS
  alasql(`INSERT INTO comments VALUES (${nextCommentId},${Number(req.params.id)},'${author}','${content}','${new Date().toISOString()}')`);
  res.json({ success: true, id: nextCommentId++ });
});

// ═══════════════════════════════════════════════════════════════════════════════
// A03 – INJECTION: Reflected XSS
// ═══════════════════════════════════════════════════════════════════════════════

// VULN: user input reflected directly in HTML without encoding
app.get('/search', (req, res) => {
  const q      = req.query.q      || '';
  const filter = req.query.filter || 'all';
  res.setHeader('Content-Type', 'text/html');
  res.send(htmlPage(`Search: ${q}`,
    `<p>Results for: <b>${q}</b> | Filter: <em>${filter}</em></p>
     <p>No results found.</p>
     <form action="/search" method="get">
       <input name="q" value="${q}" placeholder="Search...">
       <input name="filter" value="${filter}">
       <button type="submit">Search</button>
     </form>`
  ));
});

app.get('/user/profile', (req, res) => {
  const name = req.query.name || 'Guest';
  const msg  = req.query.msg  || '';
  res.setHeader('Content-Type', 'text/html');
  res.send(htmlPage(`Profile: ${name}`,
    `<p>Welcome, ${name}!</p>
     ${msg ? `<div class="alert">${msg}</div>` : ''}`
  ));
});

app.get('/error', (req, res) => {
  const code = req.query.code || '500';
  const msg  = req.query.msg  || 'An error occurred';
  res.setHeader('Content-Type', 'text/html');
  res.status(parseInt(code) || 500).send(htmlPage(`Error ${code}`,
    `<p>Error ${code}: ${msg}</p>`
  ));
});

// ═══════════════════════════════════════════════════════════════════════════════
// A03 – INJECTION: Command Injection
// ═══════════════════════════════════════════════════════════════════════════════

// VULN: user input concatenated directly into shell command
// Windows payloads: 127.0.0.1 & whoami   |   127.0.0.1 && ipconfig
app.get('/api/ping', (req, res) => {
  const host = req.query.host || '127.0.0.1';
  exec(`ping -n 2 ${host}`, { timeout: 6000 }, (err, stdout, stderr) => {
    res.json({ host, output: stdout || stderr || err?.message });
  });
});

app.get('/api/nslookup', (req, res) => {
  const host = req.query.host || 'localhost';
  exec(`nslookup ${host}`, { timeout: 5000 }, (err, stdout, stderr) => {
    res.json({ host, output: stdout || stderr || err?.message });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATH TRAVERSAL
// ═══════════════════════════════════════════════════════════════════════════════

// VULN: no path sanitization – read arbitrary files on the server
// Payloads: ../server.js   ../config.json   ../package.json
app.get('/api/files', (req, res) => {
  const name     = req.query.name || 'readme.txt';
  const filepath = path.join(__dirname, 'files', name);
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    res.type('text/plain').send(content);
  } catch (e) {
    // VULN A05: full resolved path in error response
    res.status(500).json({ error: e.message, resolvedPath: filepath });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// OPEN REDIRECT
// ═══════════════════════════════════════════════════════════════════════════════

// VULN: no URL validation
app.get('/redirect', (req, res) => {
  const url = req.query.url || '/';
  res.redirect(url);
});

app.get('/go', (req, res) => {
  const target = req.query.target || '/';
  res.redirect(302, target);
});

// ═══════════════════════════════════════════════════════════════════════════════
// A10 – SSRF
// ═══════════════════════════════════════════════════════════════════════════════

// VULN: server fetches any URL supplied by the client
// Payloads: http://127.0.0.1:3000/api/config   http://169.254.169.254/latest/meta-data/
app.get('/api/fetch', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url parameter is required' });
  const client = url.startsWith('https') ? https : http;
  client.get(url, { timeout: 5000 }, (response) => {
    let data = '';
    response.on('data', chunk => (data += chunk));
    response.on('end',  () => res.send(data));
  }).on('error', e => res.status(500).json({ error: e.message }));
});

// VULN: SSRF via webhook callback URL
app.post('/api/webhook', (req, res) => {
  const { callback_url, data } = req.body;
  if (!callback_url) return res.status(400).json({ error: 'callback_url required' });
  try {
    const parsed  = new URL(callback_url);
    const client  = parsed.protocol === 'https:' ? https : http;
    const postReq = client.request(
      { hostname: parsed.hostname, port: parsed.port, path: parsed.pathname,
        method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: 5000 },
      (response) => res.json({ success: true, status: response.statusCode })
    );
    postReq.on('error', e => res.status(500).json({ error: e.message }));
    postReq.write(JSON.stringify(data || {}));
    postReq.end();
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// A05 – SECURITY MISCONFIGURATION: Information Disclosure
// ═══════════════════════════════════════════════════════════════════════════════

// VULN: exposes environment variables, OS details, and all user records
app.get('/api/debug', (req, res) => {
  res.json({
    env:               process.env,
    cwd:               process.cwd(),
    platform:          process.platform,
    nodeVersions:      process.versions,
    hostname:          os.hostname(),
    networkInterfaces: os.networkInterfaces(),
    uptime:            process.uptime(),
    allUsers:          alasql('SELECT * FROM users'), // all passwords exposed!
  });
});

// VULN: hardcoded secrets returned as JSON
app.get('/api/config', (req, res) => {
  res.json({
    database_url:  'sqlite://./data.db',
    admin_token:   'tok_admin_secret_a1b2c3',
    jwt_secret:    'supersecretjwt',
    api_key:       'sk_live_abc123xyz789',
    smtp_password: 'mailpass_Secr3t',
    stripe_secret: 'sk_live_51NxFake...',
    version:       '1.0.0',
  });
});

// VULN: full stack trace + connection string with credentials exposed
app.get('/api/error-demo', (req, res) => {
  try {
    throw new Error('Connection refused: db://admin:Secr3t@db.internal:5432/production');
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MISC – Additional attack surface
// ═══════════════════════════════════════════════════════════════════════════════

// VULN A08: state-changing endpoint with no CSRF token
app.post('/api/transfer', (req, res) => {
  const { from_user, to_user, amount } = req.body;
  res.json({ success: true, message: `Transferred ${amount} from user ${from_user} to user ${to_user}` });
});

// VULN: accepts all HTTP verbs (verb tampering)
app.all('/api/bypass', (req, res) => {
  res.json({ method: req.method, headers: req.headers, body: req.body });
});

// Route list – helps ZAP discover all endpoints
app.get('/api/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(r => {
    if (r.route) routes.push({ path: r.route.path, methods: Object.keys(r.route.methods) });
  });
  res.json(routes);
});

// ─── START ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  VulnerableApp running -> http://localhost:${PORT}`);
  console.log('  WARNING: Contains intentional vulnerabilities - for training only!\n');
});
