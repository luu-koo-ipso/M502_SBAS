'use strict';

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, 'bookstore.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Datenbankfehler:', err.message);
  } else {
    console.log('Datenbank verbunden:', DB_PATH);
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT UNIQUE NOT NULL,
    author TEXT NOT NULL,
    category TEXT,
    price REAL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL
  )`);

  const stmtBook = db.prepare(
    'INSERT OR IGNORE INTO books (title, author, category, price) VALUES (?, ?, ?, ?)'
  );
  [
    ['Clean Code', 'Robert C. Martin', 'Software Engineering', 29.99],
    ['The Pragmatic Programmer', 'Andrew Hunt', 'Software Engineering', 34.99],
    ['Web Security Testing Guide', 'OWASP Foundation', 'Security', 0.00],
    ['JavaScript Security', 'Lewis Ardern', 'Security', 24.99],
    ['Node.js Design Patterns', 'Mario Casciaro', 'Node.js', 39.99]
  ].forEach(b => stmtBook.run(b));
  stmtBook.finalize();

  const stmtUser = db.prepare(
    'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)'
  );
  [
    ['admin', 'admin1234', 'admin'],
    ['student', 'student1234', 'user'],
    ['bryan', 'bryan1234', 'user']
  ].forEach(u => stmtUser.run(u));
  stmtUser.finalize();

  const stmtFlag = db.prepare(
    'INSERT OR IGNORE INTO flags (name, value) VALUES (?, ?)'
  );
  [
    ['sql_injection', 'FLAG{SQL_INJECTION_ERFOLGREICH}'],
    ['hidden_admin_data', 'FLAG{DATENBANK_TABELLEN_GEFUNDEN}']
  ].forEach(f => stmtFlag.run(f));
  stmtFlag.finalize();
});

module.exports = db;
