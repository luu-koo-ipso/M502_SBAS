# Security Analyse – Auswertung

**Projekt:** secure-calendar-training
**Datum:** 13.08.2026
**Name / Gruppe:** Lukas Koch

**Umgebung:** Node v24.15.0, npm 11.12.1 (Linux / WSL2)

> Hinweis: `npm audit` greift auf die laufend aktualisierte GitHub/npm Advisory Database zu. Die hier
> dokumentierten Resultate entsprechen dem Stand vom **13.08.2026** und können bei einer späteren
> Ausführung abweichen.

---

## 1. Gefundene Sicherheitsmeldungen

_Findings aus `npm audit` vor dem Fix – total **6 Vulnerabilities (5 high, 1 moderate)**._

| Nr. | Package | Version | Severity | Advisory (CVE / GHSA) |
|---|---|---|---|---|
| 1 | `axios` | 0.21.1 | high | 24 Advisories, u. a. GHSA-wf5p-g6vw-rhxx (CSRF, CVE-2023-45857), GHSA-cph5-m8f7-6c5x (ReDoS, CVE-2021-3749), GHSA-jr5f-v2jv-69x6 (SSRF via absolute URL), GHSA-pf86-5x62-jrwf (Prototype-Pollution-Gadgets) |
| 2 | `lodash` | 4.17.19 | high | GHSA-35jh-r3h4-6jhm (Command Injection, CVE-2021-23337), GHSA-29mw-wpgm-hmr9 (ReDoS, CVE-2020-28500), GHSA-r5fr-rjxr-66jc (Code Injection via `_.template`), GHSA-f23m-r3pf-42rh + GHSA-xxjr-mmjv-4gpg (Prototype Pollution in `_.unset` / `_.omit`) |
| 3 | `moment` | 2.29.1 | high | GHSA-8hfj-j24r-96c4 (Path Traversal in `moment.locale`, CVE-2022-24785), GHSA-wc69-rhjr-hc9g (ReDoS, CVE-2022-31129) |
| 4 | `nanoid` | 3.1.25 | high | GHSA-mwcw-c2x4-8c55 (vorhersagbare IDs bei nicht-ganzzahliger Grösse, CVE-2024-55565), GHSA-qrpm-p2h7-hrv2 (Information Exposure, CVE-2021-23566), GHSA-28wg-ghj8-5hjv, GHSA-2v37-7h3g-55p8 (Endlosschleife / DoS) |
| 5 | `vite` | 4.3.9 | high | GHSA-c24v-8rfc-w8vw und GHSA-fx2h-pf6j-xcff (`server.fs.deny`-Bypass), GHSA-c27g-q93r-2cwf (Command Injection in `launch-editor`, Windows), GHSA-64vr-g452-qvp3 (DOM Clobbering → XSS) sowie weitere `server.fs.deny`-Bypässe |
| 6 | `esbuild` | 0.17.19 | moderate | GHSA-67mh-4wv8-2f99 (jede Website kann Requests an den Dev-Server senden und die Antwort lesen) |

> Die CVE-Nummern sind für die klassischen, gut dokumentierten Advisories angegeben. Für die neueren
> Advisories (v. a. bei `axios` und `vite`) ist die GHSA-ID die massgebliche Referenz; die CVE-Zuordnung
> ist jeweils auf der verlinkten GitHub-Advisory-Seite ersichtlich.

**Empfohlene Fixes gemäss npm:** alle über `npm audit fix --force`, da die Fix-Versionen ausserhalb der
in `package.json` gepinnten Versionen liegen (`Will install ... which is outside the stated dependency range`).

---

## 2. Betroffene Packages

_Ermittelt mit `npm ls --all` bzw. `npm ls <paket>`._

| Package | Direkt / Transitiv | Eingebunden durch |
|---|---|---|
| `axios` | Direkt | `dependencies` in `package.json` |
| `lodash` | Direkt | `dependencies` in `package.json` |
| `moment` | Direkt | `dependencies` in `package.json` |
| `nanoid` | Direkt (zusätzlich transitiv) | `dependencies`; zusätzlich `vite` → `postcss` → `nanoid@3.3.18` (diese transitive Kopie war **nicht** betroffen) |
| `vite` | Direkt (dev) | `devDependencies` in `package.json` |
| `esbuild` | **Transitiv** | `vite@4.3.9` → `esbuild@0.17.19` |
| `follow-redirects` | Transitiv | `axios@0.21.1` → `follow-redirects@1.16.0` (aktuell kein eigenes Finding, historisch mehrfach betroffen) |

