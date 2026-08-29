# Vulnerable Bookstore CTF

## ⚠️ Warnung

> **Diese Applikation ist absichtlich verwundbar und darf NUR lokal im Unterricht verwendet werden.**
> Niemals produktiv deployen. Keine echten Daten verwenden. Keine fremden Systeme scannen.

---

## Ziel

Findet mit OWASP ZAP und manueller Analyse typische Web-Schwachstellen dieser Applikation.

---

## Start

```bash
npm install
npm run dev
```

App läuft unter: **http://localhost:3000**

---

## Aufgaben

### Aufgabe 1: Login untersuchen

- Öffne `/login`
- Teste verschiedene Benutzernamen und Passwörter
- Dokumentiere die Fehlermeldungen genau
- Finde heraus, ob man erkennen kann, ob ein Benutzername existiert
- Logge dich mit einem gültigen Benutzer ein
- Dokumentiere die gefundene Flag
- Prüfe mit ZAP scan was es alles gibt

> **Hinweis:** Die Passwörter folgen einem einfachen, vorhersehbaren Muster. Eventuell hilft die Response HTML der Login Funktion

---

### Aufgabe 2: OWASP ZAP Scan

- Starte OWASP ZAP
- Scanne `http://localhost:3000`
- Prüfe alle gefundenen Pfade und Dateien
- Suche nach öffentlich erreichbaren Backup-Dateien
- Dokumentiere die gefundene Benutzerdatei und ihren Inhalt
- Dokumentiere die Flag aus der Flag-Datei

> **Hinweis:** Prüfe auch die `robots.txt` – sie kann Hinweise auf versteckte Pfade enthalten.

---

### Aufgabe 3: SQL Injection

- Öffne die Büchersuche unter `/books`
- Analysiere den Suchendpunkt `/books/search?q=`
- Prüfe, ob SQL Injection möglich ist (Fehlermeldungen beobachten)
- Finde heraus, welche Tabellen in der Datenbank vorhanden sind
- Lies den Inhalt der `flags`-Tabelle aus
- Dokumentiere Vorgehen und gefundene Flag

> **Wichtig:** Nur SELECT-basierte Abfragen verwenden. Keine DROP, DELETE oder UPDATE Statements.

---

### Aufgabe 4: Reflected XSS

- Öffne die XSS-Demo unter `/xss`
- Teste den `message`-Parameter auf ungefilterte Ausgabe
- Löse einen JavaScript-Alert aus
- Dokumentiere die Schwachstelle

---

### Aufgabe 5: Information Disclosure

- Öffne `/debug/error`
- Dokumentiere, welche technischen Informationen sichtbar sind
- Beurteile das Risiko dieser Informationen

---

### Aufgabe 6: Dokumentation

Dokumentiert eure Findings in folgender Tabelle:

| ID | Schwachstelle | URL | Nachweis | Risiko | Massnahme |
|---|---|---|---|---|---|
| 1 | Login Enumeration | /login | | Hoch | |
| 2 | Sensitive File Exposure | /backup/ | | Hoch | |
| 3 | SQL Injection | /books/search | | Kritisch | |
| 4 | Reflected XSS | /xss | | Hoch | |
| 5 | Information Disclosure | /debug/error | | Mittel | |

---

## Regeln

- Nur lokal auf `http://localhost:3000` testen
- Keine fremden Systeme oder Netzwerke scannen
- Keine produktiven Daten verwenden
- Keine destruktiven SQL-Befehle (DROP, DELETE, UPDATE)
- Keine Denial-of-Service-Tests

---

## Flags-Übersicht

| # | Flag | Fundort |
|---|---|---|
| 1 | FLAG{LOGIN_ENUMERATION_ERFOLGREICH} | Dashboard nach Login |
| 2 | FLAG{USER_DATEI_GEFUNDEN} | /backup/flag.txt |
| 3 | FLAG{SQL_INJECTION_ERFOLGREICH} | Büchersuche via SQL Injection |
| 4 | FLAG{XSS_ERFOLGREICH} | XSS-Demo (selbst im Alert ausgeben) |
