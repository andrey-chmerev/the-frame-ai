# THE Frame

FRAME — Framework für KI-gestützte Solo-Entwicklung

[🇺🇸 English](README.md) | [🇨🇳 中文](README.zh.md) | [🇮🇳 हिंदी](README.hi.md) | [🇯🇵 日本語](README.ja.md) | [🇩🇪 Deutsch](README.de.md) | [🇪🇸 Español](README.es.md) | [🇷🇺 Русский](README.ru.md)

## Was ist FRAME?

**FRAME (Framework for AI-Assisted Solo Development)** ist ein Framework für Solo-Entwickler, die Produkte mit Claude Code erstellen. Es verwandelt chaotische KI-gestützte Entwicklung in einen vorhersehbaren Prozess — von der Idee bis zum Deploy — mit Gedächtnis, Struktur und Schutz vor Fehlern.

Wenn du alleine mit Claude Code ein Produkt baust und wie ein Team arbeiten möchtest — FRAME ist für dich.

## Welche Probleme löst FRAME?

| Problem | Was FRAME bietet |
|---------|-----------------|
| Kontextverlust zwischen Sitzungen | Projektgedächtnis und automatischer Statusdump beim Sitzungsstart |
| Chaos bei Aufgaben und Prioritäten | 6-Phasen-Workflow: Recherche → Plan → Build → Review → Ship → Reflect |
| Angst, etwas Wichtiges zu zerstören | Safety-Hooks blockieren destruktive Befehle vor der Ausführung |
| Sich wiederholende Routineaufgaben | 35 fertige Befehle für den vollständigen Entwicklungszyklus |
| Komplexe Features mit Abhängigkeiten | Parallele Subagenten für unabhängige Aufgaben |
| Keine Struktur für Solo-Arbeit | Roadmap, STATE.md, MAP.md — immer wissen, wo du bist und was als nächstes kommt |
| Sicherheitslücken beim Deployment | Security-Agent prüft OWASP Top 10, Secrets, Infrastruktur, KI-Risiken |

## Wie man mit FRAME arbeitet

```
Recherche → Plan → Build → Review → Ship → Reflect
```

Jede Sitzung ist ein Zyklus. Beginne mit `/frame:daily`, ende mit `/frame:ship`.

**Recherche** — verstehen, bevor du baust
Führe `/frame:research <Thema>` aus — Claude erkundet die Codebasis, externe Quellen und baut Kontext für den nächsten Schritt auf.

**Plan** — in Aufgaben aufteilen
`/frame:plan <Feature>` verwandelt Recherche in eine konkrete Aufgabenliste mit Schätzungen.

**Build** — implementieren
`/frame:build` führt Aufgaben sequenziell aus (1–3 auf einmal) mit TDD. Für viele unabhängige Aufgaben — `/frame:wave` führt sie in parallelen Batches aus. Wenn Qualität wichtiger als Geschwindigkeit ist — `/frame:wave-team` fügt ein Review-Team (Security, Performance, Tests, Conventions) nach jeder Aufgabe hinzu. Feststeckend — `/frame:unstuck`. Bug gefunden — `/frame:debug`.

**Review** — vor dem Deployment prüfen
`/frame:review` führt automatisierte Prüfungen durch und gibt eine Checkliste: Tests, Typen, Sicherheit, Performance.

**Ship** — deployen und aufzeichnen
`/frame:ship` committet, optionaler Push/PR und aktualisiert das Projektgedächtnis.

**Reflect** — lernen und verbessern
`/frame:retrospective` nach dem Deploy aktualisiert Metriken und erfasst Muster für zukünftige Sitzungen.

## Beispiele

### Neues Feature: Google-Authentifizierung hinzufügen