**Beobachtungen zum Dependency Tree:**

- 12 direkte Dependencies (6 `dependencies`, 6 `devDependencies`) ziehen einen Baum von ca. **135 Zeilen**
  in `npm ls --all` nach sich.
- `deduped` bedeutet, dass npm ein Package, das mehrfach in unterschiedlichen Zweigen gefordert wird,
  nur **einmal** physisch installiert (z. B. `@types/react`, `loose-envify`, `@babel/core`), sofern die
  Versionsbereiche kompatibel sind.
- `nanoid` ist ein gutes Beispiel dafür, dass die Deduplizierung **nicht** greift, wenn die Versionsbereiche
  unvereinbar sind: `nanoid@3.1.25` (direkt) und `nanoid@3.3.18` (via `postcss`) lagen parallel im Baum.
- Transitive Dependencies sind sicherheitsrelevant, weil ihr Code im selben Prozess bzw. im selben Bundle
  landet wie der eigene Code – man hat sie nicht bewusst ausgewählt, trägt aber ihr Risiko. `esbuild` ist
  hier der Beleg: das Finding lässt sich nur über ein Update von `vite` beheben.

---

## 3. Quelle und Glaubwürdigkeit

### Finding 1: Package `moment`

- **Advisory-Link:** https://github.com/advisories/GHSA-8hfj-j24r-96c4
- **CVE / GHSA:** CVE-2022-24785 / GHSA-8hfj-j24r-96c4
- **Betroffene Versionen:** `>=1.0.1 <2.29.2` (npm audit meldete für die Kombination beider moment-Advisories `<=2.29.3`)
- **Fix-Version:** 2.29.2 (bzw. 2.29.4 für das zweite Advisory GHSA-wc69-rhjr-hc9g / CVE-2022-31129)
- **Beschreibung der Schwachstelle:** Path Traversal beim Laden von Locale-Dateien. Wird `moment.locale()`
  ein von aussen kontrollierter String übergeben, kann über `../`-Sequenzen ein Pfad ausserhalb des
  Locale-Verzeichnisses aufgelöst und damit eine beliebige Datei via `require()` geladen werden. Betrifft
  primär serverseitiges Node.js mit Dateisystemzugriff. Das zweite Advisory beschreibt eine ReDoS beim
  Parsen sehr langer Datums-Strings ohne explizites Format.
- **Glaubwürdigkeit der Quelle (Begründung):** Sehr hoch. Das Advisory stammt aus der GitHub Advisory
  Database, ist mit einer offiziellen CVE-Nummer im NVD verknüpft, verweist auf den konkreten Fix-Commit
  und den Release im moment-Repository und nennt einen nachvollziehbaren CVSS-Score. Die Angaben sind
  über drei unabhängige Quellen (NVD, GitHub Advisory, npm Advisory) konsistent überprüfbar.

---

### Finding 2: Package `lodash`

- **Advisory-Link:** https://github.com/advisories/GHSA-35jh-r3h4-6jhm
- **CVE / GHSA:** CVE-2021-23337 / GHSA-35jh-r3h4-6jhm
- **Betroffene Versionen:** `<4.17.21` für dieses Advisory; `npm audit` meldete wegen zusätzlicher,
  neuerer Advisories den Gesamtbereich `<=4.17.23`
- **Fix-Version:** 4.17.21 für CVE-2021-23337; **4.18.1** für den vollständigen Fix aller gemeldeten
  lodash-Advisories (inkl. Prototype Pollution in `_.unset` / `_.omit`)
- **Beschreibung der Schwachstelle:** Command Injection über `_.template`. Die Template-Optionen werden
  in generierten JavaScript-Code eingebettet; enthält die Option (z. B. `sourceURL`) von aussen
  kontrollierten Inhalt, lässt sich beliebiger Code ausführen. Die neueren Advisories betreffen
  Prototype Pollution: über speziell konstruierte Array-Pfade lässt sich in `_.unset()` / `_.omit()`
  der Object-Prototype manipulieren, was in anderen Programmteilen zu Logikfehlern oder
  Rechteausweitung führen kann.
