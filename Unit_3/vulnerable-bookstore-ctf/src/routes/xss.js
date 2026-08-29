'use strict';

const express = require('express');
const router = express.Router();

// INTENTIONALLY VULNERABLE: Reflected XSS Demo

router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const message = 'message' in req.query ? req.query.message : null;
  res.render('xss', { user: req.session.user, message });
});

module.exports = router;
