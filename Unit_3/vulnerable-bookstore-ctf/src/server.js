'use strict';

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

// Initialize database (creates tables and seed data on first run)
require('./database');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  // INTENTIONALLY VULNERABLE: Hardcoded weak session secret
  secret: 'bookstore-secret-123',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// Serve CSS, robots.txt
app.use(express.static(path.join(__dirname, 'public')));

// INTENTIONALLY VULNERABLE: Sensible Benutzerdatei öffentlich erreichbar
app.use('/backup', express.static(path.join(__dirname, '..', 'public-backup')));

// Routes
app.use('/', require('./routes/auth'));
app.use('/books', require('./routes/books'));
app.use('/xss', require('./routes/xss'));
app.use('/', require('./routes/files'));

app.get('/findings', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('findings', { user: req.session.user });
});

app.listen(PORT, () => {
  console.log('\n  =============================================');
  console.log('  Vulnerable Bookstore CTF – Schulungsapplikation');
  console.log(`  http://localhost:${PORT}`);
  console.log('  ACHTUNG: Nur fuer lokale Schulungszwecke!');
  console.log('  =============================================\n');
});