- **Glaubwürdigkeit der Quelle (Begründung):** Sehr hoch. CVE-2021-23337 ist im NVD publiziert, das
  GitHub Advisory verweist auf den Fix-Commit im lodash-Repository, und Snyk sowie die npm Advisory
  Database führen den identischen Sachverhalt. lodash ist eines der meistgenutzten npm-Packages –
  Advisories dazu werden entsprechend breit geprüft.

---

### Finding 3 (Zusatz): Package `esbuild` (transitiv)

- **Advisory-Link:** https://github.com/advisories/GHSA-67mh-4wv8-2f99
- **CVE / GHSA:** GHSA-67mh-4wv8-2f99
- **Betroffene Versionen:** `<=0.24.2` (installiert war 0.17.19)
- **Fix-Version:** 0.25.0 – erreichbar nur über ein Update von `vite`
- **Beschreibung der Schwachstelle:** Der esbuild-**Entwicklungsserver** setzt `Access-Control-Allow-Origin: *`.
  Jede beliebige Website, die ein Entwickler mit laufendem Dev-Server im selben Browser öffnet, kann damit
  Requests an `localhost` senden und die Antworten auslesen – also Quellcode des Projekts abgreifen.
- **Glaubwürdigkeit der Quelle (Begründung):** Hoch. Das Advisory wurde vom esbuild-Maintainer selbst
  bestätigt und mit einem Verhaltenswechsel in Release 0.25.0 behoben; es existiert eine öffentliche
  Issue-Diskussion im esbuild-Repository. Bemerkenswert: Es handelt sich um ein reines
  **Entwicklungszeit**-Risiko, was für die Relevanzbewertung entscheidend ist.

---

## 4. Relevanz für die Applikation

| Package | Wird verwendet? | Betroffene Funktion genutzt? | Läuft im Browser / Build? | Relevanz | Begründung |
|---|---|---|---|---|---|
| `axios` | Ja (`handleFakeImport`, `App.tsx:95`) | Teilweise | Browser | **mittel** | Es wird nur ein `GET` auf eine fest verdrahtete Demo-URL ohne Auth-Header, ohne Cookies und ohne benutzerkontrollierte Config abgesetzt. Die Mehrheit der Advisories (SSRF, `NO_PROXY`-Bypass, Proxy-Authorization-Leak, `maxBodyLength`) betrifft den **Node-HTTP-Adapter**, der im Browser-Build nicht aktiv ist. Browser-relevant bleiben die Prototype-Pollution-Gadgets – ausnutzbar aber nur, wenn bereits eine Prototype Pollution in der App existiert. |
| `lodash` | Ja (`_.sortBy`, `_.groupBy`, `App.tsx:68,69,115`) | Nein | Browser | **niedrig** | Weder `_.template` (Command/Code Injection) noch `_.unset` / `_.omit` (Prototype Pollution) werden verwendet. Die ReDoS-Variante trifft `toNumber`/`trim` auf sehr lange Strings; sortiert wird über die App-eigenen Felder `date` und `time`. Kein realistischer Angriffspfad. |
| `moment` | Ja (`format`, `add`, `App.tsx:62,102`) | Nein | Browser | **niedrig** | `moment.locale()` wird nie mit externer Eingabe aufgerufen – die Path-Traversal-Schwachstelle setzt zudem Dateisystemzugriff (Node) voraus, den es im Browser nicht gibt. Datumseingaben kommen aus `<input type="date">` im ISO-Format, wodurch die ReDoS-Variante praktisch ausscheidet. Klassisches Beispiel für **hohe Severity, tiefe Relevanz**. |
| `nanoid` | Ja (ID-Generierung, `App.tsx:21,74,99`) | Nein | Browser | **niedrig** | `nanoid()` wird immer ohne Argument aufgerufen, die Advisories zu nicht-ganzzahliger/negativer Grösse greifen daher nicht. Die IDs dienen ausschliesslich als React-Keys und lokale Löschreferenz – sie sind **kein** Sicherheitstoken. Vorhersagbarkeit hat hier keine Auswirkung. |
| `vite` | Ja (Build & Dev-Server) | Ja (Dev-Server) | Build / Dev | **mittel (nur Entwicklung)** | Die `server.fs.deny`-Bypässe erlauben es, Dateien ausserhalb des Projektverzeichnisses über den laufenden Dev-Server auszulesen. Das trifft die Entwicklungsmaschine, nicht die ausgelieferte App. Das DOM-Clobbering-Advisory betrifft gebündelte Vite-Skripte und ist an eine bereits vorhandene HTML-Injection gebunden. |
| `esbuild` | Ja (transitiv über vite) | Ja (Dev-Server) | Build / Dev | **mittel (nur Entwicklung)** | Bösartige Website + laufender Dev-Server = Auslesen des Projekt-Quellcodes. Landet **nicht** im Produktions-Bundle (`devDependency`). Relevanz für die ausgelieferte Kalender-App: nicht relevant; Relevanz für die Entwickler-Workstation: mittel. |

