// Demo Express App fuer die Monitoring-Schulung (Node.js + Prometheus + Grafana)
"use strict";

const express = require("express");
const {
  register,
  metricsMiddleware,
  loginAttemptsTotal,
  bookSearchTotal,
  sqlErrorsTotal,
  securityEventsTotal,
  activeUsers,
} = require("./metrics");
const { simulateLoginFailures, simulateSqlErrors } = require("./trafficSimulator");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(metricsMiddleware);

// In-Memory Buchliste, nur fuer die Demo. Keine echten Daten.
const BOOKS = [
  { id: 1, title: "Clean Code", author: "Robert C. Martin" },
  { id: 2, title: "The Pragmatic Programmer", author: "Andrew Hunt" },
  { id: 3, title: "Web Application Security", author: "Andrew Hoffman" },
  { id: 4, title: "Site Reliability Engineering", author: "Google" },
  { id: 5, title: "Grokking Algorithms", author: "Aditya Bhargava" },
];

// Demo-Zugangsdaten, ausschliesslich fuer diese lokale Schulungsumgebung
const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "admin1234";

app.get("/", (req, res) => {
  res.send(`
    <h1>Node.js Prometheus Grafana Monitoring Demo</h1>
    <p>Diese Demo-App stellt Metriken unter <code>/metrics</code> bereit.</p>
    <ul>
      <li><a href="/health">/health</a></li>
      <li><a href="/books/search?q=clean">/books/search?q=clean</a></li>
      <li><a href="/simulate/traffic">/simulate/traffic</a></li>
      <li><a href="/simulate/login-failures">/simulate/login-failures</a></li>
      <li><a href="/simulate/sql-errors">/simulate/sql-errors</a></li>
      <li><a href="/metrics">/metrics</a></li>
    </ul>
  `);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/books/search", (req, res) => {
  const q = (req.query.q || "").toString();

  // Simulierter, ungefaehrlicher SQL-Fehler, nur zu Demozwecken
  if (q.toLowerCase().includes("error")) {
    sqlErrorsTotal.inc({ endpoint: "/books/search" });
    securityEventsTotal.inc({ type: "sql_error", severity: "info" });
    bookSearchTotal.inc({ result: "error" });
    res.status(500).json({ message: "Simulierter SQL-Fehler bei der Buchsuche" });
    return;
  }

  const results = BOOKS.filter((book) =>
    book.title.toLowerCase().includes(q.toLowerCase())
  );

  if (results.length === 0) {
    bookSearchTotal.inc({ result: "empty" });
  } else {
    bookSearchTotal.inc({ result: "success" });
  }

  res.json({ query: q, results });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (username === DEMO_USERNAME && password === DEMO_PASSWORD) {
    loginAttemptsTotal.inc({ result: "success" });
    activeUsers.inc(1);
    res.json({ message: "Login erfolgreich" });
    return;
  }

  // Generische Fehlermeldung, keine Benutzername-Enumeration
  loginAttemptsTotal.inc({ result: "failed" });
  securityEventsTotal.inc({ type: "failed_login", severity: "warning" });
  res.status(401).json({ message: "Login fehlgeschlagen" });
});

app.get("/simulate/traffic", (req, res) => {
  const queries = ["clean", "security", "algorithms", "reliability"];
  queries.forEach((q) => {
    const results = BOOKS.filter((book) =>
      book.title.toLowerCase().includes(q)
    );
    bookSearchTotal.inc({ result: results.length > 0 ? "success" : "empty" });
  });

  res.json({ message: "Normaler Testtraffic simuliert" });
});

app.get("/simulate/login-failures", (req, res) => {
  simulateLoginFailures(10);
  res.json({ message: "10 fehlgeschlagene Logins simuliert" });
});

app.get("/simulate/sql-errors", (req, res) => {
  simulateSqlErrors(5);
  res.json({ message: "5 SQL-Fehler simuliert" });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, () => {
  console.log(`Monitoring Demo App laeuft auf http://localhost:${PORT}`);
});
