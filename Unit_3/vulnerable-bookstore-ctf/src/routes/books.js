'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('books', { results: null, query: '', error: null, flagFound: false });
});

router.get('/search', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const q = req.query.q || '';

  // INTENTIONALLY VULNERABLE: SQL Injection in book search
  const sql = `SELECT id, title, author, category, price FROM books WHERE title LIKE '%${q}%' OR author LIKE '%${q}%'`;

  db.all(sql, (err, rows) => {
    if (err) {
      return res.render('books', {
        results: [],
        query: q,
        error: 'SQL Fehler: ' + err.message,
        flagFound: false
      });
    }

    // Detect successful SQL injection that retrieved the flags table
    const flagFound = rows.some(row =>
      Object.values(row).some(val => val && String(val).includes('FLAG{SQL_INJECTION'))
    );

    res.render('books', { results: rows, query: q, error: null, flagFound });
  });
});

module.exports = router;
