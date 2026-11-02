# Architecture - alarm-clock

## 1. Purpose
`alarm-clock` is a small single-page Angular app (generated with Angular CLI 15.2.11) that shows a live 12-hour clock and lets the user create, toggle, delete and snooze alarms. Alarms persist in the browser's `localStorage` and, when due, ring with a Web Audio beep, an in-page modal and (if permitted) a browser Notification. There is no backend.

## 2. Tech Stack
| Item | Version / value | Source |
|---|---|---|
| Angular (core, common, forms, ...) | ^15.2.0 | `alarm-clock/package.json` |
| Angular CLI / build-angular | ~15.2.11 / ^15.2.11 | package.json |
| TypeScript | ~4.9.4 (target/module ES2022) | package.json, tsconfig.json |
| RxJS | ~7.8.0 (declared, not imported in src) | package.json |
| zone.js | ~0.12.0 | package.json |
| tslib | ^2.3.0 | package.json |
| Test: Jasmine / Karma | jasmine-core ~4.5.0, karma ~6.4.0, karma-jasmine ~5.1.0 | package.json |
| Builder | `@angular-devkit/build-angular:browser` | angular.json |
| Styling | Plain CSS (no preprocessor) | angular.json |

## 3. Module Structure
```
clock-timer-sample/
+-- documentation/ARCHITECTURE.md      this file
+-- .github/copilot-instructions.md
+-- alarm-clock/                       the only Angular workspace
    +-- angular.json                   build/serve/test targets, prod budgets
    +-- package.json                   scripts + deps
    +-- tsconfig.json                  strict TS + strictTemplates
    +-- tsconfig.app.json              entry: src/main.ts
    +-- tsconfig.spec.json             includes src/**/*.spec.ts (none exist)
    +-- .editorconfig, .vscode/        2-space indent, single quotes in .ts; launch/tasks
    +-- src/
        +-- main.ts                    bootstrapModule(AppModule)
        +-- index.html                 <app-root>, <base href="/">
        +-- styles.css                 global styles (1 line)
        +-- assets/.gitkeep, favicon.ico
        +-- app/
            +-- app.module.ts          NgModule: BrowserModule, FormsModule
            +-- app.component.ts       ALL logic and state
            +-- app.component.html     template (clock, form, list, modal)
            +-- app.component.css      component styles (41 lines)
```
Local, untracked artifacts present: `node_modules`, `dist`, `.angular`.

## 4. Key Abstractions
- `AppModule` - `alarm-clock/src/app/app.module.ts`. Sole NgModule; declares `AppComponent`, imports `BrowserModule`, `FormsModule`, bootstraps `AppComponent`.
- `AppComponent` (`app-root`) - `alarm-clock/src/app/app.component.ts`. Single component holding state (`now`, `alarms`, `newTime`, `newLabel`, `ringing`), the 1s timer, alarm CRUD, snooze, audio and persistence.
- `Alarm` interface (file-local, not exported) - `id`, `time` ("HH:mm" 24h), `label`, `enabled`, `lastFired?` ("YYYY-MM-DD HH:mm" de-dupe stamp).
- Constants `STORAGE_KEY = 'alarm-clock.alarms'`, `SNOOZE_MINUTES = 5`.
- Template - `alarm-clock/src/app/app.component.html`: `date` pipe, `ngModel`, `*ngFor`, `*ngIf`, class/attr bindings.
- There are no services, routing, state library or other components.

## 5. Request/Data Flow
Clock tick and alarm trigger:
```
ngOnInit -> load() from localStorage
         -> setInterval(tick, 1000)
tick(): now = new Date()  --> template re-renders clock (zone.js change detection)
   if ringing: return
   hm = "HH:mm", stamp = "YYYY-MM-DD HH:mm"
   due = first alarm enabled && time==hm && lastFired!=stamp
   due? -> lastFired=stamp; save(); ring(due)
ring(): ringing=alarm; startSound() (beep now + every 600ms)
        Notification (if permission 'granted')
```
User actions:
```
form submit -> addAlarm(): push {id:Date.now()}, save(), unlockAudio()
toggle(a)   -> flip enabled, clear lastFired, save(), unlockAudio()
remove(a)   -> filter by id, save()
snooze()    -> push new alarm at now+5min labelled "<label> (snoozed)", save(), dismiss()
dismiss()   -> stopSound(); ringing = null
```

