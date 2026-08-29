# Node.js Prometheus Grafana Monitoring Demo

Ein lokales Schulungsprojekt fuer angehende Softwareentwickler zum Thema **Monitoring mit Node.js, Prometheus und Grafana**.

> **Hinweis:** Dies ist eine reine Unterrichts- und Demo-Umgebung. Es werden keine echten Benutzerdaten, keine produktiven Secrets, keine externen APIs und keine echten Angriffs- oder Exploit-Funktionen verwendet. Security-relevante Events (z. B. fehlgeschlagene Logins oder SQL-Fehler) werden ausschliesslich simuliert.

## 1. Ziel der Übung

In dieser Übung lernst du:

- Wie eine Node.js-Applikation mit `prom-client` instrumentiert wird
- Wie eine App eigene Metriken über den Endpunkt `/metrics` bereitstellt
- Wie Prometheus diese Metriken einsammelt (scraped)
- Wie man mit PromQL Abfragen auf die Metriken schreibt
- Wie man in Grafana ein Dashboard aufbaut und eigene Panels erstellt
- Welche Metriken sich für einfache Security-Kennzahlen eignen

## 2. Architektur

```
Browser / curl
  ↓
Node.js App
  ↓ /metrics
Prometheus
  ↓ PromQL
Grafana Dashboard
```

- Die **Node.js App** erzeugt bei jedem Request Metriken (Zähler, Histogramme, Gauges).
- Der Endpunkt **`/metrics`** ist die Schnittstelle, die Prometheus im Textformat abfragt.
- **Prometheus** ruft `/metrics` alle 5 Sekunden ab (scrape) und speichert die Werte als Zeitreihen.
- **Grafana** fragt Prometheus mit PromQL ab und stellt die Werte grafisch als Dashboard dar.

## 3. Voraussetzungen

- Docker Desktop installiert
- Docker Compose verfügbar (in Docker Desktop enthalten)
- Ein Browser
- Ein Terminal
- Optional: `curl`

Prüfbefehle:

```
docker --version
docker compose version
```

## 4. Projekt starten

1. Repository/Ordner in VS Code oder Terminal öffnen.
2. Container bauen und starten:

```
docker compose up --build
```

3. In einem zweiten Terminal prüfen, ob alle Container laufen:

```
docker compose ps
```

4. Folgende URLs im Browser öffnen:

| Dienst | URL |
|---|---|
| Node.js App | http://localhost:3000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |

Grafana Login: **admin / admin**

## 5. Node.js App prüfen

Öffne:

```
http://localhost:3000
```

Prüfe den Health-Check:

```
http://localhost:3000/health
```

Erwartete Antwort:

```json
{ "status": "ok" }
```

## 6. Metrics Endpoint prüfen

Öffne im Browser oder per curl:

```
http://localhost:3000/metrics
```

```
curl http://localhost:3000/metrics
```

Dort werden alle Prometheus-Metriken im Textformat angezeigt. Achte unter anderem auf folgende Metriken:

```
http_requests_total
http_request_duration_seconds
login_attempts_total
sql_errors_total
security_events_total
open_security_findings
nodejs_process_resident_memory_bytes
```

## 7. Testtraffic erzeugen

Normale Requests:

```
curl http://localhost:3000/
curl http://localhost:3000/health
curl "http://localhost:3000/books/search?q=clean"
curl "http://localhost:3000/books/search?q=security"
```

Login erfolgreich:

```
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin1234"}'
```

Login fehlgeschlagen:

```
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong"}'
```

SQL-Fehler simulieren:

```
curl "http://localhost:3000/books/search?q=error"
```

Mehrere fehlgeschlagene Logins simulieren:

```
curl http://localhost:3000/simulate/login-failures
```

Mehrere SQL-Fehler simulieren:

```
curl http://localhost:3000/simulate/sql-errors
```

## 8. Prometheus prüfen

Öffne:

```
http://localhost:9090
```

Navigiere zu **Status → Targets**.

Erwartung: Der Target `nodejs-monitoring-demo` zeigt den Status **UP**.

Falls der Status **DOWN** ist, prüfe:

- Läuft die App (`docker compose ps`)?
- Ist der Port korrekt (3000)?
- Stimmt der Target-Name in `prometheus/prometheus.yml`?
- Ist `/metrics` erreichbar?
- Gibt es ein Docker-Netzwerkproblem?

## 9. PromQL-Abfragen testen

