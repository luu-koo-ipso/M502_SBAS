// Zentrale Definition aller Prometheus-Metriken fuer die Monitoring-Demo
"use strict";

const client = require("prom-client");

// Eigenes Registry-Objekt, damit nur unsere Metriken exportiert werden
const register = new client.Registry();

// Default Node.js Metriken (Memory, CPU, Event Loop, ...) mit eigenem Prefix
client.collectDefaultMetrics({
  register,
  prefix: "nodejs_",
});

// 1. HTTP Requests Counter
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Zaehlt alle HTTP Requests nach Methode, Route und Statuscode.",
  labelNames: ["method", "route", "status"],
});

// 2. HTTP Request Duration Histogram
const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Misst Antwortzeiten pro Request.",
  labelNames: ["method", "route", "status"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

// 3. Login Attempts Counter
const loginAttemptsTotal = new client.Counter({
  name: "login_attempts_total",
  help: "Zaehlt erfolgreiche und fehlgeschlagene Loginversuche.",
  labelNames: ["result"], // success | failed
});

// 4. Book Search Counter
const bookSearchTotal = new client.Counter({
  name: "book_search_total",
  help: "Zaehlt Buchsuchanfragen nach Ergebnis.",
  labelNames: ["result"], // success | empty | error
});

// 5. SQL Errors Counter
const sqlErrorsTotal = new client.Counter({
  name: "sql_errors_total",
  help: "Zaehlt simulierte SQL-Fehler.",
  labelNames: ["endpoint"],
});

// 6. Security Events Counter
const securityEventsTotal = new client.Counter({
  name: "security_events_total",
  help: "Zaehlt Security-relevante Events.",
  labelNames: ["type", "severity"], // type: failed_login|sql_error|suspicious_search|rate_limit, severity: info|warning|high
});

// 7. Active Users Gauge
const activeUsers = new client.Gauge({
  name: "active_users",
  help: "Simulierter Wert fuer aktuell aktive Benutzer.",
});

// 8. Open Security Findings Gauge
const openSecurityFindings = new client.Gauge({
  name: "open_security_findings",
  help: "Simulierte offene Security Findings.",
  labelNames: ["severity"], // low | medium | high | critical
});

// 9. App Info Gauge
const appInfo = new client.Gauge({
  name: "app_info",
  help: "Metainformationen zur App.",
  labelNames: ["version", "environment"],
});

// Alle Custom-Metriken am Registry registrieren
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(loginAttemptsTotal);
register.registerMetric(bookSearchTotal);
register.registerMetric(sqlErrorsTotal);
register.registerMetric(securityEventsTotal);
register.registerMetric(activeUsers);
register.registerMetric(openSecurityFindings);
register.registerMetric(appInfo);

// Initialwerte fuer die Security Findings setzen
openSecurityFindings.set({ severity: "low" }, 4);
openSecurityFindings.set({ severity: "medium" }, 2);
openSecurityFindings.set({ severity: "high" }, 1);
openSecurityFindings.set({ severity: "critical" }, 0);

// App-Info Metrik setzen
appInfo.set(
  { version: "1.0.0", environment: "training" },
  1
);

// Express Middleware, die Dauer, Methode, Route und Status je Request misst
function metricsMiddleware(req, res, next) {
  const endTimer = process.hrtime.bigint();

  res.on("finish", () => {
    // Route moeglichst aus req.route.path lesen, sonst Fallback auf req.path
    // Keine Query-Parameter als Label verwenden, um Label-Explosion zu vermeiden
    const route = (req.route && req.route.path) || req.path;
    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);

    const durationSeconds =
      Number(process.hrtime.bigint() - endTimer) / 1e9;
    httpRequestDurationSeconds.observe(labels, durationSeconds);
  });

  next();
}

module.exports = {
  register,
  metricsMiddleware,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  loginAttemptsTotal,
  bookSearchTotal,
  sqlErrorsTotal,
  securityEventsTotal,
  activeUsers,
  openSecurityFindings,
  appInfo,
};
