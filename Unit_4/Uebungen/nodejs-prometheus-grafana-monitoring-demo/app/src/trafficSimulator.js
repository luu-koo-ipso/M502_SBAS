// Hilfsfunktionen, um harmlosen Testtraffic und Security-Events zu simulieren
"use strict";

const {
  loginAttemptsTotal,
  sqlErrorsTotal,
  securityEventsTotal,
} = require("./metrics");

// Simuliert eine konfigurierbare Anzahl fehlgeschlagener Loginversuche
function simulateLoginFailures(count) {
  for (let i = 0; i < count; i++) {
    loginAttemptsTotal.inc({ result: "failed" });
    securityEventsTotal.inc({ type: "failed_login", severity: "warning" });
  }
}

// Simuliert eine konfigurierbare Anzahl von SQL-Fehlern
function simulateSqlErrors(count) {
  for (let i = 0; i < count; i++) {
    sqlErrorsTotal.inc({ endpoint: "/books/search" });
    securityEventsTotal.inc({ type: "sql_error", severity: "info" });
  }
}

module.exports = {
  simulateLoginFailures,
  simulateSqlErrors,
};
