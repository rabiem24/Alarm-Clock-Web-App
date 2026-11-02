---
project: Alarm-Clock-Web-App (clock-timer-sample)
stack: Angular
test_runner: Karma + Jasmine
coverage_tool: Istanbul (karma-coverage)
date_created: 2026-11-02
last_updated: 2026-11-02
baseline_coverage: 0% (assumed; no coverage report could be produced, see Baseline)
target_coverage: 80%
---

# Test Coverage Booster Plan: Alarm-Clock-Web-App

## Executive Summary

| Item | Value |
|------|-------|
| **Current Coverage** | 0% (statements). Assumed: the repo has no spec files, so `ng test` cannot run |
| **Target Coverage** | 80% |
| **Gap** | ~104 additional lines (estimate; see Baseline) |
| **Planned Batches** | 3 recommended + 1 optional low-yield batch |
| **Estimated Timeline** | 1-2 sessions |
| **Test Command** | `npx ng test --watch=false --browsers=ChromeHeadless` (run from `alarm-clock/`) |
| **Coverage Command** | `npx ng test --watch=false --code-coverage --browsers=ChromeHeadless` (run from `alarm-clock/`) |

The app has one component (`AppComponent`, 158 lines) that holds all logic, plus a trivial module and bootstrap file, and no tests of any kind. The plan creates the first spec file, then covers `app.component.ts` by behaviour group: pure logic and persistence, then timers/ring/snooze, then Web Audio. All numbers below are estimates until the first real coverage run in Batch 1.

---

## Current Coverage Baseline

The baseline run failed: `ng test --watch=false --code-coverage --browsers=ChromeHeadless` aborted after about 125 s with `TS18003: No inputs were found in config file tsconfig.spec.json` (no `*.spec.ts` files). Karma never started and no `coverage/` output exists. Chrome is installed at `C:\Program Files\Google\Chrome\Application\chrome.exe`, so set `CHROME_BIN` to it if the launcher can't find it.

| Metric | Covered | Total | Percentage |
|--------|---------|-------|------------|
| Statements | 0 | not measured | 0% (assumed) |
| Branches | 0 | not measured | 0% (assumed) |
| Functions | 0 | not measured | 0% (assumed) |
| Lines | 0 | ~130 (estimate, `app.component.ts` non-blank lines excluding comments/imports) | 0% (assumed) |

- **Tests**: 0 passing, 0 failing, 0 skipped (none exist)
- **Execution Time**: n/a (run aborts at compile, about 125 s)
- **Lines needed for 80%**: `ceil(130 × 0.80) − 0` = ~104 additional lines (estimate; re-measure after Batch 1)

Note: Angular 15's Karma setup reports only files pulled in by specs. `main.ts` will not appear in the report unless imported, and `app.module.ts` appears only if a spec imports it. Totals will therefore be roughly `app.component.ts` alone until Batch 4.

---

## Marginal Gain Stop Threshold

- **Minimum worthwhile estimated gain per batch**: 2 percentage points
- **Chosen by**: User (selected the 2-point default)
- **Low-yield batches**: Batch 4 (est. +1-2%). Not approved yet; ask the user before running it.
- **Recommended stopping point**: after Batch 3, at about 80-82% projected coverage

## Prioritized File Analysis

| Rank | File | Lines | Current % | Uncovered | Tier | Impact Score | Has Spec? |
|------|------|-------|-----------|-----------|------|--------------|-----------|
| 1 | alarm-clock/src/app/app.component.ts | 158 | 0% | ~130 | T1 | ~260 (weight 2.0) | No |
| 2 | alarm-clock/src/app/app.module.ts | 18 | 0% | ~6 | T4 | ~6 (weight 1.0) | No |
| 3 | alarm-clock/src/main.ts | 7 | 0% | ~2 | T4 | ~1 (weight 0.5) | No |

**Tier key**: T1 = Quick Win · T2 = High Impact · T3 = Heavy Lift · T4 = Diminishing Returns

`app.component.ts` is T1 because it is under 200 lines at 0% coverage, and all of its dependencies are browser APIs that can be stubbed. Method map (line ranges):

