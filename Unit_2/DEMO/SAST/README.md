# SAST Demo – Snyk Scan

> **Achtung:** Diese Applikation enthält **absichtliche Sicherheitslücken** für Schulungszwecke.  
> Niemals in einer Produktionsumgebung deployen!

## Übersicht

Die Applikation `vulnerable-app` ist ein Node.js/Express-Server mit eingebauten Schwachstellen, die von **Snyk Code** (SAST) und **Snyk Open Source** (SCA) erkannt werden.

### Enthaltene Schwachstellen

| ID  | Typ                           | Datei / Zeile       | Snyk-Kategorie   |
|-----|-------------------------------|---------------------|------------------|
| V01 | SQL Injection                 | `server.js` – `/user`     | Snyk Code |
| V02 | Command Injection             | `server.js` – `/ping`     | Snyk Code |
| V03 | Hardcoded Credentials         | `server.js` – Top          | Snyk Code |
| V04 | Insecure Crypto (MD5)         | `server.js` – `/register` | Snyk Code |
| V05 | Path Traversal                | `server.js` – `/file`     | Snyk Code |
| V06 | eval() mit User-Input         | `server.js` – `/calc`     | Snyk Code |
| V07 | Schwaches Zufallstoken        | `server.js` – `/login`    | Snyk Code |
| V08 | ReDoS                         | `server.js` – `/validate-email` | Snyk Code |
| V09 | XSS (Reflected & Stored)      | `server.js` – `/greet`, `/post` | Snyk Code |
| V10 | Insecure Deserialization      | `server.js` – `/profile`  | Snyk Code |
| V11 | Prototype Pollution           | `server.js` – `/settings` | Snyk Code |
| V12 | SSL-Verifikation deaktiviert  | `server.js` – `/fetch`    | Snyk Code |
| V13 | Hardcoded JWT Secret          | `server.js` – `/login`    | Snyk Code |
| V14 | Open Redirect                 | `server.js` – `/redirect` | Snyk Code |
| D01 | lodash 4.17.4 – CVE-2019-10744 | `package.json`      | Snyk Open Source |
| D02 | axios 0.21.1 – CVE-2021-3749  | `package.json`      | Snyk Open Source |
| D03 | marked 2.0.0 – CVE-2022-21681 | `package.json`      | Snyk Open Source |
| D04 | jsonwebtoken 8.5.1            | `package.json`      | Snyk Open Source |
| D05 | node-serialize 0.0.4 – RCE    | `package.json`      | Snyk Open Source |

---

## Voraussetzungen

- [Node.js](https://nodejs.org/) >= 14
- [Snyk CLI](https://docs.snyk.io/snyk-cli/install-the-snyk-cli)
- Snyk-Account (kostenlos auf [snyk.io](https://snyk.io))

---

## Snyk CLI installieren

```bash
npm install -g snyk
```

---

## Snyk authentifizieren

```bash
snyk auth
```

> Öffnet den Browser und verknüpft die CLI mit deinem Snyk-Account.

---

## Abhängigkeiten installieren

```bash
cd Unit_2/DEMO/SAST/vulnerable-app
npm install
```

---

## Scan ausführen

### 1. SAST – Snyk Code (Quellcode-Analyse)

Analysiert den Quellcode auf Schwachstellen wie SQL Injection, XSS, Command Injection etc.

```bash
snyk code test
```

**Mit HTML-Report:**

```bash
snyk code test --json | snyk-to-html -o snyk-code-report.html
```

> `snyk-to-html` installieren: `npm install -g snyk-to-html`

---

### 2. SCA – Snyk Open Source (Abhängigkeiten)

Analysiert `package.json` auf bekannte CVEs in den Abhängigkeiten.

```bash
snyk test
```

**Mit HTML-Report:**

```bash
snyk test --json | snyk-to-html -o snyk-sca-report.html
```

---

### 3. Vollständiger kombinierter Report

```bash
# SAST + SCA in einem Durchgang
snyk code test --json > code-results.json
snyk test --json > sca-results.json
```

---

## Beispiel-Output (Snyk Code)

```
Testing /path/to/vulnerable-app...

✗ [High] SQL Injection
  Path: server.js, line 72
  Info: Unsanitized input from an HTTP parameter flows into queryDatabase

✗ [High] Command Injection
  Path: server.js, line 84
  Info: Unsanitized input flows into exec()

✗ [Medium] Hardcoded Secret
  Path: server.js, line 22
  Info: Password literal detected in source code

...

Issues: 14 [8 High | 4 Medium | 2 Low]
```

---

## Snyk in der IDE (VS Code Extension)

1. Extension installieren: [Snyk Security](https://marketplace.visualstudio.com/items?itemName=snyk-security.snyk-vulnerability-scanner)
2. Mit Snyk-Account verbinden
3. Schwachstellen werden direkt im Editor markiert (Inline-Hints)

---

## Weiterführende Links

- [Snyk Code Docs](https://docs.snyk.io/scan-using-snyk/snyk-code)
- [Snyk CLI Reference](https://docs.snyk.io/snyk-cli/cli-commands-and-options-summary)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