PromQL ist die Abfragesprache von Prometheus. Teste folgende Queries im Prometheus UI unter **Graph**:

| Query | Bedeutung |
|---|---|
| `up` | Zeigt, ob die App als Target erreichbar ist (1 = up, 0 = down) |
| `http_requests_total` | Rohwert aller bisherigen HTTP Requests |
| `sum(rate(http_requests_total[1m]))` | Requests pro Sekunde (gesamt) über die letzte Minute |
| `sum(rate(http_requests_total[1m])) by (status)` | Requests pro Sekunde, aufgeschlüsselt nach Statuscode |
| `login_attempts_total` | Rohwert aller Loginversuche |
| `rate(login_attempts_total{result="failed"}[5m])` | Rate fehlgeschlagener Logins pro Sekunde |
| `rate(login_attempts_total{result="success"}[5m])` | Rate erfolgreicher Logins pro Sekunde |
| `rate(sql_errors_total[5m])` | Rate simulierter SQL-Fehler pro Sekunde |
| `sum(sql_errors_total)` | Absolute Gesamtzahl aller simulierten SQL-Fehler (kein Rate, sondern der Zählerstand) |
| `sum(rate(security_events_total[5m])) by (type)` | Security Events pro Sekunde, aufgeschlüsselt nach Typ |
| `open_security_findings` | Aktueller Stand offener Security Findings nach Schweregrad |
| `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` | P95 Antwortzeit über alle Requests |
| `nodejs_process_resident_memory_bytes` | Aktueller Speicherverbrauch des Node.js-Prozesses |

### Counter vs. Rate: Beispiel SQL-Fehler

`sql_errors_total` ist ein **Counter** – ein Wert, der nur steigt und nie sinkt. Zwei Sichtweisen auf denselben Counter beantworten unterschiedliche Fragen:

| Query | Antwortet auf die Frage |
|---|---|
| `sum(sql_errors_total)` | "Wie viele SQL-Fehler gab es insgesamt seit Start?" → einfache Anzahl, steigt sprunghaft bei jedem Fehler |
| `rate(sql_errors_total[5m])` | "Wie schnell passieren gerade SQL-Fehler?" → Fehler pro Sekunde, gemittelt über 5 Minuten |

Wer einfach nur "die Anzahl" sehen möchte (z. B. für ein Dashboard-Panel), sollte den Counter direkt abfragen (`sum(sql_errors_total)`) statt `rate()`. `rate()` ist dagegen sinnvoll, um Trends/Lastspitzen zu erkennen oder um Alerts auf Basis einer Änderungsgeschwindigkeit zu definieren.

## 10. Grafana öffnen

Öffne:

```
http://localhost:3001
```

Login: **admin / admin**

Die Prometheus Data Source ist bereits über Provisioning automatisch eingerichtet. Das Dashboard ist unter dem Ordner **Monitoring Demo** zu finden.

## 11. Grafana Dashboard verwenden

1. In Grafana einloggen.
2. Im Menü **Dashboards** öffnen.
3. Ordner **Monitoring Demo** öffnen.
4. Dashboard **Node.js Monitoring Demo** öffnen.
5. Testtraffic erzeugen (siehe Abschnitt 7).
6. Die Werte in den Panels beobachten (ggf. Zeitraum oben rechts anpassen, z. B. "Last 5 minutes").

Bedeutung der Panels:

- **Requests pro Sekunde** – Gesamtlast der App
- **HTTP Requests nach Status** – Verteilung der Antworten nach Statuscode (2xx, 4xx, 5xx)
- **Fehlgeschlagene Logins** – mögliche Brute-Force- oder Fehlbedienungs-Indikatoren
- **Erfolgreiche Logins** – normale Login-Aktivität
- **SQL-Fehler** – Hinweis auf Datenbankprobleme
- **Security Events nach Typ** – Übersicht aller sicherheitsrelevanten Ereignisse
- **P95 Antwortzeit** – Antwortzeit, die 95 % aller Requests unterschreiten
- **Node.js Memory** – Speicherverbrauch des Prozesses
- **Open Security Findings** – simulierte offene Findings nach Schweregrad
- **App Up** – zeigt, ob Prometheus die App erfolgreich erreichen kann

## 12. Eigenes Panel erstellen

1. Dashboard öffnen.
2. Oben rechts **Add → Visualization** wählen.
3. Als Data Source **Prometheus** wählen.
4. Query eingeben:

```
rate(login_attempts_total{result="failed"}[5m])
```