**Gesamteinschätzung:** Die App ist eine reine Client-Anwendung ohne Backend, ohne Authentifizierung und
ohne persistente Speicherung; alle Termindaten liegen nur im React-State. Betroffene Daten wären im
schlimmsten Fall die lokal eingegebenen Termine. Keines der Findings ist im ausgelieferten Bundle
realistisch ausnutzbar. Die praktisch relevantesten Findings sind die **Dev-Tooling-Findings**
(`vite` / `esbuild`) – sie bedrohen die Entwicklungsumgebung, nicht die Applikation. Das ist die
zentrale Lehre: **Severity ≠ Relevanz.** Trotzdem wurden alle Findings behoben, weil die Updates
günstig zu haben waren und man das Risiko nicht dauerhaft mitschleppen sollte.

---

## 5. Massnahmen

`npm audit fix` allein hätte nicht gereicht: npm meldete zu jedem Finding
`fix available via npm audit fix --force` mit dem Hinweis, dass die Fix-Version ausserhalb der in
`package.json` exakt gepinnten Version liegt. Statt `--force` (mit unkontrollierten Breaking Changes)
wurden die Packages **gezielt und in zwei Schritten** aktualisiert.

| Package | Massnahme | Befehl | Neue Version |
|---|---|---|---|
| `axios` | Update auf latest (Major 0.21 → 1.x) | `npm install axios@latest` | 0.21.1 → **1.19.0** |
| `lodash` | Update auf latest | `npm install lodash@latest` | 4.17.19 → **4.18.1** |
| `moment` | Update auf latest | `npm install moment@latest` | 2.29.1 → **2.30.1** |
| `nanoid` | Update auf latest (Major 3 → 6, ESM-only) | `npm install nanoid@latest` | 3.1.25 → **6.0.1** |
| `vite` | Update auf latest – behebt zugleich das transitive `esbuild`-Finding | `npm install -D vite@latest` | 4.3.9 → **8.2.1** |
| `@vitejs/plugin-react` | Mit-Update, da Peer-Dependency zu Vite 8 | `npm install -D @vitejs/plugin-react@latest` | 4.0.0 → **6.0.5** |
| `esbuild` (transitiv) | Kein direkter Eingriff – Finding entfällt durch das Vite-Update | – | 0.17.19 → **entfernt** (Vite 8 nutzt `rolldown@1.2.4`; `esbuild` ist nur noch optionale Dependency und wird nicht installiert) |

Ausgeführte Befehle in Reihenfolge:

```bash
npm install lodash@latest moment@latest axios@latest nanoid@latest
npm install -D vite@latest @vitejs/plugin-react@latest
npm run build
npm audit
```

**Bewusst nicht gemacht:**

- `npm audit fix --force` – hätte `axios` nur auf 0.21.4 gehoben (weiterhin verwundbar) und `vite` auf
  4.5.14, womit die vite-eigenen Advisories offen geblieben wären.
- `moment` durch `dayjs` ersetzen – wäre die nachhaltigere Lösung, da moment.js offiziell im
  Maintenance-Modus ist (siehe „Offene Punkte“).

---

## 6. Ergebnis nach der Behebung

Ausgabe von `npm audit` nach dem Fix:

```
found 0 vulnerabilities
```

Zur Kontrolle die installierten Versionen (`npm ls`):

```
secure-calendar-training@1.0.0
├── @types/lodash@4.14.182
├── @types/react-dom@18.0.11
├── @types/react@18.0.28
├── @vitejs/plugin-react@6.0.5
├── axios@1.19.0
├── lodash@4.18.1
├── moment@2.30.1
├── nanoid@6.0.1
├── react-dom@18.2.0
├── react@18.2.0
├── typescript@5.0.4
└── vite@8.2.1
```

**Offene Findings nach Fix:** **0** (vorher: 6 – davon 5 high, 1 moderate)

