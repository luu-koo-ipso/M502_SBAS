# Teil 1 – SAST-Antworten (Snyk Code + Snyk Open Source)

> Scans ausgeführt am 2026-08-15 mit `snyk code test --exclude=node_modules` und `snyk test`
> gegen `bookstore-api`. Organisation: `luu-koo-ipso`, Snyk CLI 1.1306.4.

---

## F1 – Anzahl gefundener Schwachstellen (Snyk Code / SAST)

Snyk Code meldet ohne Filter **28 Findings**, davon **21 im eigenen Quellcode** (`server.js`).
Die restlichen 7 liegen in `node_modules/` (express, axios) und sind für die Übung als
SCA-Themen zu werten, nicht als eigener Code. Bewertet wird der eigene Code:

| Schweregrad | Anzahl (nur `server.js`) | Anzahl (gesamter Scan) |
|-------------|--------------------------|------------------------|
| Critical    | 0                        | 0                      |
| High        | 7                        | 8                      |
| Medium      | 8                        | 10                     |
| Low         | 6                        | 10                     |
| **Total**   | **21**                   | **28**                 |

**High-Findings im eigenen Code (`server.js`):**

| Zeile | Typ                                | CWE     |
|-------|------------------------------------|---------|
| 18    | Hardcoded Secret (JWT_SECRET)      | CWE-547 |
| 20    | Hardcoded Non-Cryptographic Secret | CWE-547 |
| 104   | Cross-site Scripting (XSS)         | CWE-79  |
| 172   | Command Injection                  | CWE-78  |
| 187   | Path Traversal                     | CWE-23  |
| 222   | Server-Side Request Forgery (SSRF) | CWE-918 |
| 244   | Code Injection (eval)              | CWE-94  |

> Hinweis: Die im Code als "SQL Injection" kommentierte Stelle (`/books`, Zeile 87) wird von
> Snyk Code **nicht** als SQLi gemeldet, weil hier gar keine echte Datenbank angesprochen wird
> (die Query wird nur als String zusammengebaut und geloggt, gefiltert wird über `Array.filter`).
> Das Muster der String-Konkatenation ist trotzdem gefährlich – siehe F2.

---

## F2 – SQL Injection

- **Datei / Zeile:** `server.js`, Zeile 87 (Route `GET /books`)
  ```js
  const sql = "SELECT * FROM books WHERE author = '" + author + "'";
  ```
- **Warum ist String-Konkatenation gefährlich?**
  Benutzereingabe (`author`) wird direkt in den SQL-String eingesetzt. Ein Angreifer kann
  über Anführungszeichen aus dem Wert-Kontext ausbrechen und eigenen SQL-Code anhängen.
  Die Datenbank kann Daten und Code nicht mehr unterscheiden – die Query-Struktur wird
  vom Angreifer bestimmt statt vom Entwickler.
- **Beispiel-Payload:**
  ```
  GET /books?author=' OR '1'='1
  →  SELECT * FROM books WHERE author = '' OR '1'='1'
  ```
  Liefert alle Zeilen. Destruktiv:
  ```
  ?author='; DROP TABLE books;--
  ```
- **Fix:** Prepared Statements / parameterisierte Queries
  (`SELECT * FROM books WHERE author = ?`, Wert separat als Parameter binden).

---

## F3 – Hardcoded Credentials

- **Erkannte Werte (server.js, Zeilen 18–20):**
  | Konstante     | Wert                       |
  |---------------|----------------------------|
  | `JWT_SECRET`  | `bookstore_secret_123`     |
  | `ADMIN_KEY`   | `admin-key-do-not-share`   |
  | `DB_PASSWORD` | `dbpass_Bookstore2024!`    |

  Zusätzlich meldet Snyk Klartext-Passwörter im `users`-Array (Zeilen 34–35: `admin123`, `student1`).

- **Warum ein Sicherheitsproblem, auch wenn "geheim" aussehend?**
  - Der Wert liegt im Quellcode → landet in **Git-History** (auch nach Löschen noch abrufbar).
  - Jeder mit Repo-Zugriff (Entwickler, CI-Logs, Fork, geleaktes Backup) kennt das Secret.
  - Rotation ist praktisch unmöglich ohne Redeploy; ein Leak betrifft **alle** Umgebungen.
  - Mit dem `JWT_SECRET` kann ein Angreifer beliebige gültige Tokens signieren (z. B. `role: admin`).

