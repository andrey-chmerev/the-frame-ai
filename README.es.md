# THE Frame

FRAME — Framework para el Desarrollo en Solitario Asistido por IA

[🇺🇸 English](README.md) | [🇨🇳 中文](README.zh.md) | [🇮🇳 हिंदी](README.hi.md) | [🇯🇵 日本語](README.ja.md) | [🇩🇪 Deutsch](README.de.md) | [🇪🇸 Español](README.es.md) | [🇷🇺 Русский](README.ru.md)

## ¿Qué es FRAME?

**FRAME (Framework for AI-Assisted Solo Development)** es un framework para desarrolladores en solitario que construyen productos con Claude Code. Convierte el caótico desarrollo asistido por IA en un proceso predecible — desde la idea hasta el despliegue — con memoria, estructura y protección contra errores.

Si estás construyendo un producto solo con Claude Code y quieres trabajar como un equipo — FRAME es para ti.

## ¿Qué problemas resuelve FRAME?

| Problema | Lo que FRAME proporciona |
|----------|------------------------|
| Perder contexto entre sesiones | Memoria del proyecto y volcado automático de estado al inicio de sesión |
| Caos en tareas y prioridades | Flujo de trabajo de 6 fases: Investigar → Planificar → Construir → Revisar → Publicar → Reflexionar |
| Miedo a romper algo importante | Los safety hooks bloquean comandos destructivos antes de ejecutarse |
| Tareas rutinarias repetitivas | 35 comandos listos para usar para el ciclo completo de desarrollo |
| Funcionalidades complejas con dependencias | Subagentes paralelos para tareas independientes |
| Sin estructura para el trabajo en solitario | Roadmap, STATE.md, MAP.md — siempre saber dónde estás y qué sigue |
| Vulnerabilidades de seguridad al publicar | El agente de seguridad audita OWASP Top 10, secretos, infraestructura, riesgos de IA |

## Cómo trabajar con FRAME

```
Investigar → Planificar → Construir → Revisar → Publicar → Reflexionar
```

Cada sesión es un ciclo. Empieza con `/frame:daily`, termina con `/frame:ship`.

**Investigar** — entender antes de construir
Ejecuta `/frame:research <tema>` — Claude explora la base de código, fuentes externas y construye contexto para el siguiente paso.

**Planificar** — dividir en tareas
`/frame:plan <funcionalidad>` convierte la investigación en una lista de tareas concreta con estimaciones.

**Construir** — implementar
`/frame:build` ejecuta tareas secuencialmente (1–3 a la vez) con TDD. Para muchas tareas independientes — `/frame:wave` las ejecuta en lotes paralelos. Cuando la calidad importa más que la velocidad — `/frame:wave-team` añade un equipo de revisión (Security, Performance, Tests, Conventions) después de cada tarea. Atascado — `/frame:unstuck`. Encontraste un bug — `/frame:debug`.

**Revisar** — verificar antes de desplegar
`/frame:review` ejecuta verificaciones automatizadas y proporciona una lista de comprobación: pruebas, tipos, seguridad, rendimiento.

**Publicar** — desplegar y registrar
`/frame:ship` hace commit, push/PR opcional y actualiza la memoria del proyecto.

**Reflexionar** — aprender y mejorar
`/frame:retrospective` después del despliegue actualiza métricas y captura patrones para sesiones futuras.

## Ejemplos

### Nueva funcionalidad: añadir autenticación con Google

```
/frame:daily
# → ver el estado actual del proyecto y lo que está planificado

/frame:research "Google OAuth"
# → Claude estudia la base de código: cómo funciona la auth actual,
#   qué patrones ya se usan, qué hay que añadir

/frame:plan "Google OAuth"
# → obtener una lista de tareas concreta:
#   1. configurar credenciales de Google OAuth
#   2. añadir ruta de callback
#   3. conectar a sesiones
#   4. añadir botón a la UI

/frame:checkpoint
# → guardar un punto de restauración — si algo sale mal, puedes hacer rollback

/frame:wave
# → las tareas 1–4 son independientes, Claude las ejecuta en paralelo

/frame:review
# → verificaciones automatizadas: pruebas, tipos, seguridad

/frame:ship
# → commit, push/PR opcional, memoria del proyecto actualizada
```

### Bug: los usuarios no pueden iniciar sesión después de restablecer la contraseña