**App noch lauffähig?** **Ja** – verifiziert über:

- `npm run build` (`tsc && vite build`) läuft ohne Fehler durch:
  ```
  vite v8.2.1 building client environment for production...
  ✓ 72 modules transformed.
  dist/index.html                   0.40 kB │ gzip:   0.28 kB
  dist/assets/index-C_pyfwX6.css    3.54 kB │ gzip:   1.19 kB
  dist/assets/index-DoOYB0Fh.js   324.97 kB │ gzip: 110.31 kB
  ✓ built in 137ms
  ```
- `npm run dev` startet (`VITE v8.2.1 ready in 135 ms`), `http://localhost:5173/` antwortet mit
  **HTTP 200**, die Module werden korrekt transformiert ausgeliefert.

**Kommentar:**

- **`esbuild` ist komplett aus dem Baum verschwunden.** Vite 8 bündelt mit `rolldown@1.2.4`; `esbuild`
  ist nur noch eine *optionale* Peer-Dependency und wird nicht mehr installiert (`npm ls esbuild` →
  `(empty)`). Das transitive Finding ist damit nicht nur gepatcht, sondern entfällt vollständig – ein
  gutes Beispiel dafür, dass ein Update der übergeordneten Dependency ganze Teilbäume ersetzen kann.
- **Keine Code-Anpassung nötig.** Trotz zweier Major-Updates (`axios` 0.x → 1.x, `nanoid` 3 → 6) blieb
  `App.tsx` unverändert: Die genutzte axios-API (`axios.get<T>(url)`) ist in 1.x unverändert, und der
  Named Import `{ nanoid }` existiert in nanoid 6 weiterhin. Dass nanoid 6 ESM-only ist, ist unkritisch,
  da Vite das Bundling übernimmt; `tsc` meldet keine Fehler.
- **Neue Warnung nach dem Vite-Update** (kein Fehler, Build läuft):
  ```
  (!) Your Vite config uses features that are unsupported by `configLoader: 'native'` ...
      ESM syntax in a file loaded as CommonJS (vite.config.ts:1:1).
      Use a `.mjs` extension or set "type": "module" in the closest package.json
  ```
  Behebbar durch `"type": "module"` in `package.json`. Wurde bewusst nicht gemacht, um die Änderung
  auf die Security-Fixes zu begrenzen.
- **Versionsbereiche:** Die Versionen sind in `package.json` neu mit Caret (`^`) statt exakt gepinnt.
  Damit fliessen Patch- und Minor-Updates künftig automatisch ein – für Security-Fixes gewünscht,
  reproduzierbar bleibt der Stand über `package-lock.json`.
- **Kleine Inkonsistenz:** `@types/lodash@4.14.182` passt nicht mehr exakt zu `lodash@4.18.1`. Da die
  genutzten Funktionen (`sortBy`, `groupBy`) typseitig unverändert sind, kompiliert das Projekt sauber.
  Ein Update von `@types/lodash` wäre der saubere Folgeschritt, ist aber kein Security-Thema.

---

## 7. Offene Punkte / Empfehlungen

| Thema | Empfehlung | Priorität |
|---|---|---|
| `moment` ist deprecated | Ablösung durch `dayjs` oder `date-fns`; benötigt Anpassung von `formatDate()` und `handleFakeImport()` in `App.tsx`. Reduziert langfristig die Angriffsfläche, da moment nur noch kritische Fixes erhält. | mittel |
| `@types/lodash` veraltet | `npm install -D @types/lodash@latest` | niedrig |
| Vite-Config-Warnung | `"type": "module"` in `package.json` oder `vite.config.mts` | niedrig |
| Kontinuierliche Prüfung | `npm audit` in die CI-Pipeline aufnehmen (z. B. `npm audit --audit-level=high`), ergänzt durch Dependabot/Renovate für automatische Update-PRs. Ein einmaliger Fix veraltet sofort wieder. | hoch |
| `axios` überhaupt nötig? | Für einen einzelnen GET-Request genügt die native `fetch()`-API. Weniger Dependencies = weniger Angriffsfläche. | niedrig |

---

## Anhang A: `npm audit` vor dem Fix (Originalausgabe)