```
/frame:daily
# → aktuellen Projektstatus und Geplantes sehen

/frame:research "Google OAuth"
# → Claude untersucht die Codebasis: wie aktuelle Auth funktioniert,
#   welche Muster bereits verwendet werden, was hinzugefügt werden muss

/frame:plan "Google OAuth"
# → konkrete Aufgabenliste erhalten:
#   1. Google OAuth-Credentials konfigurieren
#   2. Callback-Route hinzufügen
#   3. Mit Sessions verbinden
#   4. Button zur UI hinzufügen

/frame:checkpoint
# → Wiederherstellungspunkt speichern — falls etwas schiefgeht, kann man zurückrollen

/frame:wave
# → Aufgaben 1–4 sind unabhängig, Claude führt sie parallel aus

/frame:review
# → automatisierte Prüfungen: Tests, Typen, Sicherheit

/frame:ship
# → commit, optionaler Push/PR, Projektgedächtnis aktualisiert
```

### Bug: Benutzer können sich nach dem Passwort-Reset nicht einloggen

```
/frame:daily
# → Kontext wiederherstellen, prüfen ob der Bug bereits im Plan ist oder hinzufügen

/frame:debug "login after reset"
# → Claude prüft systematisch: Logs, Reset-Flow, Sessions, Tokens
# → du erhältst eine Hypothese mit einer konkreten Stelle im Code

# Wenn die Ursache sofort gefunden wird:
/frame:checkpoint                        # Wiederherstellungspunkt vor dem Fix
/frame:fast "fix: invalidate old session after password reset"
# → Claude macht einen gezielten Fix, schreibt einen Regressionstest

# Wenn die Ursache unklar ist — tiefer gehen:
/frame:forensics
# → analysiert die Git-Historie der Änderungen in diesem Bereich,
#   findet den Commit, der das Verhalten gebrochen hat

/frame:checkpoint
/frame:fast "fix: ..."                   # gefundene Ursache beheben

/frame:review
# → bestätigen, dass der Fix keine anderen Login-Szenarien gebrochen hat

/frame:ship
```

### UI-Verifizierung: Sicherstellen dass die Oberfläche funktioniert

```
/frame:build
# → Claude implementiert die Aufgabe, sagt "fertig"

/frame:verify-ui
# → öffnet Browser über Playwright MCP, macht Screenshot
# → vergleicht mit der Aufgabenbeschreibung
# → PASS: Oberfläche entspricht den Erwartungen
# → FAIL: beschreibt genau was nicht stimmt und wo nachzuschauen ist

# Wenn etwas nicht stimmt:
/frame:fast "fix: Button wird auf Mobile nicht angezeigt"
/frame:verify-ui
# → erneute Prüfung nach dem Fix
```

Der Befehl **prüft** nur — er behebt nicht automatisch. Wenn er ein Problem findet, beschreibt er es präzise: welches Element, welches Verhalten, was erwartet wurde.

**Automatische Prüfung**: in `/frame:build`, `/frame:fast`, `/frame:wave` und `/frame:debug` — wenn die Aufgabe UI-Dateien berührt (`.tsx`, `.vue`, `.css`, `component`, `page`) — wird die Browser-Prüfung automatisch nach den Quality Gates ausgeführt.

**Erfordert Playwright MCP** — wird automatisch bei `npx the-frame init` oder `npx the-frame update` hinzugefügt, wenn die Frage zum Frontend-Projekt mit "y" beantwortet wird.

### Sicherheit: Audit vor dem Launch

