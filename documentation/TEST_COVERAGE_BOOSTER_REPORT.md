# Test Coverage Booster Report: Alarm-Clock-Web-App

- **Branch**: `test-booster/20261102`
- **Started**: 2026-11-02
- **Plan**: `documentation/TEST_COVERAGE_BOOSTER_PLAN.md`
- **Baseline**: 0% (assumed; no spec files existed, `ng test` aborted with TS18003)
- **Target**: 80% (statements, branches, functions, lines)
- **Marginal-gain threshold**: 2 percentage points (Batch 4 flagged low-yield, needs user approval)

## Batch Results

| Batch | Files | Coverage before | Coverage after | Gain (est. → actual) | Tests | Status |
|-------|-------|-----------------|----------------|----------------------|-------|--------|
| 1 | app.component.spec.ts (new) | 0% | 53.16% stmts / 52.17% lines | +38-45% → +53.2% | 25 pass, 0 fail | done |

### Batch 1 metrics (app.component.ts only; the report includes only files imported by specs)

| Metric | Covered | Total | % |
|--------|---------|-------|---|
| Statements | 42 | 79 | 53.16% |
| Branches | 12 | 25 | 48% |
| Functions | 15 | 23 | 65.21% |
| Lines | 36 | 69 | 52.17% |

| 2 | app.component.spec.ts (extended) | 53.16% stmts | 100% stmts / branches / functions / lines | +46.8% (est. +25-32%) | 54 pass, 0 fail | done |
| 3 | (Web Audio, planned) | 100% | 100% | +0% | n/a | skipped: already covered by Batch 2 (at or below 2-point threshold) |
| 4 | (module/template smoke, optional) | 100% | n/a | est. +1-2% | n/a | not run: low-yield, not approved, target already met |

### Final results (full suite: `npx ng test --watch=false --code-coverage --browsers=ChromeHeadless`)

| Metric | Covered | Total | % |
|--------|---------|-------|---|
| Statements | 79 | 79 | 100% |
| Branches | 25 | 25 | 100% |
| Functions | 23 | 23 | 100% |
| Lines | 69 | 69 | 100% |

- **Tests**: 54 passing, 0 failing, 0 skipped (about 0.65 s in Chrome Headless).
- **Scope caveat**: the coverage report includes only `app.component.ts`. `app.module.ts` and `main.ts` are not imported by any spec, so they are not in the totals (see plan, Excluded Files).
- **Fingerprint**: `"rebarAI": "@rebar/ai:test-booster : 20261102"` added to `alarm-clock/package.json`.

## Issues
- The plan's ~130-line total was an overestimate; Istanbul counts 69 lines / 79 statements in `app.component.ts`. Gain estimates for later batches are re-based on these totals.
- Time mocking in the spec uses `jasmine.clock().mockDate` (not `fakeAsync`) so tests that need a fixed HH:mm do not depend on the real clock.
- Coverage output folder is `alarm-clock/coverage/` (git-ignored).
