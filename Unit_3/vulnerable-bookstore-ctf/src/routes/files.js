'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');

// INTENTIONALLY VULNERABLE: Information Disclosure durch technische Fehlerdetails
router.get('/debug/error', (req, res) => {
  let stack = '';
  try {
    throw new Error('SQLITE_ERROR: no such table: sessions');
  } catch (err) {
    stack = err.stack;
  }

  res.render('files', {
    errorMessage: 'SQLITE_ERROR: no such table: sessions',
    stack,
    dbPath: path.join(__dirname, '..', '..', 'data', 'bookstore.db'),
    nodeVersion: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