```
/frame:daily
# → Briefing zeigt: "Security: ⚠️ never run" — Zeit das zu beheben

/frame:security
# → vollständiger Projektscan über alle Kategorien:
#   - Secrets: AWS-Keys, GitHub-Tokens, Stripe-Keys, Private Keys, .env in Git
#   - OWASP Top 10: SQL-Injection, XSS, CSRF, Path Traversal, SSRF, Command Injection
#   - Infrastruktur: Dockerfile (Root-User, :latest), Debug-Endpunkte
#   - KI/LLM: Prompt Injection, unsichere Ausgabeverarbeitung, System-Prompt-Leak
#   - Abhängigkeiten: bekannte CVEs via npm audit

# → Bericht gespeichert unter .planning/reports/security/security-{date}.md
# → STATE.md mit Security Status aktualisiert

# Bei CRITICAL oder HIGH Befunden:
# ⛔ Ship BLOCKIERT. Führe /frame:security-fix aus um kritische Befunde zu beheben.

/frame:security-fix
# → liest den letzten Bericht und behebt Befunde nach Priorität:
#   CRITICAL zuerst, dann HIGH
#   - entfernt .env aus Git-Tracking (git rm --cached)
#   - fügt fehlende Security-Header zu next.config.js / Express hinzu
#   - fügt CSRF-Schutz für Route Handler hinzu
#   - führt npm audit fix für verwundbare Abhängigkeiten aus
#   - behebt Dockerfile: fügt USER-Direktive hinzu, ersetzt :latest
#   - für Secrets bereits in der History: erklärt genau wie rotieren + History neu schreiben
# → verifiziert jeden Fix nach der Anwendung
# → aktualisiert STATE.md: entsperrt Ship wenn alle CRITICAL behoben

# Gezielte Fixes:
/frame:security-fix critical     # nur CRITICAL beheben
/frame:security-fix high         # nur HIGH beheben
/frame:security-fix SEC-1        # bestimmten Befund per ID beheben

/frame:security
# → Audit erneut ausführen um zu bestätigen dass alles sauber ist

# Wenn alles sauber:
# ✓ Keine kritischen Probleme. Sicher mit /frame:ship fortzufahren.

/frame:ship
# → Sicherheitsprüfung bestanden, commit und push

# Gezielte Scans wenn du weißt wonach du suchst:
/frame:security secrets          # nur Secrets (~30 Sekunden)
/frame:security src/api/         # bestimmtes Verzeichnis scannen
```

```
/frame:daily

/frame:perf-audit
# → erkennt Stack (Next.js + PostgreSQL + Redis usw.)
# → sucht aktuelle bekannte Probleme für genau diesen Stack
# → Tiefenscan: N+1-Abfragen, Memory Leaks, blockierende Operationen,
#   fehlende Cache-Header, Re-Render-Ursachen, Bundle-Größe
# → Bericht gespeichert in .planning/reports/performance/PERF_REPORT.md
#   mit Critical/High/Medium/Low-Prioritäten und Aufwandsschätzungen

# Beispiel-Ausgabe:
# Critical: 2 | High: 4 | Medium: 3 | Low: 1
# [PERF-1] N+1-Abfrage in /api/users — 47 extra DB-Abfragen pro Request (S)
# [PERF-2] setInterval ohne Cleanup in Dashboard — Memory Leak (XS)

/frame:perf-fix
# → liest PERF_REPORT.md, beginnt mit Critical
# → zeigt für jedes Problem:
#   --- BEFORE ---
#   const users = await db.findMany()
#   --- AFTER ---
#   const users = await db.findMany({ select: { id, name, email } })
# → fragt: Apply this fix? [y/n/skip]
# → wendet an, führt Typecheck + Tests aus, macht Rollback bei Fehler

# Gezielte Fixes:
/frame:perf-fix PERF-1      # ein Problem beheben
/frame:perf-fix high        # alle High beheben
/frame:perf-fix all         # Critical + High beheben

/frame:perf-audit
# → erneut ausführen um Verbesserungen zu bestätigen
```

## Was drin ist

FRAME bietet:

- **6-Phasen-Workflow**: Recherche → Plan → Build → Review → Ship → Reflect
- **37 Befehle**: von schnellen Aufgaben bis zum vollständigen Feature-Entwicklungszyklus
- **7 KI-Agenten**: Researcher, Planner, Builder, Reviewer, Devil's Advocate, Security, Performance Auditor
- **Safety-Hooks**: blockieren destruktive Operationen, erzwingen Quality-Gates
- **Git-Sicherheit**: Checkpoints, Rollback, Worktrees, Pause/Resume
- **Sicherheitsaudit**: OWASP Top 10, Secret-Erkennung, Infrastruktur-Checks, KI/LLM-Risiken

## Voraussetzungen

- Node.js >= 18
- Git (Projekt muss ein Git-Repository sein)

## Schnellstart

```bash
# Git-Repo initialisieren falls nötig
git init && git commit --allow-empty -m "init"

# FRAME installieren
npx the-frame-ai init

# Claude Code in diesem Projekt öffnen und ausführen:
/frame:init    # Codebasis scannen, MAP.md befüllen
/frame:daily   # dein täglicher Einstiegspunkt
```