```
/frame:daily
# → restaurar contexto, ver si el bug ya está en el plan o añadirlo

/frame:debug "login after reset"
# → Claude verifica sistemáticamente: logs, flujo de reset, sesiones, tokens
# → obtienes una hipótesis con una ubicación concreta en el código

# Si la causa se encuentra de inmediato:
/frame:checkpoint                        # punto de restauración antes del fix
/frame:fast "fix: invalidate old session after password reset"
# → Claude hace un fix dirigido, escribe una prueba de regresión

# Si la causa no está clara — profundizar:
/frame:forensics
# → analiza el historial de git de cambios en esta área,
#   encuentra el commit que rompió el comportamiento

/frame:checkpoint
/frame:fast "fix: ..."                   # corregir la causa encontrada

/frame:review
# → confirmar que el fix no rompió otros escenarios de inicio de sesión

/frame:ship
```

### Verificación de UI: confirmar que la interfaz funciona

```
/frame:build
# → Claude implementa la tarea, dice "listo"

/frame:verify-ui
# → abre el navegador a través de Playwright MCP, toma una captura de pantalla
# → compara con la descripción de la tarea
# → PASS: la interfaz coincide con las expectativas
# → FAIL: describe exactamente qué está mal y dónde buscar

# Si algo está mal:
/frame:fast "fix: el botón no se muestra en móvil"
/frame:verify-ui
# → nueva verificación después del fix
```

El comando solo **verifica** — no corrige automáticamente. Si encuentra un problema, lo describe con precisión: qué elemento, qué comportamiento, qué se esperaba.

**Verificación automática**: en `/frame:build`, `/frame:fast`, `/frame:wave` y `/frame:debug` — si la tarea toca archivos de UI (`.tsx`, `.vue`, `.css`, `component`, `page`) — la verificación del navegador se ejecuta automáticamente después de los quality gates.

**Requiere Playwright MCP** — se añade automáticamente en `npx the-frame-ai init` o `npx the-frame-ai update` si respondes "y" a la pregunta sobre proyecto frontend.

### Seguridad: auditoría antes del lanzamiento

```
/frame:daily
# → el briefing muestra: "Security: ⚠️ never run" — hora de solucionarlo

/frame:security
# → escaneo completo del proyecto en todas las categorías:
#   - secretos: claves AWS, tokens GitHub, claves Stripe, claves privadas, .env en git
#   - OWASP Top 10: inyección SQL, XSS, CSRF, path traversal, SSRF, inyección de comandos
#   - infraestructura: Dockerfile (usuario root, :latest), endpoints de debug
#   - IA/LLM: inyección de prompts, manejo inseguro de salida, filtración de system prompt
#   - dependencias: CVEs conocidos via npm audit

# → informe guardado en .planning/reports/security/security-{date}.md
# → STATE.md actualizado con Security Status

# Si hay hallazgos CRITICAL o HIGH:
# ⛔ Ship BLOQUEADO. Ejecuta /frame:security-fix para corregir los hallazgos críticos.

/frame:security-fix
# → lee el último informe y corrige hallazgos por prioridad:
#   CRITICAL primero, luego HIGH
#   - elimina .env del seguimiento de git (git rm --cached)
#   - añade security headers faltantes a next.config.js / Express
#   - añade protección CSRF a Route Handlers
#   - ejecuta npm audit fix para dependencias vulnerables
#   - corrige Dockerfile: añade directiva USER, reemplaza :latest
#   - para secretos ya en el historial: explica exactamente cómo rotar + reescribir historial
# → verifica cada corrección después de aplicarla
# → actualiza STATE.md: desbloquea ship si todos los CRITICAL están resueltos

# Correcciones específicas:
/frame:security-fix critical     # corregir solo CRITICAL
/frame:security-fix high         # corregir solo HIGH
/frame:security-fix SEC-1        # corregir un hallazgo específico por ID

/frame:security
# → volver a ejecutar auditoría para confirmar que todo está limpio

# Si todo está limpio:
# ✓ Sin problemas críticos. Seguro para continuar con /frame:ship.

/frame:ship
# → verificación de seguridad superada, commit y push

# Escaneos específicos cuando sabes qué buscar:
/frame:security secrets          # solo secretos (~30 segundos)
/frame:security src/api/         # escanear directorio específico
```