```
# npm audit report

axios  <=0.32.0
Severity: high
Axios Cross-Site Request Forgery Vulnerability - https://github.com/advisories/GHSA-wf5p-g6vw-rhxx
axios Inefficient Regular Expression Complexity vulnerability - https://github.com/advisories/GHSA-cph5-m8f7-6c5x
axios Requests Vulnerable To Possible SSRF and Credential Leakage via Absolute URL - https://github.com/advisories/GHSA-jr5f-v2jv-69x6
Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF - https://github.com/advisories/GHSA-3p68-rc4w-qgx5
Axios: Authentication Bypass via Prototype Pollution Gadget in `validateStatus` Merge Strategy - https://github.com/advisories/GHSA-w9j2-pvgh-6h63
Axios: Incomplete Fix for CVE-2025-62718 - NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet (127.0.0.0/8) in Axios 1.15.0 - https://github.com/advisories/GHSA-pmwg-cvhr-8vh7
Axios: Null Byte Injection via Reverse-Encoding in AxiosURLSearchParams - https://github.com/advisories/GHSA-xhjh-pmcv-23jw
Axios: no_proxy bypass via IP alias allows SSRF - https://github.com/advisories/GHSA-m7pr-hjqh-92cm
Axios' HTTP adapter-streamed uploads bypass maxBodyLength when maxRedirects: 0 - https://github.com/advisories/GHSA-5c9x-8gcm-mpgx
Axios: HTTP adapter streamed responses bypass maxContentLength - https://github.com/advisories/GHSA-vf2m-468p-8v99
Axios: Prototype Pollution Gadgets - Response Tampering, Data Exfiltration, and Request Hijacking - https://github.com/advisories/GHSA-pf86-5x62-jrwf
Axios: Header Injection via Prototype Pollution - https://github.com/advisories/GHSA-6chq-wfr3-2hj9
Axios: XSRF Token Cross-Origin Leakage via Prototype Pollution Gadget in `withXSRFToken` Boolean Coercion - https://github.com/advisories/GHSA-xx6v-rp6x-q39c
Axios is Vulnerable to Denial of Service via __proto__ Key in mergeConfig - https://github.com/advisories/GHSA-43fc-jf86-j433
Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain - https://github.com/advisories/GHSA-fvcv-3m26-pcqx
Axios: unbounded recursion in toFormData causes DoS via deeply nested request data - https://github.com/advisories/GHSA-62hf-57xw-28j9
Axios: Regular Expression Denial of Service (ReDoS) via Cookie Name Injection - https://github.com/advisories/GHSA-hfxv-24rg-xrqf
Axios: Proxy-Authorization Credential Leak to Origin Server Across HTTP-to-HTTPS Redirect in Axios Node.js HTTP Adapter - https://github.com/advisories/GHSA-p92q-9vqr-4j8v
Axios: Proxy-Authorization header leaks to redirect target when proxy is re-evaluated to direct connection - https://github.com/advisories/GHSA-j5f8-grm9-p9fc
axios Vulnerable to Credential Theft and Response Hijacking via Prototype Pollution Gadget in Config Merge - https://github.com/advisories/GHSA-3g43-6gmg-66jw
axios has DoS & Header Injection via Prototype Pollution Read-Side Gadgets in axios merge functions - https://github.com/advisories/GHSA-898c-q2cr-xwhg
axios's shouldBypassProxy does not recognize IPv4-mapped IPv6 addresses, allowing NO_PROXY bypass (incomplete fix for CVE-2025-62718) - https://github.com/advisories/GHSA-pjwm-pj3p-43mv
Axios: Prototype pollution gadgets can alter axios request construction - https://github.com/advisories/GHSA-mmx7-hfxf-jppx
Axios: Nested axios option objects can consume polluted prototype values - https://github.com/advisories/GHSA-7q8q-rj6j-mhjq
fix available via `npm audit fix --force`
Will install axios@0.21.4, which is outside the stated dependency range
node_modules/axios

esbuild  <=0.24.2
Severity: moderate
esbuild enables any website to send any requests to the development server and read the response - https://github.com/advisories/GHSA-67mh-4wv8-2f99
fix available via `npm audit fix --force`
Will install vite@4.5.14, which is outside the stated dependency range
node_modules/esbuild
  vite  <=6.4.2
  Depends on vulnerable versions of esbuild
  node_modules/vite

lodash  <=4.17.23
Severity: high
Command Injection in lodash - https://github.com/advisories/GHSA-35jh-r3h4-6jhm
Regular Expression Denial of Service (ReDoS) in lodash - https://github.com/advisories/GHSA-29mw-wpgm-hmr9
lodash vulnerable to Code Injection via `_.template` imports key names - https://github.com/advisories/GHSA-r5fr-rjxr-66jc
lodash vulnerable to Prototype Pollution via array path bypass in `_.unset` and `_.omit` - https://github.com/advisories/GHSA-f23m-r3pf-42rh
Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions - https://github.com/advisories/GHSA-xxjr-mmjv-4gpg
fix available via `npm audit fix --force`
Will install lodash@4.18.1, which is outside the stated dependency range
node_modules/lodash

moment  <=2.29.3
Severity: high
Path Traversal: 'dir/../../filename' in moment.locale - https://github.com/advisories/GHSA-8hfj-j24r-96c4
Moment.js vulnerable to Inefficient Regular Expression Complexity - https://github.com/advisories/GHSA-wc69-rhjr-hc9g
fix available via `npm audit fix --force`
Will install moment@2.30.1, which is outside the stated dependency range
node_modules/moment

nanoid  <=3.3.17
Severity: high
Predictable results in nanoid generation when given non-integer values - https://github.com/advisories/GHSA-mwcw-c2x4-8c55
Exposure of Sensitive Information to an Unauthorized Actor in nanoid - https://github.com/advisories/GHSA-qrpm-p2h7-hrv2
nanoid: non-secure generators can loop indefinitely with negative size - https://github.com/advisories/GHSA-28wg-ghj8-5hjv
nanoid: custom generators can loop indefinitely when size is zero - https://github.com/advisories/GHSA-2v37-7h3g-55p8
fix available via `npm audit fix --force`
Will install nanoid@3.3.18, which is outside the stated dependency range
node_modules/nanoid


6 vulnerabilities (1 moderate, 5 high)

To address all issues, run:
  npm audit fix --force
```