| Method | Lines | Notes |
|--------|-------|-------|
| `ngOnInit` | 30-36 | `load`, 1 s `setInterval`, `Notification` permission branch |
| `ngOnDestroy` | 38-41 | `clearInterval`, `stopSound` |
| `sortedAlarms` (getter) | 43-45 | sorted copy by `time` |
| `addAlarm` | 47-58 | early return on empty time, trims label |
| `toggle` | 60-65 | flips `enabled`, clears `lastFired` |
| `remove` | 67-70 | filter by id |
| `dismiss` | 72-75 | stops sound, clears `ringing` |
| `snooze` | 77-88 | guard on `ringing`; adds alarm 5 min ahead |
| `format` | 90-93 | 12-hour conversion (0, 12, 13 edge cases) |
| `tick` (private) | 95-106 | due-alarm detection, `lastFired` stamp |
| `ring` (private) | 108-114 | `Notification` branch when granted |
| `unlockAudio` (private) | 117-120 | create-once `AudioContext`, resume if suspended |
| `startSound` (private) | 122-137 | `beep` closure + 600 ms interval |
| `stopSound` / `pad` / `save` / `load` (private) | 139-157 | `load` has invalid-JSON `catch` |

---

## Batch Plan

### Batch 1: Foundation, Pure Logic and Persistence (Est. +38-45%)

**Files:**

1. **alarm-clock/src/app/app.component.spec.ts** (new) — `AppComponent` — 158 lines, 0% current
   - **Focus areas**: component creation; `sortedAlarms` ordering and that it does not mutate `alarms`; `format` (0 → `12:00 AM`, 12 → `12:00 PM`, 13 → `1:00 PM`, minute padding); `addAlarm` (empty `newTime` is a no-op, label trimmed, `newLabel` reset, persisted); `toggle` (flips `enabled`, clears `lastFired`); `remove` (removes by id only); `load` (valid JSON, missing key, invalid JSON falls back to `[]`); `save` writes to `alarm-clock.alarms`.
   - **Test strategy**: `TestBed` with `declarations: [AppComponent]` and `imports: [FormsModule]` (the template uses `ngModel`). Stub `localStorage` with `spyOn(localStorage, 'getItem'/'setItem')` or clear the real key in `beforeEach`/`afterEach`. Install the shared `AudioContext` fake (see Shared Test Utilities) because `addAlarm` and `toggle` call `unlockAudio`. Access private members through `(component as any)` only where no public path exists.
   - **Target coverage**: ~50% of the file (~65 new lines)
   - **Estimated gain**: +38-45% overall

**Dependencies / Prerequisites:**
- The spec file must exist before `ng test` can run at all (this resolves the TS18003 failure).
- Create the `AudioContext` fake inside the spec, or in `src/testing/fake-audio.ts` if later batches reuse it.
- After this batch, run the coverage command and replace the assumed baseline in this plan with real numbers.

**Risks:**
- No `karma.conf.js` exists; Angular's built-in default config is used. If `ChromeHeadless` isn't found, set `CHROME_BIN` (see Baseline).
- `Date.now()` is used for alarm ids, so two alarms created in the same millisecond collide. Mock or advance time between adds, or assert on content rather than id.
- The template calls component methods; avoid `fixture.detectChanges()` before the stubs are installed, or `ngOnInit` will start a real interval.

---

### Batch 2: Timer, Ring, Dismiss and Snooze (Est. +25-32%)

**Files:**

1. **alarm-clock/src/app/app.component.spec.ts** (extend) — `AppComponent` — 158 lines, ~50% after Batch 1
   - **Focus areas**: `ngOnInit` (loads saved alarms, starts the 1 s interval, calls `Notification.requestPermission` only when permission is `'default'`, skips when `Notification` is absent or already decided); `ngOnDestroy` (interval cleared, sound stopped); `tick` (updates `now`; returns early while `ringing`; fires an enabled alarm whose `time` equals the current `HH:mm`; does not re-fire in the same minute because of `lastFired`; ignores disabled alarms; ignores non-matching times); `ring` (sets `ringing`; creates a `Notification` only when permission is `'granted'`, using label or the formatted time as body); `dismiss`; `snooze` (no-op when not ringing; adds an alarm ~5 minutes ahead labelled `<label> (snoozed)`, or `Alarm (snoozed)` for an empty label; saves and dismisses; minute/hour rollover near `23:5x`).
   - **Test strategy**: `fakeAsync` with `tick(1000)` and `discardPeriodicTasks()` to drive the interval. Control the clock with `jasmine.clock().mockDate(...)` or `fakeAsync`'s patched `Date` (verify which works on zone.js ~0.12 in the first run). Stub `window.Notification` with a spy constructor that has a settable `permission` and a `requestPermission` spy; restore it in `afterEach`.
   - **Target coverage**: ~80% of the file (~40 new lines)
   - **Estimated gain**: +25-32% overall

**Dependencies / Prerequisites:**
- The `Notification` stub helper (see Shared Test Utilities).
- Batch 1 spec scaffolding and `AudioContext` fake.

