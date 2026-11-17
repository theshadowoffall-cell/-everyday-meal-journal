# Build state

Implemented: React/TypeScript static app, Today/Library/Progress, shared persistent meal editor, snapshots, copy/edit/delete/undo, transactional optional templates, stable favourite ordering and replacement, workouts/rest/clear, monthly history, local-date reports, revision conflicts, generation-guarded atomic restore, complete JSON photo export, storage limits, speech with manual fallback, lazy real Tesseract English/French with review/cancel, install manifest/icons.

Checks so far: initial production build and type check passed. 12 grouped storage/date/backup/async tests passed. 11 component integration tests passed against fake IndexedDB. Real Tesseract.js Node CPU OCR returned all three synthetic label lines (confidence 93); this is not a browser/iPhone camera test. Subsequent targeted changes added pin/template undo, stricter validation, and modal/restore safeguards; final checks pending.

Corrections made: retained pending typed text across close/reload; retryable failed draft persistence; no new database connection on every React render; hidden editor overlay corrected during discard; current Escape handler for changing modal state; hide Undo behind modal to prevent edits during restore.

Blocked/unverified: no owner-controlled free-host account credentials, so no external deployment or stable HTTPS URL; no real iPhone; managed browser route absent (cua_repl.js unavailable), so no browser layout screenshots, actual width/zoom/keyboard/screen-reader checks, Safari speech/camera/worker checks. Reference board images unavailable; followed written layout. Do not claim these passed.

## Final milestone

Final integrated run completed: 29 tests passed (14 core, 11 UI, 4 additional), TypeScript/Vite build passed, portable-asset/manifest/no-fixtures check passed, real CPU OCR passed. Added per-record mutation tokens so undo refuses even delete/recreate cycles; pending category/date defaults and schema validation centralised. No application changes after the final passing run.

GitHub deployment attempted: authenticated account available, but POST /user/repos returned 403 Resource not accessible by integration. No repository created. Exact owner-run GitHub Pages steps and limits documented in README. Final deliverable output path /codex/... cannot be created (read-only filesystem); packaging retained under /workspace/work/delivery. Browser/device and screenshot verification remain explicitly pending. See VALIDATION.md for evidence and residual differences.


## Repository handoff

Owner supplied https://github.com/theshadowoffall-cell/-everyday-meal-journal . Verified empty/public repository and push access, then uploaded the existing source and production build (main branch, /docs). No application code changed or redundant test rerun performed. Enabling GitHub Pages through API returned 403 Resource not accessible by integration. Owner must select main /docs in Settings → Pages. See DEPLOYMENT.md.


## Live deployment verified

Owner set Pages to main /docs. GitHub reported built; exact HTTPS root and all 18 production assets returned 200 and matched local build hashes. No runtime changes. iPhone and rendered layout checks remain pending.


## App-scale interaction update

User requested disabling zoom. Added viewport scale restrictions, touch-action rules that preserve panning, Safari gesture/multi-touch guards, and 16px file-input text to avoid focus zoom. Device accessibility overrides may still control zoom. TypeScript/Vite production build and portable asset checks passed; native iPhone gesture verification remains pending.

## Calorie feature research

Read primary USDA and Open Food Facts API/licensing pages and recorded initial findings in CALORIE_RESEARCH.md. Implementation, migration, testing and deployment remain outstanding. Production was not changed.

## Calorie calculation groundwork

Added isolated calorie arithmetic and four passing tests for serving-basis calculations, decimals, incomplete totals, malformed inputs and incomplete recipes. Production build passed. These functions are not connected to the UI or storage yet; no calorie features have been deployed. Food catalogue, quantities, daily totals, recipe editor, validation/migration, backup compatibility, integration tests and deployment remain outstanding.

## Calorie interface work in progress

Added a draft interface for user-entered calories per serving and serving quantity; daily and meal rows display known totals and label unknown items as incomplete. Calorie fields are validated on stored meal items. The existing backup envelope can preserve optional item fields. The 33 existing/unit tests passed after an accessible meal-row label update. This is an unfinished local change: catalogue search, reusable food and recipe calorie snapshots, unit/portion workflows, complete backup/migration and UI integration tests, stress tests and deployment remain outstanding. Do not deploy this incomplete slice. Previous build preceded the last accessibility markup edit, so rerun the final build before any deployment.


## Calorie upgrade: local production candidate

