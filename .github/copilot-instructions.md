# Copilot Instructions - alarm-clock

## Overview
Single-page Angular 15 app (`alarm-clock/`) showing a live clock with alarms (add, toggle, delete, snooze). Alarms persist in `localStorage`; ringing uses Web Audio, an in-page modal and the Notifications API. No backend, no routing. Details: `documentation/ARCHITECTURE.md`.

## Core Philosophy and Critical Rules
- Keep it small and simple; match the existing style rather than introducing new frameworks.
- Stack is Angular ^15.2 / TypeScript ~4.9 / RxJS ~7.8 / zone.js ~0.12. Do not use newer-Angular APIs (signals-first, `@if`/`@for`, standalone bootstrap) unless asked to upgrade.
- App is NgModule-based: declare new components/pipes/directives in `src/app/app.module.ts`.
- TypeScript is `strict` with Angular `strictTemplates`; code must compile cleanly.
- Every `setInterval`/audio resource must be cleaned up in `ngOnDestroy`.
- Every alarm mutation must call `save()`; keep the `lastFired` de-dupe logic intact.
- No tests exist yet. Do not claim tests pass; when adding behavior, add `*.spec.ts` (Jasmine/Karma) beside the source.
- Do not invent scripts or directories (no `validation/` dir, no CI config, no e2e setup).

## Project Structure
```
alarm-clock/
  angular.json, package.json, tsconfig*.json, .editorconfig
  src/main.ts              bootstrapModule(AppModule)
  src/index.html, styles.css
  src/app/app.module.ts    NgModule (BrowserModule, FormsModule)
  src/app/app.component.*  all logic, template, styles
```

## Quick Commands (run from `alarm-clock/`)
- `npm install`
- `npm start` - `ng serve`, http://localhost:4200/
- `npm run build` - `ng build` (production default, output `dist/alarm-clock`)
- `npm run watch` - `ng build --watch --configuration development`
- `npm test` - `ng test` (Karma + Jasmine, needs Chrome; no specs currently)

## Key Patterns and Conventions
- One smart `AppComponent` with direct state mutation; template-driven forms via `[(ngModel)]`.
- Timer: `window.setInterval(tick, 1000)` updates `now` and checks due alarms (`HH:mm` match, enabled, `lastFired` stamp differs).
- Alarm time is stored 24h `"HH:mm"`; display uses `format()` (12h AM/PM).
- `localStorage` key `alarm-clock.alarms`; snooze = new alarm at now + 5 min (`SNOOZE_MINUTES`).
- Call `unlockAudio()` from user-gesture handlers (browser autoplay policy).
- Formatting (`.editorconfig`): UTF-8, 2-space indent, single quotes in `.ts`, final newline, trim trailing whitespace.
- Schematics use `skipTests: true`; component prefix is `app`.
