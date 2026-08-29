'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// INTENTIONALLY VULNERABLE: Benutzername Enumeration durch zu genaue Fehlermeldungen

const USERS_FILE = path.join(__dirname, '..', '..', 'data', 'users.json');

function loadUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

router.get('/', (req, res) => res.redirect('/login'));

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username);

  // INTENTIONALLY VULNERABLE: Benutzername Enumeration durch zu genaue Fehlermeldungen
  if (!user) {
    return res.render('login', { error: 'Benutzername falsch' });
  }
  if (user.password !== password) {
    return res.render('login', { error: 'Passwort falsch' });
  }

  req.session.user = { username: user.username, role: user.role };
  res.redirect('/dashboard');
});

router.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('dashboard', { user: req.session.user });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