Implemented locally: USDA SR Legacy catalogue (7,793 foods, documented whole-portion gram weights), local search, quantities, calories, daily/meal/item totals with incomplete states, custom foods, recipe creation/editing, snapshot preservation, version 2 backup export and version 1 import. Old records are optional-field compatible. Reviewed failures, fixed a rendering refresh race and ambiguous fractional/multi-piece portion calculations. Final TypeScript/Vite build and static asset checks passed; 40 tests passed in six files, including isolated calorie UI, storage, backup and failure simulations. See VALIDATION.md. Real iPhone, native browser rendering/viewport screenshots and device durability remain unverified because supported browser/iPhone access was unavailable. Open Food Facts live search is not integrated; packaged labels can be entered manually. Not deployed: user explicitly requested local work first and will provide GitHub access afterward.


## Automatic voice and scan release

Added independent, persistent Manual/Automatic switches. Automatic voice returns one exact saved match or unambiguous plain transcript to the draft; automatic scan captures a local photo and unreviewed text, extracts calories only with one explicit calorie value and serving, and returns to the draft. Meal saving remains explicit. Cancellation, mode changes, duplicate callbacks, delayed permissions, failures and v2 backup persistence were exercised. Full regression: 51 tests passed, production build and static asset checks passed; real CPU OCR synthetic label passed. Native iPhone speech/camera/OCR and screenshot checks remain unverified. Release candidate includes the prior calorie upgrade.


## Canadian Nutrient File release

Added Canadian Nutrient File 2026 as the first local search source: 5,993 foods and 21,206 unambiguous edible household portions; USDA remains available. Search supports word order, French descriptions and unspaced Frootloops. Added actual energy-update dates and package-label guidance. Government download returned HTTP 403 in the build environment; all 5,993 names/calories/source dates and type-6 portion IDs/weights were cross-checked against an independently built SQLite distribution. Government's 2026 structure guide was used to confirm per-100-g energy and gram conversion semantics. Licence attribution and pinned source hashes are recorded. TypeScript/Vite build, 58 tests, static asset checks and the full source cross-check passed. Existing stored entries are not migrated or rewritten. Native iPhone layout/storage behavior remains unverified.


## Food search relevance update

Ranked Canadian, USDA and saved-food searches by how closely the food name matches the query. Ordinary whole chicken eggs appear before egg sandwiches and restaurants; explicit restaurant searches remain available. Added cached search indexes with invalidation for edited saved-food names. Tested Canadian/USDA queries, French/aliases/plurals, restaurant queries and visible ordering in Library and the meal editor. TypeScript/Vite build, static asset checks and all 67 tests passed. iPhone performance and native-browser interaction remain unverified.


## Serving-based search and calorie goals

Improved prefix/name/portion relevance for app/apple, egg, pizza and pizza slice; default serving uses only documented portion weights, falling back to an explicit 100 g when none is suitable. Removed meal title/notes input controls while preserving legacy fields. Moved daily totals and last completed week/current month averages to Progress; averages use only recorded complete days. Added dated, user-selectable at-or-below/at-or-above goals and accessible calendar dots; unknown and unlogged days are not marked met or missed. Goal preferences are validated and backed up with existing versioned data. Final TypeScript/Vite build, static asset check and 73 automated tests passed. Native iPhone behavior remains unverified.


## Simpler food and calorie display

Removed Type and Notes controls from saved-food editing while retaining stored values. The Aliases control remains pending the user’s explicit continuation. All active favourites can be quick-added on Today; meal and favourite calories appear beside names. Settings chooses the daily, last-week or current-month calorie summary in Progress; the preference is validated and backed up. Unknown meal calories are labelled unknown. Existing zoom restrictions remain in place. Production build and static asset check passed; all 75 automated tests passed, including unpinned favourite saving, old food metadata preservation and preference backup validation. Real iPhone zoom and layout remain unverified.


## Scanner, voice and food-search stress checks

Hardened automatic calorie extraction to reject ambiguous multi-column values, kJ, negative numbers and ambiguous separators. Late speech results after an end event and malformed alternatives are ignored. Search explains empty results and documented serving defaults. Preserved existing food databases, records and aliases. Production build and asset checks passed; 80 automated tests passed with simulated browser speech, scan callbacks, cancellations, failed writes and database-backed drafts. Real Tesseract CPU OCR read a synthetic clear calorie label, rejected a two-column label and left a missing calorie value unknown. These are synthetic images and jsdom/fake IndexedDB checks, not real phone, microphone, camera or native browser tests. Packaged barcode lookup is not integrated.
