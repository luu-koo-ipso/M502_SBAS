# Teil 2 – DAST-Antworten (laufende App auf http://localhost:5000)

> App gestartet mit `node server.js`. Alle Tests mit `curl` live ausgeführt am 2026-08-15.
> Ausgaben sind echte Server-Antworten, nicht simuliert.

---

## Test-Ergebnisse (Kurzüberblick)

| # | Test                    | Request                                             | Ergebnis |
|---|-------------------------|-----------------------------------------------------|----------|
| 1 | Reflected XSS           | `GET /books/search?q=<script>…</script>`            | ✗ verwundbar – Script ungeescaped im HTML |
| 2 | Path Traversal          | `GET /files?name=../../../…/etc/passwd`             | ✗ verwundbar – `/etc/passwd` ausgelesen |
| 3 | Command Injection       | `POST /admin/cmd {"run":"whoami && id"}`            | ✗ verwundbar – Shell-Befehle ausgeführt |
| 4 | Open Redirect           | `GET /redirect?to=https://evil.example.com`         | ✗ verwundbar – 302 auf fremde Domain |
| 5 | Broken Access Control   | `DELETE /books/1` (ohne Auth)                        | ✗ verwundbar – Buch gelöscht |

---

## F7 – Test 1: Reflected XSS

**Server-Antwort:**
```html
<html>
  <body>
    <h2>Search results for: <script>alert('XSS')</script></h2>
    <pre>[]</pre>
  </body>
</html>
```

- **Wird der Script-Tag ausgeführt?** Ja. Der Parameter `q` wird in `res.send(...)` **ungeescaped**
  ins HTML eingesetzt (server.js Zeile 104–111). Ein Browser, der diese Antwort rendert, führt das
  `<script>` aus. Für Benutzer heißt das: Ein Angreifer kann einen präparierten Link verschicken;
  beim Anklicken läuft fremder JavaScript-Code im Kontext der Seite → Session-Cookies stehlen
  (hier zusätzlich schlimm, weil das `session`-Cookie **nicht** `HttpOnly` ist, Zeile 62),
  Aktionen im Namen des Opfers ausführen, Inhalte manipulieren.
- **Art:** **Reflected XSS** – die Eingabe kommt aus dem Request und wird sofort in der Antwort
  "reflektiert", ohne Speicherung.
  *(Zum Vergleich: `POST /books/:id/review` + `GET /books/:id/reviews` mit `marked(content)` ist
  **Stored XSS** – der Payload wird persistiert und bei jedem Aufruf erneut ausgeliefert.)*

---

## F8 – Test 2: Path Traversal

**Server-Antwort (`?name=../../../../../../../../../../etc/passwd`):**
```
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
...
```
Ebenso ließ sich der Applikations-Quellcode auslesen (`?name=../server.js`) und `../package.json`.

- **Welche Datei konnte ausgelesen werden?** `/etc/passwd` (Systemdatei), der eigene Quellcode
  `server.js` sowie `package.json`. Grundsätzlich **jede für den App-Benutzer lesbare Datei**.
- **Gefahr bei `/etc/passwd` oder `.env`:**
  - `/etc/passwd` verrät gültige Benutzernamen und Systemaufbau → Basis für gezielte Angriffe.
  - Eine `.env` oder Config-Datei würde **Secrets** (DB-Passwörter, API-Keys, JWT-Secret) preisgeben
    → vollständige Kompromittierung. Ursache: `path.join(__dirname, 'public', fileName)` ohne
    Prüfung, dass das Ergebnis innerhalb von `public/` bleibt (server.js Zeile 186).

---

## F9 – Test 3: Command Injection

**Server-Antwort (`{"run":"whoami && id"}`):**
```json
{
  "stdout": "lkoch\nuid=1000(lkoch) gid=1000(lkoch) groups=1000(lkoch),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev),100(users),990(docker)\n",
  "stderr": "",
  "error": null
}
```

- **Was wird ausgegeben / welcher OS-Benutzer?** Die App läuft als Benutzer **`lkoch`** (uid 1000).
  `req.body.run` wird direkt an `child_process.exec()` übergeben (server.js Zeile 172).
- **Schlimmere Befehle:** Beliebige Shell-Kommandos mit den Rechten dieses Users, z. B.:
  - Daten exfiltrieren: `cat /etc/passwd`, `env`, `cat .env`
  - Reverse Shell aufbauen (`bash -i >& /dev/tcp/…`) → dauerhafter Fernzugriff
  - Dateien löschen/verschlüsseln (`rm -rf`, Ransomware)
  - Der User ist in der `sudo`- und `docker`-Gruppe → potenziell **Privilege Escalation** bis root.
  Das ist die schwerste Klasse: unauthentifizierte **Remote Code Execution**.

---

## F10 – Test 5: Broken Access Control

**Ablauf:**
```
DELETE /books/1   →  {"message":"Deleted"}
GET /books        →  verbleibende IDs: [2, 3]   (Buch 1 ist weg)
```

- **Konnte ein nicht-authentifizierter User löschen?** Ja. Ohne Token, Cookie oder API-Key wurde
  Buch 1 dauerhaft entfernt.
- **Was fehlt in `DELETE /books/:id`?** Eine **Authentifizierungs-/Autorisierungs-Middleware**
  vor der Route (server.js Zeile 125). Es wird weder ein gültiges JWT geprüft noch eine Rolle
  (`admin`) verlangt. Nötig wäre z. B. `verifyToken` + `requireRole('admin')` als Middleware,
  bevor der Handler ausgeführt wird. Dasselbe Problem betrifft `POST /books` (Zeile 116).

---

## F11 – Vergleich SAST vs. DAST

| Kriterium                    | SAST                                  | DAST                                   |
|------------------------------|---------------------------------------|----------------------------------------|
| App muss laufen?             | **Nein** – analysiert nur den Code    | **Ja** – testet die laufende App       |
| Findet Lücken im Code?       | **Ja** – sieht Quellcode & Datenflüsse| Nur indirekt über das Verhalten        |
| Findet Laufzeit-Verhalten?   | Nein                                   | **Ja** – Config-, Auth-, Deploy-Fehler |
| False Positives möglich?     | **Ja, tendenziell mehr**              | Weniger (echter Angriff nachgewiesen)  |
| Geeignet für CI/CD?          | **Ja** – früh, schnell, pre-Deploy    | Ja, aber später (braucht Deployment)   |

**Merksatz:** SAST = "von innen" (White-Box, Code), früh in der Pipeline.
DAST = "von außen" (Black-Box, Angreiferperspektive), gegen die laufende App.
Beide ergänzen sich – erst zusammen decken sie Code- **und** Laufzeit-Schwachstellen ab.