- **Richtige Aufbewahrung:**
  Secrets aus dem Code heraushalten → **Umgebungsvariablen** (`process.env`, `.env` + `dotenv`,
  `.env` in `.gitignore`) oder ein **Secret-Manager** (HashiCorp Vault, AWS Secrets Manager,
  Azure Key Vault). Passwörter niemals im Klartext, sondern **gehasht** speichern (bcrypt/argon2, F4).

---

## F4 – Insecure Hashing (MD5)

- **Fundstelle:** `server.js`, Zeile 71 (Route `POST /auth/register`)
  ```js
  const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
  ```
- **Warum ist MD5 für Passwörter ungeeignet?**
  - **Zu schnell:** MD5 ist auf Geschwindigkeit optimiert → Milliarden Hashes/Sekunde auf einer GPU
    → Brute-Force / Wörterbuchangriffe sind trivial.
  - **Kein Salt:** Gleiche Passwörter ergeben gleiche Hashes → Rainbow-Tables funktionieren direkt.
  - **Kryptografisch gebrochen:** Kollisionsangriffe gegen MD5 sind seit Jahren praktisch möglich.
- **Alternativen:** **bcrypt**, **argon2** (empfohlen, Argon2id) oder **scrypt** / **PBKDF2**.
  Diese sind absichtlich langsam ("work factor" / cost), verwenden pro Hash einen zufälligen Salt
  und sind gegen GPU-Brute-Force gehärtet.

---

## F5 – Verwundbare Abhängigkeiten (Snyk Open Source / `snyk test`)

`snyk test` findet **67 eindeutige Schwachstellen** über 14 Pakete
(3 Critical, 31 High, 30 Medium, 3 Low).

- **Die 2 kritischsten Pakete (nach CVSS):**

  | Paket           | Max. CVSS | Kritischstes CVE          | Typ                     |
  |-----------------|-----------|---------------------------|-------------------------|
  | `axios@0.21.1`  | **9.1**   | CVE-2026-42035 (Critical) | HTTP Response Splitting |
  | `multer@1.4.4`  | **9.2**   | CVE-2025-48997 (Critical) | Uncaught Exception (DoS)|

  (Weiterhin kritisch: `node-serialize`-Muster ist hier nicht im Baum, aber `lodash@4.17.4`
  mit CVSS 8.6 Arbitrary Code Injection CVE-2026-4800 ist die dritthöchste.)

- **CVE-Nummer:** *Common Vulnerabilities and Exposures* – eine weltweit eindeutige ID für eine
  konkrete, öffentlich bekannte Schwachstelle (Format `CVE-Jahr-Nummer`).
- **CVSS-Score:** *Common Vulnerability Scoring System* – ein Zahlenwert **0.0–10.0**, der die
  Schwere ausdrückt (0–3.9 Low, 4–6.9 Medium, 7–8.9 High, 9–10 Critical). Berechnet aus
  Faktoren wie Angriffsvektor, Komplexität, benötigte Rechte und Auswirkung auf
  Vertraulichkeit/Integrität/Verfügbarkeit.
- **Update:** Versionen in `package.json` anheben und neu installieren, z. B.
  ```
  axios   0.21.1 → ≥1.12.x
  multer  1.4.4  → ≥2.x
  lodash  4.17.4 → ≥4.17.21
  express 4.17.1 → ≥4.20 (bzw. 5.x)
  ```
  Danach `npm install` + erneut `snyk test`. Snyk zeigt pro Paket die empfohlene Zielversion
  ("Upgrade X to Y to fix") direkt an.

---

## F6 – Bewertung (Risikomatrix, 3 SAST-Schwachstellen)

Risikostufe = Wahrscheinlichkeit × Auswirkung (jeweils 1–5).

| Schwachstelle                  | Wahrscheinlichkeit | Auswirkung | Risikostufe (W × A) |
|--------------------------------|:------------------:|:----------:|:-------------------:|
| Command Injection (`/admin/cmd`) |        5           |     5      |    **25** (kritisch) |
| Code Injection / `eval` (`/calc`)|        5           |     5      |    **25** (kritisch) |
| Path Traversal (`/files`)        |        5           |     4      |    **20** (hoch)     |

**Begründung:** Command Injection und `eval` erlauben beide direkte Remote Code Execution ohne
Authentifizierung → höchste Auswirkung, trivial ausnutzbar. Path Traversal erlaubt das Auslesen
beliebiger Dateien (Quellcode, `/etc/passwd`, potenziell Secrets) – Auswirkung leicht geringer,
da "nur" Lesezugriff, aber ebenfalls unauthentifiziert und trivial auslösbar.