## 6. External Interfaces
- Browser `localStorage` key `alarm-clock.alarms` (JSON array of `Alarm`).
- Web Audio API (`AudioContext`, square oscillator 880 Hz, gain 0.15, 0.25s beeps every 600 ms).
- Web Notifications API (`Notification.requestPermission()` on init if permission is `default`).
- No HTTP calls, no routes, no backend.

## 7. Configuration
- `angular.json`: project `alarm-clock`, prefix `app`, output `dist/alarm-clock`, default build config `production` (budgets: initial 500kb warn / 1mb error; component style 6kb warn / 10kb error; output hashing all); serve default config `development`. Schematics set `skipTests: true` for class/component/directive/guard/interceptor/pipe/resolver/service.
- `tsconfig.json`: `strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `experimentalDecorators`, `useDefineForClassFields: false`; Angular `strictTemplates`, `strictInjectionParameters`.
- No `environments/` files, no proxy config, no CI config in repo.
- Dev server `http://localhost:4200/`; VS Code launch configs for `ng serve` and `ng test` (Chrome, test page on port 9876).

## 8. Testing
- Framework: Jasmine + Karma (karma-chrome-launcher, karma-coverage, html reporter); `test` target uses `@angular-devkit/build-angular:karma`; `npm test` script exists.
- Location: `tsconfig.spec.json` expects `src/**/*.spec.ts`. **No spec files are tracked** and no `karma.conf.js` exists (CLI defaults apply).
- Run: from `alarm-clock/`, `npm test` (`ng test`). Needs Chrome. Behavior with zero specs was not verified.
- Gaps: no tests for `AppComponent` (tick/trigger logic, snooze, persistence, `format`), no e2e (README notes `ng e2e` needs an added package). Schematics are configured to skip generating tests.

## 9. Design Patterns & Conventions
- Classic NgModule bootstrap; one smart component with direct state mutation; `sortedAlarms` getter sorts a copy on each change detection.
- Template-driven forms (`FormsModule`, `[(ngModel)]`).
- Helpers are `private`; timer ids are `number` from `window.setInterval`.
- Persistence is write-through: mutations call `save()`.
- Style (`.editorconfig`): 2-space indent, UTF-8, final newline, single quotes in `.ts`.
- Accessibility: `aria-label`s on inputs/buttons, `role="alertdialog"` on the modal.

## 10. Known Gotchas
- Angular 15 with NgModule (`bootstrapModule`), not standalone. New components must be declared in `AppModule`. Newer idioms (`@if`, `bootstrapApplication`) are not used; TypeScript is pinned ~4.9.
- `ngOnDestroy` clears the clock timer and beep interval but does not close the `AudioContext`.
- `tick()` returns early while `ringing`; an alarm due during a ringing alarm fires later only if its minute still matches.
- `ring()` overwrites any current `ringing` value; `Alarm.id` is `Date.now()`, so ids could collide if two alarms are created in the same millisecond.
- `load()` falls back to `[]` on malformed JSON but does not validate shape.
- Alarms are never one-shot: after firing they stay enabled and refire daily; snooze adds a new persistent alarm that is also never removed.
- Browsers block audio before a user gesture; `unlockAudio()` is called on add/toggle only, so an alarm may be silent without prior interaction.
- `Notification.requestPermission()` is called on init without a user gesture; some browsers ignore this.
- `rxjs` is a dependency but unused in app code.
- `alarm-clock/README.md` is CLI boilerplate; there is no root README.
