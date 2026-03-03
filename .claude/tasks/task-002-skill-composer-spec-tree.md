# Task: Skill Composer Spec Tree Implementation

## Metadata

- **Task ID:** task-002
- **Created:** 2026-02-27
- **Last Updated:** 2026-02-27
- **Related Epic/Feature:** skill-composer Notion spec tree (`claude todo` + linked subpage)
- **Priority:** P1

## Status

Approved

---

## Objective

**As a** Skill Composer maintainer,
**I want** to implement the full Notion spec tree for `skill-composer (claude todo)` and its linked subpage,
**so that** the product supports both bulk skill directory import and configurable OpenAI-compatible base URLs.

---

## Acceptance Criteria

1. Add backend support for `POST /api/v1/registry/import-directory` that accepts a parent directory upload, groups files by skill subfolder, and imports each valid skill folder containing `SKILL.md`.
2. Reuse existing per-skill import logic (`_do_skill_import`) for the new bulk import flow so persistence behavior stays aligned with existing import endpoints.
3. Support `check_only=true` for bulk directory import and return per-skill readiness/conflict results without creating skills.
4. Add frontend mode detection so folder uploads distinguish:
   - single skill folder uploads (`<root>/SKILL.md`) routed to `/import-folder`
   - multi-skill parent directory uploads (`<parent>/<skill>/SKILL.md`) routed to `/import-directory`.
5. Add multi-skill frontend UX: detected skill preview, global bulk conflict strategy (`skip`, `copy`, `overwrite`), and bulk result rendering.
6. Preserve existing single-skill folder upload behavior and avoid regressing file or GitHub import flows.
7. Add `OPENAI_BASE_URL` configuration support through `app/config.py` and provider client creation logic in `app/llm/provider.py`.
8. When provider is `openai`, both sync and async OpenAI clients use `get_settings().openai_base_url` when present, otherwise continue using the SDK default.
9. Activation path for `OPENAI_BASE_URL` is documented or made operational through `.env`/runtime env updates, with cache behavior explicitly handled or documented because `get_settings()` is `@lru_cache`-backed.
10. Add or update tests covering both features: bulk directory import and OpenAI base URL override behavior.

---

## Context (Embedded from Architecture)

### Previous Task Insights

- `task-001-multi-skill-directory-import.md` already decomposed the parent page into an 8-task bulk import plan and identified the main reuse point as `_do_skill_import`.
- This new task expands scope to the full Notion spec tree by including the linked `skill-composer (OPENAI_BASE_URL)` subpage.
- There is only one directly linked Notion subpage in the fetched parent page content: `skill-composer (OPENAI_BASE_URL)`.

