# Node.js Prometheus Grafana Monitoring Demo (ohne Docker)

Dies ist die **lokale Variante ohne Docker** der Übung [`../nodejs-prometheus-grafana-monitoring-demo`](../nodejs-prometheus-grafana-monitoring-demo/README.md). Alle Inhalte, Metriken, PromQL-Queries und Aufgaben sind identisch — nur der Start erfolgt hier über lokal installierte Binaries statt über Container.

> **Hinweis:** Reine Unterrichts- und Demo-Umgebung. Keine echten Benutzerdaten, keine produktiven Secrets, keine echten Angriffs- oder Exploit-Funktionen. Security-Events werden ausschliesslich simuliert.

## 1. Warum ohne Docker?

Prometheus und Grafana sind eigenständige Programme (in Go geschrieben) und liegen als fertige Binaries/Zip-Archive vor. Man kann sie genau wie die Node.js-App direkt auf dem eigenen Rechner installieren und starten — ganz ohne Docker Desktop. Das ist nützlich, wenn Docker nicht verfügbar ist oder man die Prozesse direkt sehen möchte.

## 2. Architektur

```
Browser / curl
  ↓
Node.js App        (Port 3000, lokal via "npm start")
  ↓ /metrics
Prometheus         (Port 9090, lokal installiertes Binary)
  ↓ PromQL
Grafana             (Port 3001, lokal installiertes Binary)
```

## 3. Voraussetzungen

