# Teil 4 – Fixes (Bonus)

Behoben wurden **zwei High-Schwachstellen**: Command Injection und Path Traversal.
Verifiziert per erneutem `snyk code test` **und** per Live-curl gegen die gepatchte App.

---

## Fix 1 – Command Injection (`POST /admin/cmd`, CWE-78)

**Vorher:**
```js
const { exec } = require('child_process');
...
app.post('/admin/cmd', (req, res) => {
  const cmd = req.body.run || req.query.run;
  exec(cmd, (err, stdout, stderr) => {                 // roher User-Input in die Shell
    res.json({ stdout, stderr, error: err ? err.message : null });
  });
});
```

**Nachher:**
```js
const { execFile } = require('child_process');
...
const ALLOWED_CMDS = {
  ls:     { file: 'ls',     args: ['-la'] },
  whoami: { file: 'whoami', args: [] },
  date:   { file: 'date',   args: [] },
  uptime: { file: 'uptime', args: [] },
};
app.post('/admin/cmd', (req, res) => {
  const key = req.body.run || req.query.run;
  const allowed = ALLOWED_CMDS[key];
  if (!allowed) {
    return res.status(400).json({ error: 'Command not allowed', allowed: Object.keys(ALLOWED_CMDS) });
  }
  execFile(allowed.file, allowed.args, (err, stdout, stderr) => {  // keine Shell, feste Argumente
    res.json({ stdout, stderr, error: err ? err.message : null });
  });
});
```

**Was wurde geändert?**
- `exec` (interpretiert eine Shell-Zeile, inkl. `&&`, `;`, `|`, `$()`) → `execFile`
  (startet ein Programm **ohne Shell**, Argumente werden nicht interpretiert).
- **Whitelist** statt beliebigem Input: Nur die Schlüssel `ls`, `whoami`, `date`, `uptime`
  sind erlaubt; alles andere → HTTP 400.

**Verifikation:**
| Test                                   | Ergebnis nach Fix |
|----------------------------------------|-------------------|
| `snyk code test`                       | Command-Injection-Finding **weg** ✓ |
| `{"run":"whoami && id"}` (Angriff)     | `{"error":"Command not allowed",...}` – blockiert ✓ |
| `{"run":"whoami"}` (legitim)           | `{"stdout":"lkoch\n",...}` – funktioniert weiter ✓ |

---

## Fix 2 – Path Traversal (`GET /files`, CWE-23)

**Vorher:**
```js
app.get('/files', (req, res) => {
  const fileName = req.query.name;
  const filePath = path.join(__dirname, 'public', fileName);   // ../../etc/passwd möglich
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).json({ error: 'File not found' });
    res.send(data);
  });
});
```

**Nachher:**
```js
app.get('/files', (req, res) => {
  const fileName  = req.query.name || '';
  const publicDir = path.resolve(__dirname, 'public');
  const filePath  = path.resolve(publicDir, fileName);
  // Ausbruch aus public/ verhindern
  if (filePath !== publicDir && !filePath.startsWith(publicDir + path.sep)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).json({ error: 'File not found' });
    res.send(data);
  });
});
```

**Was wurde geändert?**
- `path.resolve` löst `..`-Segmente zu einem **absoluten** Pfad auf.
- **Prefix-Check:** Der aufgelöste Pfad muss mit `publicDir + path.sep` beginnen (bzw. exakt
  `publicDir` sein). Zeigt er nach außerhalb → HTTP 403, keine Dateiausgabe.

**Verifikation:**
| Test                                          | Ergebnis nach Fix |
|-----------------------------------------------|-------------------|
| `snyk code test`                              | Path-Traversal-Finding **weg** ✓ |
| `?name=../../../../../../etc/passwd` (Angriff) | `{"error":"Access denied"}` – blockiert ✓ |
| `?name=index.html` (legitim)                  | HTTP 200, 341 Bytes – funktioniert weiter ✓ |

---

## SAST-Ergebnis vorher / nachher (nur `server.js`)

| Schweregrad | Vorher | Nachher |
|-------------|:------:|:-------:|
| High        | 7      | **5**   |
| Medium      | 8      | 8       |
| Low         | 6      | 6       |
| **Total**   | **21** | **19**  |

Die beiden gefixten High-Findings (Command Injection Zeile 172, Path Traversal Zeile 187)
tauchen im erneuten Scan **nicht mehr** auf. Alle übrigen Lücken (XSS, eval-RCE, SSRF,
Hardcoded Secrets etc.) sind bewusst unverändert geblieben und dienen als Gegenprobe.
