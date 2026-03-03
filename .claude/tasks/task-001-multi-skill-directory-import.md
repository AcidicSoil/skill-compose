# Task: Multi-Skill Directory Import (Backend + Frontend)

## Metadata

- **Task ID:** task-001
- **Created:** 2026-02-26
- **Last Updated:** 2026-02-26
- **Related Epic/Feature:** skill-composer folder upload enhancement
- **Priority:** P1

## Status

Draft

---

## Objective

**As a** skill library maintainer,
**I want** to upload a parent directory containing multiple skill subfolders in one action,
**so that** I can bulk import many skills without repeating single-folder imports.

---

## Acceptance Criteria

1. Add a new backend endpoint `POST /api/v1/registry/import-directory` that accepts multiple uploaded files, groups them by skill folder, and imports each valid skill folder (folder must contain `SKILL.md`).
2. Reuse existing single-skill import behavior via `_do_skill_import` so conflict handling and persisted skill/version/file behavior remain consistent.
3. Support `check_only=true` for bulk mode and return per-skill conflict/readiness information without creating records.
4. Frontend auto-detects upload mode:
   - single-skill folder (`<root>/SKILL.md`) keeps current flow (`/import-folder`)
   - multi-skill directory (`<parent>/<skill>/SKILL.md`) uses new `/import-directory` flow
5. Frontend exposes a global conflict strategy selector for bulk uploads (`skip`, `copy`, `overwrite`) and sends it as `conflict_action`.
6. Frontend shows a bulk result summary with per-skill rows (imported/skipped/conflict/failed).
7. Existing single-skill folder upload behavior remains backward compatible.
8. i18n strings are added/updated for new bulk mode labels, conflict strategy labels, and bulk result messaging in supported locales.

---

## Context (Embedded from Architecture)

### Previous Task Insights

- No prior task specs exist in `.claude/tasks`; this is the initial planning task in the BMAD workflow for this repository.
- Existing import architecture already centralizes persistence in `_do_skill_import`, which should be reused rather than duplicated.