- Node.js (Version 18 oder neuer) und npm
- Prometheus (Binary/Zip von [prometheus.io/download](https://prometheus.io/download/))
- Grafana OSS (Binary/Zip von [grafana.com/grafana/download](https://grafana.com/grafana/download/))
- Ein Terminal (PowerShell unter Windows)
- Optional: `curl`

Prüfbefehle:

```
node --version
npm --version
```

## 4. Prometheus installieren

1. Aktuelles Prometheus-Release als `.zip` (Windows) bzw. `.tar.gz` (macOS/Linux) herunterladen.
2. Archiv an einen beliebigen Ort entpacken, z. B. `C:\tools\prometheus`.
3. Im entpackten Ordner liegt `prometheus.exe` (Windows) bzw. `prometheus` (macOS/Linux).

Es wird **keine eigene Installation im Projektordner** benötigt — nur die mitgelieferte `prometheus/prometheus.yml` aus diesem Repo als Konfigurationsdatei verwendet.

## 5. Grafana installieren

1. Aktuelles Grafana-OSS-Release als `.zip`/`.tar.gz` (Windows) bzw. `.tar.gz` (macOS/Linux) von [grafana.com/grafana/download](https://grafana.com/grafana/download?edition=oss) herunterladen (kein Installer nötig, "Standalone Windows Binaries" reichen).
2. Archiv an einen beliebigen Ort entpacken, z. B. `C:\tools\grafana-13.2.0`.
3. Im entpackten Ordner liegt `bin\grafana.exe` (Windows) bzw. `bin/grafana` (macOS/Linux). Gestartet wird über den Subcommand `server` (z. B. `grafana.exe server ...`). Bei älteren Grafana-Versionen (<10) heisst die Datei stattdessen `grafana-server.exe`/`grafana-server` und wird ohne Subcommand direkt gestartet.

> Wichtig: Die Datei `grafana\custom.ini` und `grafana\provisioning\dashboards\dashboards.yml` in diesem Ordner enthalten **absolute Pfade** zu diesem Projekt. Falls du das Projekt an einen anderen Ort kopierst, müssen beide Dateien entsprechend angepasst werden (relative Pfade werden von Grafana gegen den `homepath`, nicht gegen das Arbeitsverzeichnis aufgelöst).

## 6. Node.js App starten

```
cd app
npm install
npm start
```

Die App läuft danach unter:

```
http://localhost:3000
```

## 7. Prometheus starten

In einem **zweiten Terminal**, im Projektordner (`nodejs-prometheus-grafana-monitoring-local`), Prometheus mit der mitgelieferten Konfiguration starten:

**Windows (PowerShell):**

```powershell
C:\tools\prometheus\prometheus.exe --config.file=".\prometheus\prometheus.yml"
```

**macOS/Linux:**

```bash
/pfad/zu/prometheus --config.file="./prometheus/prometheus.yml"
```

Prometheus läuft danach unter:

```
http://localhost:9090
```

Die Konfiguration `prometheus/prometheus.yml` scraped `localhost:3000/metrics` alle 5 Sekunden — das ist der einzige Unterschied zur Docker-Variante (dort heisst der Zielhost `app` statt `localhost`).

## 8. Grafana starten

In einem **dritten Terminal** Grafana mit der mitgelieferten `custom.ini` starten (das Verzeichnis spielt keine Rolle, da die Provisioning-Pfade in `custom.ini` absolut sind):

**Windows (PowerShell), Grafana ≥ 10:**

```powershell
C:\tools\grafana-13.2.0\bin\grafana.exe server --homepath="C:\tools\grafana-13.2.0" --config="C:\ifa\M502_SBAS\Unit_4\Uebungen\nodejs-prometheus-grafana-monitoring-local\grafana\custom.ini"
```

**macOS/Linux:**

```bash
/pfad/zu/grafana/bin/grafana server --homepath="/pfad/zu/grafana" --config="/pfad/zum/projekt/grafana/custom.ini"
```

Grafana läuft danach unter:

```
http://localhost:3001
```

Login: **admin / admin**

Die `custom.ini` setzt den Port auf `3001` und verweist per absolutem Pfad auf `grafana/provisioning` in diesem Projekt. Datasource (`http://localhost:9090`) und Dashboard werden automatisch provisioniert, genau wie in der Docker-Variante. Grafana kann beim ersten Start 1-2 Minuten brauchen, weil alle mitgelieferten Plugins registriert werden — das ist normal.

> Falls beim ersten Start ein Fehler zu `paths.data` oder `paths.logs` erscheint: Grafana legt `data/`, `logs/` und `plugins/`-Ordner unterhalb von `homepath` an (z. B. `C:\tools\grafana-13.2.0\data`). Das ist normal.

## 9. Zusammenfassung: 3 Terminals

| Terminal | Verzeichnis | Befehl |
|---|---|---|
| 1 – App | `app/` | `npm start` |
| 2 – Prometheus | Projekt-Root | `prometheus.exe --config.file=".\prometheus\prometheus.yml"` |
| 3 – Grafana | beliebig | `grafana.exe server --homepath="..." --config="<absoluter Pfad>\grafana\custom.ini"` |

## 10. Beispiel mit konkreten Pfaden (dieser Rechner)

Auf diesem Schulungsrechner sind Prometheus und Grafana bereits unter `C:\tools` installiert. Die drei Terminals können 1:1 mit diesen Befehlen gestartet werden:

**Terminal 1 – Node.js App:**

```powershell
cd "c:\ifa\M502_SBAS\Unit_4\Uebungen\nodejs-prometheus-grafana-monitoring-local\app"
npm start
```

**Terminal 2 – Prometheus:**

```powershell
cd "c:\ifa\M502_SBAS\Unit_4\Uebungen\nodejs-prometheus-grafana-monitoring-local"
C:\tools\prometheus\prometheus-3.14.0.windows-amd64\prometheus.exe --config.file=".\prometheus\prometheus.yml"
```

**Terminal 3 – Grafana:**

```powershell
C:\tools\grafana-13.2.0\bin\grafana.exe server --homepath="C:\tools\grafana-13.2.0" --config="c:\ifa\M502_SBAS\Unit_4\Uebungen\nodejs-prometheus-grafana-monitoring-local\grafana\custom.ini"
```

Anschliessend erreichbar unter:

| Dienst | URL |
|---|---|
| Node.js App | http://localhost:3000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin/admin) |

## 11. Ab hier: identisch zur Docker-Variante

Alle weiteren Schritte (Testtraffic erzeugen, `/metrics` prüfen, PromQL-Queries, Grafana-Dashboard, eigene Panels, Schwellenwerte, Troubleshooting, Reflexionsfragen) sind **wortgleich** zur Docker-Version. Bitte im Hauptdokument weiterlesen:

👉 [`../nodejs-prometheus-grafana-monitoring-demo/README.md`](../nodejs-prometheus-grafana-monitoring-demo/README.md) ab Abschnitt 5 ("Node.js App prüfen")

Einziger Unterschied: Statt `docker compose up/down` werden die drei Prozesse (App, Prometheus, Grafana) einfach jeweils mit `Strg+C` im entsprechenden Terminal beendet.

## 12. Projekt stoppen

In jedem der drei Terminals `Strg+C` drücken. Um Grafana wirklich zurückzusetzen (z. B. Login-Historie, Sessions, installierte Plugins), können die Ordner `data`, `logs` und `plugins` unterhalb des Grafana-`homepath` (z. B. `C:\tools\grafana-13.2.0\data`) gelöscht werden. Diese Ordner gehören zur Grafana-Installation, nicht zu diesem Projekt.