**Risks:**
- Interval and `Date` mocking interplay (`jasmine.clock` vs `fakeAsync`) is the most likely source of flaky tests; pick one approach per `describe` block and don't mix them.
- A leaked real `setInterval` from `ngOnInit` can ring during unrelated tests; always call `fixture.destroy()` or `ngOnDestroy` in `afterEach`.
- `ring` calls `startSound`, which needs the `AudioContext` fake already installed.

---

### Batch 3: Web Audio (Est. +8-12%)

**Files:**

1. **alarm-clock/src/app/app.component.spec.ts** (extend) — `AppComponent` — 158 lines, ~80% after Batch 2
   - **Focus areas**: `unlockAudio` (creates the context once and reuses it; calls `resume()` only when `state === 'suspended'`); `startSound` (plays one immediate beep, configures the oscillator as `square` at 880 Hz and gain 0.15, stops it at `currentTime + 0.25`, and repeats every 600 ms); `stopSound` (repeat beeps stop after `dismiss`).
   - **Test strategy**: a fake `AudioContext` class exposing `state`, `currentTime`, `destination`, `resume` (spy), `createOscillator` and `createGain` returning spy objects whose `connect` returns the next node (the code chains `osc.connect(gain).connect(ctx.destination)`). Assign it to `window.AudioContext` in `beforeEach`. Use `tick(600)` inside `fakeAsync` to count repeated beeps.
   - **Target coverage**: ~90% of the file (~14 new lines)
   - **Estimated gain**: +8-12% overall

**Dependencies / Prerequisites:**
- The fake `AudioContext` from Batch 1 should already return chainable node spies; extend it here if it was minimal.

**Risks:**
- Real audio must never play during tests; confirm the fake is installed before any `addAlarm`, `toggle` or `ring` call.
- Assertions on `osc.frequency.value` and `gain.gain.value` require the fake nodes to expose those properties as plain assignable fields.

---

### Batch 4 (OPTIONAL, LOW-YIELD): Module and Template Smoke Tests (Est. +1-2%)

**Files:**

1. **alarm-clock/src/app/app.module.spec.ts** (new) and DOM assertions in `app.component.spec.ts` — `AppModule` / template — 18 lines, 0% current
   - **Focus areas**: `AppModule` compiles when imported; rendered template shows the clock, alarm list, ringing banner, and snooze/dismiss buttons wired to the component.
   - **Test strategy**: `TestBed.configureTestingModule({ imports: [AppModule] })` and `fixture.debugElement.query(By.css(...))` checks after `detectChanges()` with stubs installed. Read `app.component.html` first to pick selectors.
   - **Target coverage**: `app.module.ts` to 100%
   - **Estimated gain**: +1-2% overall

**Dependencies / Prerequisites:**
- Batches 1-3 stubs.

**Risks:**
- This batch is at or below the 2-point threshold. **Ask the user before including it.** Its main value is protecting template wiring, not raw percentage.

---

## Cumulative Coverage Projection

| Batch | Estimated Gain | Cumulative Coverage | Files Addressed |
|-------|----------------|---------------------|-----------------|
| Start | — | 0% (baseline, assumed) | — |
| 1 | +38-45% | ~42% | app.component.spec.ts (new) |
| 2 | +25-32% | ~70% | app.component.spec.ts |
| 3 | +8-12% | **~80-82%** ✅ | app.component.spec.ts |
| 4 (optional, low-yield) | +1-2% | ~82-83% | app.module.spec.ts, template checks |

All figures are estimates and are measured against `app.component.ts` alone. Re-baseline after Batch 1.

---

## Testing Patterns

> Patterns specific to this project's stack. Adapt examples to match actual file paths and class names.

### Angular Component Testing (NgModule app, Jasmine/Karma)

```ts
// PATTERN: TestBed with FormsModule and stubbed browser APIs
// FOLLOW: alarm-clock/src/app/app.component.spec.ts (to be created in Batch 1)
describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(async () => {
    localStorage.removeItem('alarm-clock.alarms');
    (window as any).AudioContext = FakeAudioContext;
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [FormsModule]
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  it('formats midnight and noon', () => {
    expect(component.format('00:05')).toBe('12:05 AM');
    expect(component.format('12:00')).toBe('12:00 PM');
    expect(component.format('13:30')).toBe('1:30 PM');
  });
});
```

