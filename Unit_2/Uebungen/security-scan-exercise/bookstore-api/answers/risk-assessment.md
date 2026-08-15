# Teil 3 – Gesamtbewertung & Priorisierung

Zusammenführung aller Schwachstellen aus SAST (`snyk code test`), SCA (`snyk test`)
und den DAST-Tests (curl). CVSS-Werte: für SCA aus Snyk übernommen, für eigene
Code-Lücken als typische Referenzwerte geschätzt.

| #  | Schwachstelle                              | Gefunden durch | CVSS | Auswirkung                              | Priorität |
|----|--------------------------------------------|----------------|:----:|-----------------------------------------|:---------:|
| 1  | Command Injection (`/admin/cmd`)           | SAST + DAST    | 9.8  | Unauth. RCE – volle Systemübernahme     | **H**     |
| 2  | Code Injection / `eval` (`/calc`)          | SAST + DAST    | 9.8  | Unauth. RCE via JavaScript              | **H**     |
| 3  | axios@0.21.1 – HTTP Response Splitting      | SCA            | 9.1  | Kritisches CVE-2026-42035               | **H**     |
| 4  | multer@1.4.4 – Uncaught Exception (DoS)     | SCA            | 9.2  | Kritisches CVE-2025-48997               | **H**     |
| 5  | Path Traversal (`/files`)                  | SAST + DAST    | 7.5  | Beliebige Dateien lesbar (`/etc/passwd`)| **H**     |
| 6  | Hardcoded JWT_SECRET / Secrets             | SAST           | 7.5  | Token-Fälschung, Secret-Leak in Git     | **H**     |
| 7  | Broken Access Control (`DELETE/POST /books`)| DAST          | 7.5  | Unauth. Datenmanipulation               | **H**     |
| 8  | lodash@4.17.4 – Arbitrary Code Injection    | SCA            | 8.6  | CVE-2026-4800                           | **H**     |
| 9  | SSRF (`/fetch`, SSL-Check aus)             | SAST           | 7.7  | Interne Dienste erreichbar, MITM        | **H**     |
| 10 | Stored XSS (`/books/:id/reviews`, marked)  | SAST           | 6.1  | Persistenter JS-Code für alle Besucher  | **M**     |
| 11 | Reflected XSS (`/books/search`)            | SAST + DAST    | 6.1  | Session-Diebstahl via Link              | **M**     |
| 12 | Klartext-Passwörter + `/admin/users`-Leak  | SAST + DAST    | 6.5  | Passwörter & DB-Passwort im Klartext    | **M**     |
| 13 | MD5-Passwort-Hashing (`/auth/register`)    | SAST           | 5.9  | Passwörter leicht knackbar              | **M**     |
| 14 | Prototype Pollution (`/settings`, lodash)  | SAST + SCA     | 5.6  | Objekt-Manipulation, evtl. DoS/RCE      | **M**     |
| 15 | Open Redirect (`/redirect`)                | SAST + DAST    | 6.1  | Phishing-Weiterleitung                  | **M**     |
| 16 | SQL-Injection-Muster (`/books`)            | SAST (Kommentar)| 6.5 | String-Konkat. – bei echter DB kritisch | **M**     |
| 17 | jsonwebtoken@8.5.1 – schwache Alg.-Prüfung  | SCA            | 6.8  | Token-Manipulation CVE-2022-2354x       | **M**     |
| 18 | Schwaches Session-Token (`Math.random`)    | SAST           | 5.3  | Vorhersagbare Session-IDs               | **M**     |
| 19 | ReDoS (`/validate-isbn`, path-to-regexp)   | SAST + SCA     | 5.3  | DoS durch catastrophic backtracking     | **L**     |
| 20 | Cookie ohne HttpOnly/Secure (Zeile 62)     | SAST           | 4.0  | Cookie-Diebstahl per XSS/MITM erleichtert| **L**    |

**Priorisierungslogik**
- **H (High):** Unauthentifizierte RCE, Dateizugriff, kritische CVEs (CVSS ≥ 7) oder
  Secret-/Auth-Umgehung → sofort beheben.
- **M (Medium):** XSS, schwache Krypto, Prototype Pollution, Open Redirect, mittlere CVEs
  → zeitnah beheben.
- **L (Low):** DoS mit begrenzter Wirkung, Härtungsmängel → im Rahmen des normalen Backlogs.

**Empfohlene Sofortmaßnahmen (Top 3):** RCE-Endpunkte `/admin/cmd` und `/calc` entfernen
bzw. absichern, Path Traversal in `/files` schließen, alle Secrets aus dem Code entfernen
und rotieren.