> Anmerkung: In der Textausgabe erscheint `vite` eingerückt unter `esbuild`. Die JSON-Ausgabe
> (`npm audit --json`) zeigt jedoch, dass `vite` mit `Severity: high` **eigene** Advisories hat
> (u. a. GHSA-c24v-8rfc-w8vw, GHSA-fx2h-pf6j-xcff) und nicht nur wegen `esbuild` gemeldet wird.
> Deshalb ergibt die Zählung 5 high (axios, lodash, moment, nanoid, vite) + 1 moderate (esbuild).

---

## Anhang B: `npm ls` vor dem Fix (direkte Dependencies)

```
secure-calendar-training@1.0.0
├── @types/lodash@4.14.182
├── @types/react-dom@18.0.11
├── @types/react@18.0.28
├── @vitejs/plugin-react@4.0.0
├── axios@0.21.1
├── lodash@4.17.19
├── moment@2.29.1
├── nanoid@3.1.25
├── react-dom@18.2.0
├── react@18.2.0
├── typescript@5.0.4
└── vite@4.3.9
```

Relevante Ausschnitte aus `npm ls --all` (Nachweis der transitiven Ketten):

```
$ npm ls esbuild
└─┬ vite@4.3.9
  └── esbuild@0.17.19

$ npm ls nanoid
├── nanoid@3.1.25
└─┬ vite@4.3.9
  └─┬ postcss@8.5.26
    └── nanoid@3.3.18

$ npm ls follow-redirects
└─┬ axios@0.21.1
  └── follow-redirects@1.16.0
```

---

## Anhang C: Geänderte Dateien

`package.json` (Diff):

```diff
   "dependencies": {
-    "axios": "0.21.1",
-    "lodash": "4.17.19",
-    "moment": "2.29.1",
-    "nanoid": "3.1.25",
+    "axios": "^1.19.0",
+    "lodash": "^4.18.1",
+    "moment": "^2.30.1",
+    "nanoid": "^6.0.1",
     "react": "18.2.0",
     "react-dom": "18.2.0"
   },
   "devDependencies": {
     "@types/lodash": "4.14.182",
     "@types/react": "18.0.28",
     "@types/react-dom": "18.0.11",
-    "@vitejs/plugin-react": "4.0.0",
+    "@vitejs/plugin-react": "^6.0.5",
     "typescript": "5.0.4",
-    "vite": "4.3.9"
+    "vite": "^8.2.1"
   }
```

`package-lock.json` wurde durch die Updates ebenfalls neu geschrieben.
`src/App.tsx` blieb **unverändert**.