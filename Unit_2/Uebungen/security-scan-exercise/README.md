# Übung: SAST & DAST Security Scan – Bookstore API

**Modul:** M502 – Application Security  
**Schwierigkeit:** ⭐⭐⭐ (mittel)  
**Zeitaufwand:** ca. 90 Minuten

---

## Ausgangslage

Du hast Zugriff auf eine einfache Buchhandlungs-REST-API (`bookstore-api`).  
Die Applikation enthält mehrere **absichtlich eingebaute Sicherheitslücken**.

Deine Aufgabe ist es, diese Lücken mit zwei verschiedenen Scan-Methoden zu finden, zu bewerten und optional zu beheben.

---

## Setup

```bash
cd bookstore-api
npm install
node server.js
# → App läuft auf http://localhost:5000
```

---

## Teil 1 – SAST (Static Application Security Testing)

Analysiere den **Quellcode** mit Snyk Code, **ohne die Applikation zu starten**.

### Scan ausführen

```bash
# Im Ordner bookstore-api
snyk auth          # Einmalig – Browser öffnet sich
snyk code test     # SAST-Scan
snyk test          # Dependency-Scan (SCA)
```

### Fragen – SAST

Beantworte die folgenden Fragen schriftlich (in `answers/sast-answers.md`):

**F1.** Wie viele Schwachstellen hat Snyk Code insgesamt gefunden?  
Trage die Ergebnisse in die Tabelle ein:

| Schweregrad | Anzahl |
|-------------|--------|
| Critical    |        |
| High        |        |
| Medium      |        |
| Low         |        |

---

**F2.** Snyk meldet eine **SQL Injection**. Beantworte:
- In welcher Datei und Zeile befindet sich die Schwachstelle?
- Warum ist String-Konkatenation in SQL-Queries gefährlich?
- Welcher Angriff wäre möglich? Gib ein Beispiel-Payload an.

---

**F3.** Snyk meldet **Hardcoded Credentials**. Beantworte:
- Welche Werte wurden als hartcodierte Secrets erkannt?
- Warum ist das ein Sicherheitsproblem, auch wenn die Werte "geheim" aussehen?
- Wie sollten Secrets in einer echten Applikation gespeichert werden?

---

**F4.** Snyk meldet **Insecure Hashing** (MD5). Beantworte:
- Wo im Code wird MD5 verwendet?
- Warum ist MD5 für das Hashing von Passwörtern ungeeignet?
- Welche Alternativen gibt es?

---

**F5.** Beim Dependency-Scan (`snyk test`) werden verwundbare Pakete gefunden. Beantworte:
- Welche 2 Pakete weisen die kritischsten CVEs auf?
- Was bedeutet CVE-Nummer und CVSS-Score?
- Wie würde man diese Abhängigkeiten aktualisieren?

---

**F6.** Bewertung:  
Ordne **drei** der gefundenen SAST-Schwachstellen nach deiner Einschätzung in diese Matrix ein:

| Schwachstelle | Wahrscheinlichkeit (1–5) | Auswirkung (1–5) | Risikostufe (W × A) |
|---------------|--------------------------|-------------------|----------------------|
|               |                          |                   |                      |
|               |                          |                   |                      |
|               |                          |                   |                      |

---

## Teil 2 – DAST (Dynamic Application Security Testing)

Analysiere die **laufende Applikation** mit OWASP ZAP oder manuellen HTTP-Requests.

### App starten

```bash
node server.js
# → http://localhost:5000
```

### Option A: OWASP ZAP (automatisch)

1. OWASP ZAP öffnen
2. **Automated Scan** → URL: `http://localhost:5000`
3. Scan starten und Report exportieren (HTML/JSON)

### Option B: Manuelle Tests mit curl / Postman

Führe die folgenden Requests aus und notiere, was passiert:

**Test 1 – Reflected XSS:**
```bash
curl "http://localhost:5000/books/search?q=<script>alert('XSS')</script>"
```

**Test 2 – Path Traversal:**
```bash
curl "http://localhost:5000/files?name=../../package.json"
```

**Test 3 – Command Injection:**
```bash
curl -X POST "http://localhost:5000/admin/cmd" \
  -H "Content-Type: application/json" \
  -d '{"run": "whoami"}'
```

**Test 4 – Open Redirect:**
```bash
curl -v "http://localhost:5000/redirect?to=https://evil.example.com"
```