```
/frame:daily

/frame:perf-audit
# → detecta el stack (Next.js + PostgreSQL + Redis, etc.)
# → busca problemas conocidos actuales para ese stack exacto
# → escaneo profundo: consultas N+1, fugas de memoria, operaciones bloqueantes,
#   cabeceras de caché faltantes, causas de re-renders, tamaño del bundle
# → informe guardado en .planning/reports/performance/PERF_REPORT.md
#   con prioridades Critical/High/Medium/Low y estimaciones de esfuerzo

# Ejemplo de salida:
# Critical: 2 | High: 4 | Medium: 3 | Low: 1
# [PERF-1] Consulta N+1 en /api/users — 47 consultas DB extra por request (S)
# [PERF-2] setInterval sin cleanup en Dashboard — fuga de memoria (XS)

/frame:perf-fix
# → lee PERF_REPORT.md, empieza con Critical
# → para cada problema muestra:
#   --- BEFORE ---
#   const users = await db.findMany()
#   --- AFTER ---
#   const users = await db.findMany({ select: { id, name, email } })
# → pregunta: Apply this fix? [y/n/skip]
# → aplica, ejecuta typecheck + tests, revierte si falla

# Correcciones específicas:
/frame:perf-fix PERF-1      # corregir un problema
/frame:perf-fix high        # corregir todos los High
/frame:perf-fix all         # corregir Critical + High

/frame:perf-audit
# → volver a ejecutar para confirmar mejoras
```

## Qué incluye

FRAME proporciona:

- **Flujo de trabajo de 6 fases**: Investigar → Planificar → Construir → Revisar → Publicar → Reflexionar
- **37 comandos**: desde tareas rápidas hasta el ciclo completo de desarrollo de funcionalidades
- **7 agentes de IA**: Investigador, Planificador, Constructor, Revisor, Abogado del Diablo, Seguridad, Auditor de Rendimiento
- **Safety Hooks**: bloquean operaciones destructivas, aplican quality gates
- **Git Safety**: checkpoints, rollback, worktrees, pausa/reanudación
- **Auditoría de seguridad**: OWASP Top 10, detección de secretos, verificaciones de infraestructura, riesgos de IA/LLM

## Requisitos previos

- Node.js >= 18
- Git (el proyecto debe ser un repositorio git)

## Inicio rápido

```bash
# Inicializar repositorio git si es necesario
git init && git commit --allow-empty -m "init"

# Instalar FRAME
npx the-frame-ai init

# Abrir Claude Code en este proyecto y ejecutar:
/frame:init    # escanea la base de código, rellena MAP.md
/frame:daily   # tu punto de entrada cada día
```

## Comandos

### Núcleo — empieza aquí

Estos 7 comandos cubren el 90% del trabajo de desarrollo en solitario:

| Comando | Cuándo usarlo |
|---------|--------------|
| `/frame:daily` | **Empieza aquí** después de cualquier pausa — qué se hizo, qué sigue |
| `/frame:research <tema>` | Antes de planificar una nueva funcionalidad |
| `/frame:plan <funcionalidad>` | Convertir la investigación en una lista de tareas accionable |
| `/frame:build` | Implementar 1–3 tareas con TDD (secuencial) |
| `/frame:wave` | Implementar 4+ tareas independientes (subagentes paralelos) |
| `/frame:wave-team` | Como wave, pero con equipo de revisión después de cada tarea |
| `/frame:review` | Antes de desplegar — verificaciones automatizadas + lista de comprobación |
| `/frame:ship` | Commit, push/PR opcional, actualizar memoria |

### Todos los comandos por fase

<details>
<summary>Investigar</summary>

| Comando | Cuándo usarlo |
|---------|--------------|
| `/frame:research <tema>` | Antes de planificar una nueva funcionalidad |
| `/frame:explain <archivo>` | ¿Por qué este código tiene este aspecto? |
| `/frame:why <tema>` | Buscar historial de decisiones |
| `/frame:arch <módulo>` | Documentar la arquitectura de un módulo en `docs/arch/{módulo}.md` |
</details>

<details>
<summary>Planificar</summary>

| Comando | Cuándo usarlo |
|---------|--------------|
| `/frame:plan <funcionalidad>` | Convertir la investigación en una lista de tareas accionable |
| `/frame:add-task` | Añadir una tarea al plan sin interrumpir el trabajo |
</details>

<details>
<summary>Construir</summary>

| Comando | Cuándo usarlo |
|---------|--------------|
| `/frame:build` | Implementar el plan con TDD (1–3 tareas, secuencial) |
| `/frame:wave` | Implementar 4+ tareas independientes en lotes paralelos |
| `/frame:wave-team` | Como wave, pero con equipo de revisión después de cada tarea |
| `/frame:fast <tarea>` | Tarea rápida de menos de 30 minutos |
| `/frame:debug <problema>` | Investigación sistemática de bugs |
| `/frame:forensics` | Análisis profundo de por qué algo se rompió |
| `/frame:refactor` | Refactorizar con red de seguridad TDD |
| `/frame:migrate` | Migración de DB/API/deps con plan de rollback |
</details>

<details>
<summary>Revisar</summary>