5. Panel-Titel setzen: **Fehlgeschlagene Logins**
6. Visualisierung wählen: **Time series** oder **Stat**
7. Panel speichern.

### Zusatzaufgabe: Counter vs. Rate

Erstelle ein zweites Panel **"SQL-Fehler (Anzahl)"** mit der Query:

```
sum(sql_errors_total)
```

Vergleiche es mit einem Panel **"SQL-Fehler (Rate)"** mit:

```
rate(sql_errors_total[5m])
```

Erzeuge Testtraffic (Abschnitt 7, "SQL-Fehler simulieren") und beobachte den Unterschied: Das erste Panel zeigt die absolute, ansteigende Anzahl, das zweite die Änderungsrate pro Sekunde.

## 13. Interpretation der Werte

Beantworte für dich folgende Fragen:

- Welche Metriken sind reine Betriebskennzahlen (z. B. Performance, Verfügbarkeit)?
- Welche Metriken sind Security-Kennzahlen?
- Was passiert nach mehreren fehlgeschlagenen Logins?
- Was passiert nach mehreren SQL-Fehlern?
- Welche Metriken eignen sich für Alerts?
- Welche Labels sind sinnvoll?
- Welche Labels wären gefährlich (z. B. Benutzernamen, IP-Adressen, Passwörter)?

## 14. Mini-Aufgabe: Dashboard erweitern

Ergänze mindestens **drei eigene Panels**, zum Beispiel:

- Login Failure Rate
- SQL Error Rate
- Security Events nach Severity
- HTTP 5xx Fehler
- P95 Antwortzeit
- App Up
- Open Security Findings

## 15. Mini-Aufgabe: Schwellenwerte überlegen

Definiere zu drei Metriken sinnvolle Schwellenwerte:

| Metrik | Schwellenwert | Zeitraum | Severity | Begründung |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

Beispiele als Orientierung:

- `login_attempts_total{result="failed"}` → mehr als 10 fehlgeschlagene Logins in 5 Minuten
- `sql_errors_total` → mehr als 5 SQL-Fehler in 10 Minuten
- `http_requests_total{status=~"5.."}` → 5xx-Fehlerrate über 5 Prozent während 10 Minuten

## 16. Troubleshooting

**Problem: Container starten nicht**

```
docker compose ps
docker compose logs
```

**Problem: Prometheus Target ist DOWN**

```
docker compose logs app
curl http://localhost:3000/metrics
```

**Problem: Grafana zeigt keine Daten**

Prüfe:
- Data Source Prometheus korrekt konfiguriert?
- URL `http://prometheus:9090` erreichbar?
- Zeitbereich im Dashboard passend gewählt?
- Ist der Prometheus Target Status UP?

**Problem: Metriken steigen nicht**

Prüfe:
- Wurde Testtraffic erzeugt?
- Wurde die richtige Route verwendet?
- Ist der Query-Zeitraum zu kurz gewählt?
- Ist der Unterschied zwischen Counter (steigt nur) und `rate()` (Änderungsrate) klar?

## 17. Projekt stoppen und zurücksetzen

Stoppen:

```
docker compose down
```

Stoppen inklusive Volumes (setzt Prometheus/Grafana-Daten zurück):

```
docker compose down -v
```

Neu starten:

```
docker compose up --build
```

## 18. Abgabe

| Aufgabe | Nachweis |
|---|---|
| App gestartet | Screenshot Startseite |
| `/metrics` geprüft | Screenshot oder Auszug |
| Prometheus Target UP | Screenshot |
| 5 PromQL Queries getestet | Query + Ergebnis |
| Grafana Dashboard geöffnet | Screenshot |
| 3 eigene Panels erstellt | Screenshot |
| 3 Schwellenwerte definiert | Tabelle |
| Interpretation | kurze Erklärung |

## 19. Reflexionsfragen

- Warum sollte man keine Benutzernamen als Label verwenden?
- Warum reicht ein Dashboard allein nicht aus?
- Warum ist `rate()` bei Countern oft sinnvoll?
- Was ist der Unterschied zwischen Counter und Gauge?
- Was zeigt die P95 Antwortzeit?
- Welche Metrik eignet sich für Login-Angriffe?
- Welche Metrik eignet sich für Stabilitätsprobleme?

## 20. Merksatz

> Monitoring funktioniert nur dann zuverlässig, wenn die Anwendung sinnvolle Metriken erzeugt, Prometheus diese korrekt sammelt und Grafana die Werte verständlich visualisiert.