**Test 5 – Broken Access Control:**
```bash
# Buch löschen ohne Authentifizierung
curl -X DELETE "http://localhost:5000/books/1"
```

### Fragen – DAST

Beantworte die folgenden Fragen (in `answers/dast-answers.md`):

**F7.** Was gibt **Test 1** (XSS) zurück?  
- Wird der Script-Tag im Browser ausgeführt? Was bedeutet das für Benutzer?
- Wie nennt man diese Art von XSS (Reflected vs. Stored)?

---

**F8.** Was gibt **Test 2** (Path Traversal) zurück?  
- Welche Datei konnte ausgelesen werden?
- Welche Gefahr besteht, wenn ein Angreifer `/etc/passwd` oder `.env` lesen kann?

---

**F9.** Was gibt **Test 3** (Command Injection) zurück?  
- Was wird ausgegeben? Welcher OS-Benutzer führt die Applikation aus?
- Welche schlimmeren Befehle könnte ein Angreifer ausführen?

---

**F10.** Was beobachtest du bei **Test 5** (Broken Access Control)?  
- Konnte ein nicht-authentifizierter User ein Buch löschen?
- Was fehlt in der Route `/books/:id` (DELETE)?

---

**F11.** Vergleich SAST vs. DAST:  
Fülle die Tabelle aus:

| Kriterium                          | SAST | DAST |
|------------------------------------|------|------|
| App muss laufen?                   |      |      |
| Findet Lücken im Code?             |      |      |
| Findet Laufzeit-Verhalten?         |      |      |
| False Positives möglich?           |      |      |
| Geeignet für CI/CD?                |      |      |

---

## Teil 3 – Bewertung & Priorisierung

Erstelle in `answers/risk-assessment.md` eine Gesamtliste aller gefundenen Schwachstellen:

| # | Schwachstelle         | Gefunden durch | CVSS (1–10) | Auswirkung            | Priorität (H/M/L) |
|---|-----------------------|----------------|-------------|-----------------------|-------------------|
| 1 |                       |                |             |                       |                   |
| 2 |                       |                |             |                       |                   |
| … |                       |                |             |                       |                   |

---

## Teil 4 – Fix (Optional / Bonus)

Wähle **zwei** der gefundenen Schwachstellen aus und behebe sie im Code.

Erstelle danach einen neuen Scan und zeige, dass die Lücke nicht mehr gefunden wird.

Dokumentiere deine Fixes in `answers/fixes.md`:
- Welche Schwachstelle wurde behoben?
- Was wurde geändert? (Code vorher / nachher)
- Wurde die Lücke im neuen Scan noch gefunden?

### Hinweise zu möglichen Fixes

| Schwachstelle         | Mögliche Lösung                                         |
|-----------------------|---------------------------------------------------------|
| SQL Injection         | Prepared Statements / Parameterisierte Queries          |
| XSS                   | Output escapen (z.B. `he` Library) / CSP Header setzen |
| Command Injection     | `exec` vermeiden, Input-Whitelist verwenden             |
| Path Traversal        | `path.resolve` + Prefix-Check verwenden                 |
| Hardcoded Secrets     | `.env`-Datei + `dotenv` Package                         |
| MD5 Passwort-Hashing  | `bcrypt` oder `argon2` verwenden                        |
| Schwacher JWT-Secret  | Langen zufälligen Secret aus `.env` lesen               |
| Fehlende Auth         | Middleware zur Token-Prüfung vor der Route              |

---

## Abgabe

```
answers/
  sast-answers.md      ← Antworten Teil 1
  dast-answers.md      ← Antworten Teil 2
  risk-assessment.md   ← Bewertungstabelle Teil 3
  fixes.md             ← (Optional) Fixes Teil 4
```

---

## Bewertungskriterien

| Aufgabe                                 | Punkte |
|-----------------------------------------|--------|
| SAST-Scan durchgeführt & dokumentiert   | 20 Pt. |
| DAST-Tests durchgeführt & dokumentiert  | 20 Pt. |
| Fragen F1–F10 beantwortet               | 40 Pt. |
| Risikobewertungstabelle ausgefüllt      | 10 Pt. |
| Bonus: 2 Fixes implementiert            | 10 Pt. |
| **Total**                               | **100 Pt.** |