| Comando | Cuándo usarlo |
|---------|--------------|
| `/frame:review` | Antes de desplegar — verificaciones automatizadas + lista de comprobación |
| `/frame:security` | Auditoría de seguridad profunda: secretos, OWASP, infraestructura, riesgos IA/LLM |
| `/frame:security-fix` | Corregir hallazgos del último informe de seguridad (CRITICAL primero, luego HIGH) |
| `/frame:perf-audit` | Auditoría de rendimiento profunda: detecta stack, investiga problemas actuales, escribe PERF_REPORT.md |
| `/frame:perf-fix` | Corregir problemas de PERF_REPORT.md — muestra antes/después, pide confirmación por fix |
| `/frame:health` | Verificación completa del estado del proyecto |
| `/frame:check-deps` | Auditoría de seguridad + paquetes desactualizados |
| `/frame:performance` | Auditoría de tamaño de bundle y Lighthouse |
</details>

<details>
<summary>Publicar</summary>

| Comando | Cuándo usarlo |
|---------|--------------|
| `/frame:ship` | Commit, push/PR opcional, actualizar memoria |
| `/frame:checkpoint` | Guardar una etiqueta git antes de un cambio arriesgado |
| `/frame:rollback` | Volver a un checkpoint |
</details>

<details>
<summary>Reflexionar</summary>

| Comando | Cuándo usarlo |
|---------|--------------|
| `/frame:retrospective` | Después del despliegue — actualizar memoria y métricas |
| `/frame:sprint-check` | Progreso semanal vs. roadmap |
| `/frame:cleanup-memory` | Recortar y archivar memoria obsoleta |
</details>

<details>
<summary>Diario y Utilidades</summary>

| Comando | Cuándo usarlo |
|---------|--------------|
| `/frame:daily` | Inicio del día — qué se hizo, qué sigue |
| `/frame:status` | Volcado completo de estado (git, memoria, bloqueadores) |
| `/frame:note` | Capturar un patrón, decisión o anti-patrón |
| `/frame:unstuck` | ¿Atascado? Obtener 3 opciones concretas para desbloquear |
| `/frame:context` | Mostrar el contexto de trabajo actual |
| `/frame:init` | Primera ejecución — escanear base de código, rellenar MAP.md |
| `/frame:doctor` | Verificar la instalación de FRAME |
| `/frame:pause` / `/frame:resume` | Guardar y restaurar el estado a mitad de tarea |
</details>

<details>
<summary>Avanzado</summary>

| Comando | Cuándo usarlo |
|---------|--------------|
| `/frame:worktree` | Worktree git aislado para experimentos paralelos |
| `/frame:headless` | Modo CI autónomo (sin interacción) |
| `/frame:estimate <tarea>` | Estimación de alcance y tiempo antes de empezar |
</details>

## Hooks

FRAME instala 4 hooks en `.claude/hooks/`. Se ejecutan automáticamente.

| Hook | Disparador | Qué hace | Para desactivar |
|------|-----------|----------|----------------|
| `safety-net.sh` | Antes de Bash | Bloquea `rm -rf` y `DROP TABLE/DATABASE` | Eliminar de `.claude/settings.local.json` |
| `git-safety.sh` | Antes de Bash | Bloquea force push, `reset --hard`, advierte sobre `git add -A` | Eliminar de `.claude/settings.local.json` |
| `quality-gate.sh` | Después de escribir archivo | Ejecuta typecheck + lint en el archivo modificado | Eliminar de `.claude/settings.local.json` |
| `session-init.sh` | Inicio de sesión | Muestra la fase/tarea actual; volcado completo de contexto si ausente > 24h | Eliminar de `.claude/settings.local.json` |

## Configuración

FRAME se configura mediante `.frame/config.json`. Configuraciones clave:

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
npx the-frame-ai init [target-dir]     # Instalar FRAME
npx the-frame-ai update [target-dir]   # Actualizar comandos, agentes, hooks
npx the-frame-ai doctor [target-dir]   # Verificar el estado de la instalación
npx the-frame-ai version               # Mostrar versión del CLI
```

`update` solo actualiza comandos, agentes y hooks. Los archivos del proyecto (STATE.md, MAP.md, memory/, etc.) nunca se sobreescriben.

## Estructura del proyecto (después de la instalación)

```
.claude/
  commands/          # 35 comandos FRAME
  agents/            # 6 agentes de IA
  hooks/             # 4 safety hooks
.frame/
  config.json        # Configuración de FRAME
.planning/
  STATE.md           # Posición actual
  MAP.md             # Mapa del proyecto
  ROADMAP.md         # Hoja de ruta
  memory/            # Memoria del proyecto
  specs/             # Especificaciones de funcionalidades
  reviews/           # Resultados de revisiones
  reports/           # Informes (diario, deps, calidad, sprint, seguridad)
```

## Licencia

MIT
