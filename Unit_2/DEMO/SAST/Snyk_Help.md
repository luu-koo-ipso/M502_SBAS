# Snyk CLI – Befehlsübersicht

## Setup

| Befehl | Beschreibung |
|--------|-------------|
| `npm install -g snyk` | Snyk CLI global installieren |
| `snyk auth` | CLI mit Snyk-Account verbinden (öffnet Browser) |
| `snyk config get api` | Gespeicherten API-Token anzeigen |
| `snyk config set api=<token>` | API-Token manuell setzen (ohne Browser) |
| `snyk --version` | Installierte Snyk-Version anzeigen |

---

## snyk test – Open Source / Abhängigkeiten (SCA)

Analysiert `package.json` / `pom.xml` etc. auf bekannte CVEs in Abhängigkeiten.

| Befehl | Beschreibung |
|--------|-------------|
| `snyk test` | Scan im aktuellen Verzeichnis |
| `snyk test --all-projects` | Alle Projekte im Verzeichnis scannen |
| `snyk test --severity-threshold=high` | Nur High/Critical anzeigen |
| `snyk test --json` | Ausgabe als JSON (für Reports) |
| `snyk test --json \| snyk-to-html -o report.html` | HTML-Report generieren |
| `snyk test --dev` | Auch Dev-Abhängigkeiten einschliessen |
| `snyk test --show-vulnerable-paths=all` | Alle Abhängigkeitspfade zur Lücke zeigen |

---

## snyk code – Quellcode-Analyse (SAST)

Analysiert den Quellcode statisch auf Schwachstellen wie SQL Injection, XSS, Command Injection usw.

| Befehl | Beschreibung |
|--------|-------------|
| `snyk code test` | SAST-Scan im aktuellen Verzeichnis |
| `snyk code test --severity-threshold=medium` | Nur Medium/High/Critical anzeigen |
| `snyk code test --json` | Ausgabe als JSON |
| `snyk code test --json \| snyk-to-html -o code-report.html` | HTML-Report generieren |
| `snyk code test ./src` | Nur Unterordner scannen |

---

## snyk secrets – Hardcoded Secrets

Sucht im Quellcode nach hartcodierten Passwörtern, API-Keys, Tokens usw.

| Befehl | Beschreibung |
|--------|-------------|
| `snyk secrets test` | Secrets-Scan im aktuellen Verzeichnis |
| `snyk secrets test --json` | Ausgabe als JSON |

---

## snyk monitor – Kontinuierliches Monitoring

Lädt einen Snapshot des Projekts auf snyk.io hoch und benachrichtigt bei neuen CVEs.

| Befehl | Beschreibung |
|--------|-------------|
| `snyk monitor` | Projekt auf snyk.io registrieren/aktualisieren |
| `snyk monitor --project-name=MeinProjekt` | Projektnamen auf snyk.io setzen |

---

## snyk container – Container / Docker Images

Scannt Docker-Images auf Schwachstellen in OS-Paketen und App-Abhängigkeiten.

| Befehl | Beschreibung |
|--------|-------------|
| `snyk container test nginx:latest` | Docker-Image scannen |
| `snyk container test --file=Dockerfile nginx:latest` | Dockerfile mit einbeziehen |
| `snyk container monitor nginx:latest` | Image auf snyk.io für Monitoring registrieren |

---

## snyk iac – Infrastructure as Code

Scannt Terraform, Kubernetes, CloudFormation, ARM-Templates auf Fehlkonfigurationen.

| Befehl | Beschreibung |
|--------|-------------|
| `snyk iac test` | IaC-Dateien im aktuellen Verzeichnis scannen |
| `snyk iac test main.tf` | Einzelne Datei scannen |
| `snyk iac test --severity-threshold=high` | Nur High/Critical anzeigen |

---

## snyk sbom – Software Bill of Materials

Generiert eine SBOM (Auflistung aller verwendeten Komponenten).

| Befehl | Beschreibung |
|--------|-------------|
| `snyk sbom --format=cyclonedx1.4+json` | SBOM im CycloneDX-Format generieren |
| `snyk sbom --format=spdx2.3+json` | SBOM im SPDX-Format generieren |
| `snyk sbom test --file=sbom.json` | Bestehende SBOM auf Schwachstellen prüfen |

---

## Nützliche Flags (funktionieren bei mehreren Befehlen)

| Flag | Beschreibung |
|------|-------------|
| `--json` | Ausgabe als maschinenlesbares JSON |
| `--severity-threshold=low\|medium\|high\|critical` | Minimalen Schweregrad filtern |
| `--all-projects` | Alle Projekte im Verzeichnisbaum scannen |
| `--exclude=node_modules,dist` | Ordner vom Scan ausschliessen |
| `--org=<org-name>` | Snyk-Organisation auswählen |
| `--project-name=<name>` | Projektname auf snyk.io überschreiben |
| `--print-deps` | Abhängigkeitsbaum ausgeben |

---

## HTML-Report erstellen (snyk-to-html)

```bash
# snyk-to-html einmalig installieren
npm install -g snyk-to-html

# Report für Dependency-Scan
snyk test --json | snyk-to-html -o sca-report.html

# Report für SAST
snyk code test --json | snyk-to-html -o sast-report.html
```

---

## Typischer Workflow für dieses Demo

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Einloggen
snyk auth

# 3. Dependency-Scan (SCA)
snyk test

# 4. Quellcode-Scan (SAST)
snyk code test

# 5. Secrets-Scan
snyk secrets test

# 6. HTML-Reports generieren
snyk test --json | snyk-to-html -o sca-report.html
snyk code test --json | snyk-to-html -o sast-report.html
```

---

## Weiterführende Links

- [Snyk Docs](https://docs.snyk.io)
- [Snyk CLI Referenz](https://docs.snyk.io/snyk-cli/cli-commands-and-options-summary)
- [Snyk VS Code Extension](https://marketplace.visualstudio.com/items?itemName=snyk-security.snyk-vulnerability-scanner)