## Befehle

### Kern — hier anfangen

Diese 7 Befehle decken 90% der Solo-Dev-Arbeit ab:

| Befehl | Wann verwenden |
|--------|---------------|
| `/frame:daily` | **Hier anfangen** nach jeder Pause — was wurde gemacht, was kommt als nächstes |
| `/frame:research <Thema>` | Vor der Planung eines neuen Features |
| `/frame:plan <Feature>` | Recherche in eine umsetzbare Aufgabenliste umwandeln |
| `/frame:build` | 1–3 Aufgaben mit TDD implementieren (sequenziell) |
| `/frame:wave` | 4+ unabhängige Aufgaben implementieren (parallele Subagenten) |
| `/frame:wave-team` | Wie wave, aber mit Review-Team nach jeder Aufgabe |
| `/frame:review` | Vor dem Deployment — automatisierte Prüfungen + Checkliste |
| `/frame:ship` | Commit, optionaler Push/PR, Gedächtnis aktualisieren |

### Alle Befehle nach Phase

<details>
<summary>Recherche</summary>

| Befehl | Wann verwenden |
|--------|---------------|
| `/frame:research <Thema>` | Vor der Planung eines neuen Features |
| `/frame:explain <Datei>` | Warum sieht dieser Code so aus? |
| `/frame:why <Thema>` | Entscheidungshistorie durchsuchen |
| `/frame:arch <Modul>` | Modularchitektur in `docs/arch/{Modul}.md` dokumentieren |
</details>

<details>
<summary>Plan</summary>

| Befehl | Wann verwenden |
|--------|---------------|
| `/frame:plan <Feature>` | Recherche in eine umsetzbare Aufgabenliste umwandeln |
| `/frame:add-task` | Aufgabe zum Plan hinzufügen ohne die Arbeit zu unterbrechen |
</details>

<details>
<summary>Build</summary>

| Befehl | Wann verwenden |
|--------|---------------|
| `/frame:build` | Plan mit TDD implementieren (1–3 Aufgaben, sequenziell) |
| `/frame:wave` | 4+ unabhängige Aufgaben in parallelen Batches implementieren |
| `/frame:wave-team` | Wie wave, aber mit Review-Team nach jeder Aufgabe |
| `/frame:fast <Aufgabe>` | Schnelle Aufgabe unter 30 Minuten |
| `/frame:debug <Problem>` | Systematische Bug-Untersuchung |
| `/frame:forensics` | Tiefenanalyse warum etwas kaputt gegangen ist |
| `/frame:refactor` | Refactoring mit TDD-Sicherheitsnetz |
| `/frame:migrate` | DB/API/Deps-Migration mit Rollback-Plan |
</details>

<details>
<summary>Review</summary>

| Befehl | Wann verwenden |
|--------|---------------|
| `/frame:review` | Vor dem Deployment — automatisierte Prüfungen + Checkliste |
| `/frame:security` | Tiefer Sicherheitsaudit: Secrets, OWASP, Infrastruktur, KI/LLM-Risiken |
| `/frame:security-fix` | Befunde aus dem letzten Sicherheitsbericht beheben (CRITICAL zuerst, dann HIGH) |
| `/frame:perf-audit` | Tiefer Performance-Audit: erkennt Stack, recherchiert aktuelle Probleme, schreibt PERF_REPORT.md |
| `/frame:perf-fix` | Probleme aus PERF_REPORT.md beheben — zeigt Before/After, fragt Bestätigung pro Fix |
| `/frame:health` | Vollständiger Projekt-Gesundheitscheck |
| `/frame:check-deps` | Sicherheitsaudit + veraltete Pakete |
| `/frame:performance` | Bundle-Größe und Lighthouse-Audit |
</details>

<details>
<summary>Ship</summary>

| Befehl | Wann verwenden |
|--------|---------------|
| `/frame:ship` | Commit, optionaler Push/PR, Gedächtnis aktualisieren |
| `/frame:checkpoint` | Git-Tag vor einer riskanten Änderung speichern |
| `/frame:rollback` | Zu einem Checkpoint zurückrollen |
</details>