[Source: .claude/tasks/task-001-multi-skill-directory-import.md, https://www.notion.so/313b3b1d967480c3a5c0d79199f0618c, https://www.notion.so/313b3b1d967480209ffaf33a12dd5ef3]

### Data Models

- Existing import API response shape:
  - `ImportSkillResponse`
    - `success`
    - `skill_name`
    - `version`
    - `message`
    - optional conflict metadata
    - `skipped_files`.
- Bulk import feature requires additional response types:
  - `BulkImportResultItem`
  - `BulkImportResponse`.
- Existing configuration model:
  - `Settings` in `app/config.py` currently contains API keys and runtime path settings but does not define `openai_base_url`.
- Config caching:
  - `get_settings()` is wrapped in `@lru_cache`, so runtime env updates do not automatically refresh existing `Settings` objects.

[Source: app/api/v1/registry.py:1705-1713, app/config.py:20-92, https://www.notion.so/313b3b1d967480c3a5c0d79199f0618c, https://www.notion.so/313b3b1d967480209ffaf33a12dd5ef3]

### API Specifications

- Existing import endpoints:
  - `POST /api/v1/registry/import`
  - `POST /api/v1/registry/import-folder`
  - `POST /api/v1/registry/import-github`
- Existing folder upload semantics:
  - one uploaded folder
  - `SKILL.md` must exist at folder root
  - uses `check_only` and optional `conflict_action`.
- New bulk endpoint from Notion parent page:
  - `POST /api/v1/registry/import-directory`
  - receives `files: List[UploadFile]`
  - groups by subfolder under uploaded parent directory
  - only imports buckets that contain `SKILL.md`
  - returns aggregated counts and per-skill results.
- Settings API:
  - `PUT /api/v1/settings/env` updates `.env` and `os.environ`
  - current implementation does not clear cached settings object.

[Source: app/api/v1/registry.py:1958-2252, app/api/v1/settings.py:249-276, https://www.notion.so/313b3b1d967480c3a5c0d79199f0618c, https://www.notion.so/313b3b1d967480209ffaf33a12dd5ef3]

### Component Specifications

- `FolderImportTab` currently:
  - validates only single-skill upload shape via path depth 2
  - posts only to `/api/v1/registry/import-folder`
  - uses conflict dialog workflow intended for one skill.
- `ImportResultDisplay` currently:
  - renders only a single import success/error payload
  - has no bulk result summary component.
- OpenAI provider client creation:
  - `PROVIDER_BASE_URLS["openai"]` is `None`
  - `_get_openai_client()` and `_get_async_openai_client()` read `base_url` from `PROVIDER_BASE_URLS`
  - there is currently no override path via settings for OpenAI provider.

[Source: web/src/components/import/folder-import-tab.tsx:29-205, web/src/components/import/import-result-display.tsx:9-68, app/llm/provider.py:21-28, app/llm/provider.py:123-183, https://www.notion.so/313b3b1d967480209ffaf33a12dd5ef3]

### File Locations

- Bulk directory import backend:
  - `app/api/v1/registry.py`
- Bulk directory import frontend:
  - `web/src/components/import/folder-import-tab.tsx`
  - `web/src/components/import/import-result-display.tsx`
  - optionally `web/src/components/import/conflict-dialog.tsx`
  - optionally `web/src/lib/api.ts`
- Bulk import copy:
  - `web/src/i18n/locales/en-US/import.json`
  - `web/src/i18n/locales/zh-CN/import.json`
  - `web/src/i18n/locales/es/import.json`
  - `web/src/i18n/locales/ja/import.json`
  - `web/src/i18n/locales/pt-BR/import.json`
- OpenAI base URL support:
  - `app/config.py`
  - `app/llm/provider.py`
  - possibly `app/api/v1/settings.py` if cache invalidation or runtime-refresh behavior is changed.

[Source: app/api/v1/registry.py, web/src/components/import/folder-import-tab.tsx, web/src/components/import/import-result-display.tsx, web/src/i18n/locales/en-US/import.json, app/config.py, app/llm/provider.py, app/api/v1/settings.py]

### Testing Requirements

- Bulk directory import tests:
  - grouping by skill subfolder
  - valid vs invalid buckets
  - `check_only` result behavior
  - conflict strategy coverage
  - mixed import outcomes.
- Frontend tests:
  - mode detection helper
  - route selection for single vs multi
  - conflict strategy query parameter forwarding
  - bulk result rendering.
- OpenAI base URL tests:
  - `Settings` loads `OPENAI_BASE_URL`
  - sync client uses custom base URL for `openai` provider when configured
  - async client uses custom base URL for `openai` provider when configured
  - non-OpenAI providers preserve existing base URL behavior
  - settings update/cache behavior is either tested or explicitly documented.

[Source: app/api/v1/registry.py:1716-1889, app/api/v1/registry.py:2113-2252, web/src/components/import/folder-import-tab.tsx:29-205, app/llm/provider.py:123-183, app/config.py:20-92, app/api/v1/settings.py:249-276]

### Technical Constraints

- `_do_skill_import` currently supports conflict-copy behavior and existing import persistence. New bulk semantics for `skip` and `overwrite` need explicit implementation rather than assumption.
- `PROVIDER_BASE_URLS["openai"]` being `None` currently means OpenAI SDK default behavior; override must not break that fallback.
- `get_settings()` is cached, so writing `OPENAI_BASE_URL` through the Settings API does not by itself guarantee a fresh settings object in already-running code paths.
- `.claude/config.yaml` references architecture docs that are absent (`docs/architecture.md`, `docs/standards.md`, `docs/patterns.md`), so implementation context must rely on code and Notion spec content.

[Source: app/api/v1/registry.py:1777-1805, app/llm/provider.py:21-28, app/config.py:90-92, app/api/v1/settings.py:249-276, .claude/config.yaml]

### Clarifications / Open Questions

- The Notion parent page suggests `_do_skill_import` can be reused unchanged; that is true for per-skill persistence, but `skip` and `overwrite` behaviors are not currently implemented there and will need endpoint-side or helper-side changes.
- The Notion subpage recommends using the Settings API for `OPENAI_BASE_URL`; because settings are cached, implementation should either:
  - clear `get_settings.cache_clear()` after updates, or
  - document restart/unsafe-runtime-refresh limitations clearly.
- No additional linked subpages were found beyond `skill-composer (OPENAI_BASE_URL)`.

[Source: https://www.notion.so/313b3b1d967480c3a5c0d79199f0618c, https://www.notion.so/313b3b1d967480209ffaf33a12dd5ef3, app/config.py:90-92]

---

## Tasks / Subtasks

- [ ] **Task 1: Define full implementation scope from the Notion spec tree** (AC: 1-10)
  - [ ] Confirm parent-page requirements for bulk directory import.
  - [ ] Confirm linked subpage requirements for `OPENAI_BASE_URL`.
  - [ ] Document discovered gaps between Notion suggestions and actual code behavior.
  - [ ] Record the single discovered linked subpage as part of scope.
  - [ ] Validate Task 1 implementation planning.

- [ ] **Task 2: Add backend contracts for bulk directory import** (AC: 1, 3)
  - [ ] Add `BulkImportResultItem` and `BulkImportResponse` to `app/api/v1/registry.py`.
  - [ ] Add endpoint skeleton for `POST /api/v1/registry/import-directory`.
  - [ ] Mirror existing import endpoint parameter style (`check_only`, `conflict_action`, `db` dependency).
  - [ ] Add backend tests for request validation and response model shape.
  - [ ] Validate Task 2 implementation.

- [ ] **Task 3: Implement multi-folder parsing, grouping, and per-skill execution** (AC: 1, 2, 3)
  - [ ] Parse relative upload paths safely and normalize separators.
  - [ ] Group files by skill subfolder under uploaded parent directory.
  - [ ] Detect valid skill buckets by root `SKILL.md`.
  - [ ] Build per-skill `skill_md_content`, optional JSON files, and `other_files`.
  - [ ] Reuse `_do_skill_import` for each valid bucket.
  - [ ] Return per-skill readiness/conflict rows in `check_only` mode.
  - [ ] Add tests for mixed success/conflict/failure flows.
  - [ ] Validate Task 3 implementation.

- [ ] **Task 4: Implement explicit bulk conflict strategy behavior** (AC: 5)
  - [ ] Define exact behavior for `skip`, `copy`, and `overwrite`.
  - [ ] Implement `skip` behavior without throwing whole-request errors.
  - [ ] Implement `overwrite` semantics safely, or formally narrow scope if overwrite is too invasive for this change.
  - [ ] Ensure legacy single-folder import behavior remains unchanged.
  - [ ] Add tests for each strategy path.
  - [ ] Validate Task 4 implementation.

- [ ] **Task 5: Refactor frontend folder import mode detection and routing** (AC: 4, 6)
  - [ ] Replace current single-depth `SKILL.md` detection with a helper that returns `single | multi | invalid`.
  - [ ] Route single-mode uploads to `/import-folder`.
  - [ ] Route multi-mode uploads to `/import-directory`.
  - [ ] Preserve drag/drop and picker-based folder selection flows.
  - [ ] Add tests for mode detection and endpoint routing.
  - [ ] Validate Task 5 implementation.

- [ ] **Task 6: Add multi-skill UX for preview, conflict strategy, and results** (AC: 5, 6)
  - [ ] Add detected skill preview list for multi-mode uploads.
  - [ ] Add global conflict strategy selection UI.
  - [ ] Send `conflict_action` in multi-mode requests.
  - [ ] Add bulk result rendering with aggregate counts and per-skill status rows.
  - [ ] Update locale files with new strings in supported languages.
  - [ ] Add component tests for preview/strategy/results.
  - [ ] Validate Task 6 implementation.

- [ ] **Task 7: Add `OPENAI_BASE_URL` to application settings** (AC: 7, 9)
  - [ ] Add `openai_base_url: str = ""` to `Settings` in `app/config.py`.
  - [ ] Verify environment variable mapping from `OPENAI_BASE_URL` to `openai_base_url`.
  - [ ] Decide whether any supporting docs/comments are needed for env precedence (`config/.env` vs local `.env`).
  - [ ] Write tests or assertions around settings loading if a settings test module exists.
  - [ ] Validate Task 7 implementation.

- [ ] **Task 8: Wire OpenAI base URL override into sync and async provider clients** (AC: 8)
  - [ ] Import `get_settings` in `app/llm/provider.py`.
  - [ ] Update `_get_openai_client()` to override `base_url` when provider is `openai` and `openai_base_url` is set.
  - [ ] Update `_get_async_openai_client()` with the same override logic.
  - [ ] Ensure non-OpenAI providers keep their existing base URL behavior.
  - [ ] Add tests for configured and non-configured OpenAI base URL cases.
  - [ ] Validate Task 8 implementation.

- [ ] **Task 9: Resolve runtime settings refresh behavior for Settings API updates** (AC: 9)
  - [ ] Decide whether `update_env_variable` should clear `get_settings.cache_clear()` after writes.
  - [ ] If yes, implement and test it.
  - [ ] If no, document restart/refresh expectations clearly in API comments or user-facing docs.
  - [ ] Ensure chosen behavior is consistent with Notion activation guidance.
  - [ ] Validate Task 9 implementation.

- [ ] **Task 10: Run final regression, integration, and acceptance validation** (AC: 1-10)
  - [ ] Run backend tests covering registry import and provider configuration paths.
  - [ ] Run frontend tests covering folder import UI.
  - [ ] Manually verify single folder import still works.
  - [ ] Manually verify multi directory import flow.
  - [ ] Manually verify OpenAI provider still defaults correctly when `OPENAI_BASE_URL` is unset.
  - [ ] Validate all acceptance criteria with evidence.

- [ ] **Final Validation**
  - [ ] All acceptance criteria verified
  - [ ] All tests passing for changed areas
  - [ ] Existing single import behavior preserved
  - [ ] Bulk import UX works for multi-skill directories
  - [ ] `OPENAI_BASE_URL` override works for sync + async OpenAI clients
  - [ ] Settings refresh behavior is either implemented or explicitly documented

---

## Validation

- Notion coverage:
  - Parent page requirements are represented in Tasks 2-6.
  - Linked subpage requirements are represented in Tasks 7-9.
- Backend validation:
  - `/api/v1/registry/import-directory` supports validation, grouping, check-only, and results aggregation.
  - import persistence still goes through `_do_skill_import`.
- Frontend validation:
  - single vs multi mode routing is correct
  - preview and bulk result UI render correctly.
- Provider validation:
  - `OPENAI_BASE_URL` set => OpenAI clients use override
  - `OPENAI_BASE_URL` unset => default SDK base URL remains in use.

[Source: https://www.notion.so/313b3b1d967480c3a5c0d79199f0618c, https://www.notion.so/313b3b1d967480209ffaf33a12dd5ef3, app/api/v1/registry.py, app/config.py, app/llm/provider.py]

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