```ts
// PATTERN: drive the 1 s interval and verify an alarm fires once per minute
// FOLLOW: Batch 2 in this plan
it('rings a due alarm once per minute', fakeAsync(() => {
  jasmine.clock().mockDate(new Date(2026, 0, 1, 7, 0, 0));
  component.alarms = [{ id: 1, time: '07:00', label: 'Wake', enabled: true }];
  component.ngOnInit();            // starts window.setInterval(tick, 1000)
  tick(1000);
  expect(component.ringing?.id).toBe(1);
  component.dismiss();
  tick(1000);                      // same minute: lastFired blocks a re-ring
  expect(component.ringing).toBeNull();
  component.ngOnDestroy();
  discardPeriodicTasks();
}));
```

### Shared Test Utilities

- **`FakeAudioContext`** (inline in the spec, or `alarm-clock/src/testing/fake-audio.ts`): `state`, `currentTime`, `destination`, `resume` spy, `createOscillator`/`createGain` returning chainable spy nodes. Purpose: silence audio and allow assertions in Batches 1-3.
- **`stubNotification(permission)`** helper (same location): installs a spy constructor on `window.Notification` with a settable `permission` and a `requestPermission` spy, and returns a restore function for `afterEach`.
- **`makeAlarm(overrides?)`** factory: builds an `Alarm` with defaults (`id: 1`, `time: '07:00'`, `label: ''`, `enabled: true`). `Alarm` is not exported from `app.component.ts`, so type the factory locally or export the interface.

---

## Excluded Files

### Deferred (High complexity / diminishing returns)

- **alarm-clock/src/app/app.module.ts** (18 lines, 0%) — Declarative `NgModule` metadata; covered only by the optional low-yield Batch 4.

### Already Well-Covered (>80%)

- None. There are no existing tests.

### Out of Scope

- **alarm-clock/src/main.ts** (7 lines) — Bootstraps the app via `platformBrowserDynamic().bootstrapModule(AppModule)`; not unit-testable without side effects.
- **Generated files** — `dist/`, `node_modules/`; auto-generated, not worth testing.
- **Environment/config files** — `angular.json`, `tsconfig*.json`; runtime configuration, not business logic.
- **CSS/HTML assets** — `styles.css`, `app.component.css`; only template wiring is touched, in Batch 4.

---

## Execution Guidelines

### Workflow Per Batch

1. Create / update spec files for batch targets.
2. Run tests: `npx ng test --watch=false --browsers=ChromeHeadless` — all must pass.
3. Run coverage: `npx ng test --watch=false --code-coverage --browsers=ChromeHeadless` — record actual gain.
4. Commit: `test: boost coverage — Batch N (+X%)`
5. Update this plan with actuals before starting the next batch.

Before Batch 4 (or any batch estimated at or below 2 points), ask the user whether to include it.

### Quality Rules

- Every test must assert something meaningful — no `expect(true).toBe(true)`.
- Test behavior, not implementation — avoid brittle tests tied to internals.
- Cover error and edge paths, not just happy paths (improves branch coverage).
- All tests must pass — never leave failing tests behind.
- No test pollution — each test must be independent; clean up subscriptions, intervals, `localStorage` and global stubs.

### Commands Reference

All commands run from `alarm-clock/`. If Chrome isn't found, set `CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe"`.

| Action | Command |
|--------|---------|
| Run all tests | `npx ng test --watch=false --browsers=ChromeHeadless` |
| Run with coverage | `npx ng test --watch=false --code-coverage --browsers=ChromeHeadless` |
| Run single file | `npx ng test --watch=false --browsers=ChromeHeadless --include="src/app/app.component.spec.ts"` |
| View HTML report | `alarm-clock/coverage/` (open `index.html`; confirm the exact subfolder after the first coverage run) |


## E2E Validation Plan
- [ ] Start the app with `npm start` (from `alarm-clock/`) and open http://localhost:4200/. The current time is displayed and updates every second.
- [ ] Add an alarm for one minute from now with a label. It appears in the list, formatted as 12-hour time with AM/PM, and sorted by time.
- [ ] Add a second, earlier alarm. The list reorders so the earlier time is first.
- [ ] Reload the page. Both alarms are still listed (persisted in `localStorage`).
- [ ] Toggle an alarm off and on. The state changes and survives a reload.
- [ ] Remove an alarm. It disappears and does not return after a reload.
- [ ] Wait for the alarm minute. The ringing state appears with the label and a repeating beep, and a browser notification shows if permission was granted.
- [ ] Click Snooze. The sound stops and a new "(snoozed)" alarm appears about 5 minutes ahead.
- [ ] Ring an alarm again and click Dismiss. The sound stops and the ringing state clears.
- [ ] Anti-criteria: no beep plays before an alarm is due, no console errors, and an alarm does not ring twice in the same minute.