<details>
<summary>Reflect</summary>

| Befehl | Wann verwenden |
|--------|---------------|
| `/frame:retrospective` | Nach dem Deploy — Gedächtnis und Metriken aktualisieren |
| `/frame:sprint-check` | Wöchentlicher Fortschritt vs. Roadmap |
| `/frame:cleanup-memory` | Veraltetes Gedächtnis kürzen und archivieren |
</details>

<details>
<summary>Täglich & Hilfsprogramme</summary>

| Befehl | Wann verwenden |
|--------|---------------|
| `/frame:daily` | Tagesbeginn — was wurde gemacht, was kommt als nächstes |
| `/frame:status` | Vollständiger Statusdump (Git, Gedächtnis, Blocker) |
| `/frame:note` | Muster, Entscheidung oder Anti-Pattern festhalten |
| `/frame:unstuck` | Feststeckend? 3 konkrete Optionen zum Entsperren erhalten |
| `/frame:context` | Aktuellen Arbeitskontext anzeigen |
| `/frame:init` | Erster Start — Codebasis scannen, MAP.md befüllen |
| `/frame:doctor` | FRAME-Installation überprüfen |
| `/frame:pause` / `/frame:resume` | Zustand mitten in einer Aufgabe speichern und wiederherstellen |
</details>

<details>
<summary>Erweitert</summary>

| Befehl | Wann verwenden |
|--------|---------------|
| `/frame:worktree` | Isolierter Git-Worktree für parallele Experimente |
| `/frame:headless` | Autonomer CI-Modus (keine Interaktion) |
| `/frame:estimate <Aufgabe>` | Umfang- und Zeitschätzung vor dem Start |
</details>

## Hooks

FRAME installiert 4 Hooks in `.claude/hooks/`. Sie laufen automatisch.

| Hook | Auslöser | Was er tut | Zum Deaktivieren |
|------|---------|------------|-----------------|
| `safety-net.sh` | Vor Bash | Blockiert `rm -rf` und `DROP TABLE/DATABASE` | Aus `.claude/settings.local.json` entfernen |
| `git-safety.sh` | Vor Bash | Blockiert Force-Push, `reset --hard`, warnt bei `git add -A` | Aus `.claude/settings.local.json` entfernen |
| `quality-gate.sh` | Nach Datei-Schreiben | Führt Typecheck + Lint auf geänderter Datei aus | Aus `.claude/settings.local.json` entfernen |
| `session-init.sh` | Sitzungsstart | Zeigt aktuelle Phase/Aufgabe; vollständiger Kontextdump bei > 24h Abwesenheit | Aus `.claude/settings.local.json` entfernen |

## Konfiguration

FRAME wird über `.frame/config.json` konfiguriert. Wichtige Einstellungen:

```json
{
  "quality": {
    "commands": {
      "typecheck": "npx tsc --noEmit",
      "test": "npx vitest run",
      "lint": "npx eslint .",
      "build": "npm run build"
    }
  }
}
```

## CLI

```bash
npx the-frame-ai init [target-dir]     # FRAME installieren
npx the-frame-ai update [target-dir]   # Befehle, Agenten, Hooks aktualisieren
npx the-frame-ai doctor [target-dir]   # Installationsgesundheit prüfen
npx the-frame-ai version               # CLI-Version anzeigen
```

`update` aktualisiert nur Befehle, Agenten und Hooks. Projektdateien (STATE.md, MAP.md, memory/ usw.) werden nie überschrieben.

## Projektstruktur (nach der Installation)

```
.claude/
  commands/          # 35 FRAME-Befehle
  agents/            # 6 KI-Agenten
  hooks/             # 4 Safety-Hooks
.frame/
  config.json        # FRAME-Konfiguration
.planning/
  STATE.md           # Aktuelle Position
  MAP.md             # Projektkarte
  ROADMAP.md         # Roadmap
  memory/            # Projektgedächtnis
  specs/             # Feature-Spezifikationen
  reviews/           # Review-Ergebnisse
  reports/           # Berichte (täglich, Deps, Qualität, Sprint, Sicherheit)
```

## Lizenz

MIT