[Source: .claude/tasks (empty on 2026-02-26), app/api/v1/registry.py#_do_skill_import]

### Data Models

- Current import response model:
  - `ImportSkillResponse` includes `success`, `skill_name`, `version`, `message`, optional conflict metadata and `skipped_files`.
- Bulk import requires new response contracts:
  - `BulkImportResultItem` (per skill) and `BulkImportResponse` (aggregated counts + per-skill results), as defined in the linked Notion spec.

[Source: app/api/v1/registry.py#ImportSkillResponse, https://www.notion.so/313b3b1d967480c3a5c0d79199f0618c]

### API Specifications

- Existing endpoints:
  - `POST /api/v1/registry/import` for `.skill/.zip` upload.
  - `POST /api/v1/registry/import-folder` for one folder upload (`SKILL.md` required at folder root).
- New endpoint to add:
  - `POST /api/v1/registry/import-directory`
  - Input: `files: List[UploadFile]`, optional `check_only`, optional `conflict_action`.
  - Behavior:
    - parse relative paths
    - group by second path segment for `<parent>/<skill>/...`
    - keep only groups with `SKILL.md`
    - for each valid group, call `_do_skill_import` (or return readiness/conflict result in `check_only` mode)
  - Output:
    - `results[]` per-skill status
    - `total_imported`, `total_skipped`, `total_failed`

[Source: app/api/v1/registry.py#import_skill, app/api/v1/registry.py#import_skill_from_folder, app/api/v1/registry.py#_do_skill_import, https://www.notion.so/313b3b1d967480c3a5c0d79199f0618c]

### Component Specifications

- `FolderImportTab` currently:
  - validates only single-skill shape by checking for `parts.length === 2 && parts[1] === SKILL.md`
  - calls only `/api/v1/registry/import-folder`
  - uses per-upload conflict dialog callback pattern (`onConflict` + `onResolveConflict`).
- `ImportResultDisplay` currently expects one `ImportResult`; no bulk visualization exists.
- Multi-skill UX requirements from spec:
  - mode detection (`single` vs `multi` vs `invalid`)
  - detected skill list preview in multi mode
  - global conflict strategy selector in multi mode
  - bulk result display table/status summary.

[Source: web/src/components/import/folder-import-tab.tsx, web/src/components/import/import-result-display.tsx, https://www.notion.so/313b3b1d967480c3a5c0d79199f0618c]

### File Locations

- Backend:
  - `app/api/v1/registry.py` (new models + endpoint)
- Frontend:
  - `web/src/components/import/folder-import-tab.tsx` (mode detection, routing, multi flow UI)
  - `web/src/components/import/import-result-display.tsx` (bulk result types + renderer)
  - `web/src/components/import/conflict-dialog.tsx` (ensure compatibility when folder source uses global strategy in multi mode)
- i18n:
  - `web/src/i18n/locales/en-US/import.json`
  - `web/src/i18n/locales/zh-CN/import.json`
  - `web/src/i18n/locales/es/import.json`
  - `web/src/i18n/locales/ja/import.json`
  - `web/src/i18n/locales/pt-BR/import.json`
- Optional API helper consistency:
  - `web/src/lib/api.ts` (if shared transfer API is extended for import-directory)

[Source: app/api/v1/registry.py, web/src/components/import/folder-import-tab.tsx, web/src/components/import/import-result-display.tsx, web/src/i18n/locales/*/import.json, web/src/lib/api.ts]

### Testing Requirements

- Backend tests:
  - endpoint contract tests for `/import-directory`
  - path grouping behavior tests
  - `check_only` conflict/readiness tests
  - mixed-result aggregation tests (imported/conflict/failed)
- Frontend tests:
  - mode detection unit tests for file path depth logic
  - integration/component tests for:
    - single-mode preserving existing flow
    - multi-mode route to `/import-directory`
    - conflict strategy parameter forwarding
    - bulk result rendering.
- Regression checks:
  - single folder import unchanged
  - file and GitHub import tabs unaffected.

[Source: app/api/v1/registry.py#import_skill_from_folder, web/src/components/import/folder-import-tab.tsx, web/src/components/import/import-result-display.tsx]

### Technical Constraints

- Reuse `_do_skill_import` to avoid duplicating persistence and conflict logic.
- Existing `_do_skill_import` only supports conflict action `'copy'`; adding `'skip'`/`'overwrite'` for bulk mode may require explicit branching in new endpoint (or extension inside `_do_skill_import`) with clear behavior docs.
- Path normalization and grouping must handle both slash variants and malformed paths safely.
- Maintain compatibility with existing client behavior and response parsing for single import.
- The BMAD config references `docs/architecture.md`, `docs/standards.md`, and `docs/patterns.md`, but these files are absent; implementation must rely on concrete code behavior and this task spec as source of truth.

[Source: app/api/v1/registry.py#_do_skill_import, app/api/v1/registry.py#import_skill_from_folder, web/src/components/import/folder-import-tab.tsx, .claude/config.yaml]

---

## Tasks / Subtasks

- [ ] **Task 1: Define bulk import contracts and endpoint skeleton** (AC: 1, 3)
  - [ ] Add `BulkImportResultItem` and `BulkImportResponse` models in `app/api/v1/registry.py`.
  - [ ] Add `@router.post("/import-directory", response_model=BulkImportResponse)` with request params mirroring existing import patterns.
  - [ ] Add argument parsing/validation for `files`, `check_only`, and `conflict_action`.
  - [ ] Add docstring describing supported directory shape and behavior.
  - [ ] Write backend unit/API tests for endpoint registration and base request validation.
  - [ ] Validate Task 1 implementation.

- [ ] **Task 2: Implement multi-folder parsing and skill bucketing** (AC: 1)
  - [ ] Parse uploaded relative paths safely (`\` to `/` normalization).
  - [ ] Group files by skill folder for `<parent>/<skill>/<...>` shape.
  - [ ] Identify valid skill buckets by presence of `SKILL.md` (case-insensitive).
  - [ ] Extract optional `schema.json` and `manifest.json` per bucket where present.
  - [ ] Preserve skip-filter behavior consistent with existing import-folder/zip logic.
  - [ ] Write tests for grouping edge cases and SKILL.md detection.
  - [ ] Validate Task 2 implementation.

- [ ] **Task 3: Implement per-skill execution + check_only behavior** (AC: 2, 3)
  - [ ] For `check_only=true`, evaluate each bucket and return per-skill readiness/conflict without writes.
  - [ ] For import mode, invoke `_do_skill_import` per bucket and collect result rows.
  - [ ] Ensure robust error isolation so one skill failure does not abort all results.
  - [ ] Return aggregated totals (`total_imported`, `total_skipped`, `total_failed`) deterministically.
  - [ ] Write tests for mixed outcomes (success/conflict/failure in one request).
  - [ ] Validate Task 3 implementation.

- [ ] **Task 4: Resolve bulk conflict strategy semantics** (AC: 5)
  - [ ] Define behavior for `conflict_action=skip|copy|overwrite` in bulk flow.
  - [ ] Implement explicit `skip` and `overwrite` behavior in endpoint path or extend `_do_skill_import` safely.
  - [ ] Keep legacy single import behavior unchanged.
  - [ ] Add tests for each conflict strategy path.
  - [ ] Document semantics in endpoint comments and error messages.
  - [ ] Validate Task 4 implementation.

- [ ] **Task 5: Add frontend mode detection and request routing** (AC: 4, 7)
  - [ ] Replace `hasSkillMd` single-depth check with mode detection helper in `folder-import-tab.tsx`.
  - [ ] Detect:
    - single mode via `<folder>/SKILL.md`
    - multi mode via `<parent>/<skill>/SKILL.md`
    - invalid otherwise.
  - [ ] Route `check_only` + import calls to `/import-folder` for single and `/import-directory` for multi.
  - [ ] Ensure selected folder/drag-drop flow still works for both modes.
  - [ ] Add frontend tests for mode detection and endpoint routing.
  - [ ] Validate Task 5 implementation.

- [ ] **Task 6: Add multi-mode UX for skill preview and conflict strategy** (AC: 5)
  - [ ] Add detected skills preview list in `FolderImportTab` when mode is multi.
  - [ ] Add global conflict strategy selector (`skip`, `copy`, `overwrite`) shown only in multi mode.
  - [ ] Send selected strategy via `conflict_action` query param in both check/import calls for multi mode.
  - [ ] Keep existing conflict dialog path only for single mode to avoid per-skill modal loops.
  - [ ] Add component tests for selector behavior and payload propagation.
  - [ ] Validate Task 6 implementation.

- [ ] **Task 7: Implement bulk result rendering and i18n updates** (AC: 6, 8)
  - [ ] Add `BulkImportResult` type and UI component (table/list) to `import-result-display.tsx`.
  - [ ] Render status color coding and summary counts.
  - [ ] Update `folder-import-tab.tsx` to render bulk result component when multi mode returns bulk payload.
  - [ ] Add locale keys for new copy in all existing import locale files.
  - [ ] Add tests/snapshots for bulk result rendering.
  - [ ] Validate Task 7 implementation.

- [ ] **Task 8: Final regression + validation pass** (AC: 1-8)
  - [ ] Run backend and frontend test suites relevant to import features.
  - [ ] Manually verify:
    - single folder import unaffected
    - multi folder import happy path
    - mixed conflict outcomes
    - strategy behaviors.
  - [ ] Confirm no regressions in file and GitHub import tabs.
  - [ ] Update any developer docs/changelog if this repo requires it.
  - [ ] Validate all acceptance criteria one-by-one with evidence.

- [ ] **Final Validation**
  - [ ] All acceptance criteria verified
  - [ ] All tests passing (backend + frontend)
  - [ ] Code follows current project conventions
  - [ ] i18n keys added for all supported import locales
  - [ ] Existing single import paths preserved

---

## Validation

- Endpoint checks:
  - `POST /api/v1/registry/import-directory?check_only=true` returns `BulkImportResponse`.
  - `POST /api/v1/registry/import-directory` handles mixed valid/invalid skill buckets.
- Behavior checks:
  - Single-skill folder upload still uses `/import-folder`.
  - Multi-skill directory upload uses `/import-directory`.
  - Conflict strategy produces expected behavior for `skip|copy|overwrite`.
- UI checks:
  - Multi mode preview shows detected skill names.
  - Bulk summary and per-skill statuses render correctly.
- Source-of-truth checks:
  - Implementation aligns with Notion spec page details.

[Source: https://www.notion.so/313b3b1d967480c3a5c0d79199f0618c, app/api/v1/registry.py, web/src/components/import/folder-import-tab.tsx]

---

## Implementation Record

### Agent Model Used

TBD

### Debug Log References

TBD

### Completion Notes

TBD

### Files Modified

TBD

### Testing Results

TBD

---

## Quality Review

Pending
