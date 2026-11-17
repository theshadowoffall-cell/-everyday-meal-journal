# Implemented-program validation

Final regression: **29 tests passed in 3 files**. TypeScript and Vite production build passed. Static bundle/manifest/OCR checks passed. Real Tesseract.js CPU OCR read the synthetic label's three lines exactly. No further feature changes were made after this run.

Environment: managed Linux Cloud workspace `/workspace`, Node 24.22.1, npm 11.9.0, Vitest 3.0.6. Core tests run in Node with fake-indexeddb. UI tests mount the actual React components in jsdom 26, click actual rendered controls and assert stored records as well as visible state. This is **not a full browser or native IndexedDB durability test**. Tests use a controllable clock at 2026-11-15 17:00 UTC, America/Toronto, with the shared specification fixture factory. Production uses the real local clock and has no seeded history.

| Behaviour | Method / observed evidence | Status and limits |
|---|---|---|
| Meal create, edit, copy, delete, undo; compound items; optional library dish; empty input | React controls and storage transactions; IDs, counts and snapshots asserted. Two-tap favourite saved once; a deliberate repeat created another meal. | Passed in jsdom/fake IndexedDB. |
| Repeated Save and drafts | Rapid button taps, parallel duplicate callbacks, close/remount resume, resume/discard choice, interrupted transaction and retry. Pending typed text survived remount. | Passed. Forced transaction failure is simulated. |
| Template/archive/photos and conflicts | Revision conflict rejected; archived/renamed template left historical text intact; detaching photo left snapshot/reference/blob intact. Separate connections model old-tab edits. | Passed in the IndexedDB implementation used by tests. Physical browser tabs remain unverified. |
| Workout/rest/clear and selection | React day selection made no write; workout/rest/clear/undo persisted. One state per date. Future logging rejected. | Passed. |
| Calendar/clock | Monday strip and generated November padding; DST/year/leap-date boundaries; idle midnight advances, open draft date stays fixed. Future imported history stays stored. | Passed logical/UI checks. Device travel and real Safari lifecycle unverified. |
| Reporting | Distinct meal/workout date counts, drafts excluded, archived-food history retained, empty period, future records excluded, completed-week ranges. Baseline Today and Progress agree. | Passed. |
| Storage and reload | New connection and app remount see data. Controlled failure inside real wrapper transaction rolls back and retains input. | Passed simulated storage errors. Real disk quota/eviction and blocked-upgrade UI are implemented but untested. |
| Backup/restore | Encoded photo byte round trip, 24 meals/7 foods/4 referenced photos, invalid JSON/schema/references/size rejected. UI parses counts; Export/Cancel do not replace. Confirmed replacement changes data. Injected transaction failure leaves current records intact. Old-generation writes/undo rejected. | Passed. Browser image decoder is a test double in UI tests; fixture PNG additionally decoded with Pillow. No Safari download/restore test. |
| Speech | Alias and ambiguity matching; visible selected match required; editable transcript fallback; denied permission; repeated/late callback operation guards and cancellation. | Simulated SpeechRecognition. No native microphone/service, Safari, installed-app, real network-loss or on-device-processing claim. |
| OCR | Real Tesseract.js 6.0.1 + bundled English/French resources, Node CPU, synthetic local PNG. Output: `Nutrition Facts\nPer 175 g\nProtein 12 g\n`, confidence 93. UI doubles verify unreviewed state, review reset after edit, cancellation and late-result rejection, library-only save. | Engine passed; browser worker/camera/rotation/HEIC/photo readability/bilingual/multi-column/download-failure flows not observed on an iPhone. Text and photo-only fallbacks are implemented. |
| Accessibility/layout | Focus entry/trap and current Escape callback tested; zero/one/two pins and accessible labels exercised. CSS uses target sizing, internal strip/calendar scrolling, narrow favourite reflow, safe-area padding and visualViewport sizing. | Focus tests passed. **No actual layout screenshots**, 320/390/430 viewport observation, zoom/enlarged text, screen-reader or keyboard reachability verification. |
| Production/portability | TypeScript, Vite, relative asset references, manifest/icons, bundled lazy OCR resources and fixture-exclusion check. No paid runtime/service worker/backend. | Build passed. Deployment verification is recorded in DEPLOYMENT.md. Live HTTPS root and all 18 production assets now pass HTTP 200 and byte-for-byte integrity checks. Native iPhone and screenshot checks remain pending. |

## Exact external and environment blocks

The first attempt to create a repository was blocked by integration permissions. The owner subsequently created and supplied this empty repository; authenticated write access is now available. See `DEPLOYMENT.md` for the result of the subsequent GitHub Pages deployment.

Managed Sites browser QA requires `cua_repl.js`; it was not present, and no corresponding desktop/browser control tool was callable. Per the managed-preview instructions, no alternative browser-control path or preview server was started. jsdom is explicitly not a substitute for the requested rendered screenshot checks. A Chromium executable being present does not establish the supported browser route or iPhone access.

The ChatGPT Library boards were not available as local reference images. The written warm, light, green composition was implemented without claiming pixel comparison.

The client-requested final-output directory below `/codex/browser/.../output` is read-only/non-creatable in this environment. Packaging files were retained under `/workspace/work/delivery/` instead. No broken download links or unverified live URL are supplied.

## Remaining implementation differences

- Undo after a meal save targets the meal. If that save also created a library dish, the reusable dish remains in the library.
- Historical label references are preserved in snapshots and backups, but the meal-details sheet currently displays food text/photos rather than the full saved label-reference panel. The library details display the label reference.
- Removing a photo detaches the current reference; retained historical and unreferenced blobs are not garbage-collected. They remain in complete backups and count against capacity.
- After a restore from another tab, old input is kept for copying and older writes are blocked. Reload is required; there is no merge workflow.

## Device follow-up, in an isolated test profile

Use the same fixture factory and clock for screenshots, never production user records. Capture Today, Library, Progress at normal phone size, plus a 320 px / enlarged-text stress view. Observe 390 and 430 px widths, focus rings, screen-reader names, horizontal containment, last-row reachability, Save with the keyboard open, safe-area padding, and reduced motion. Exercise Safari and installed mode separately for speech permission/error/fallback, camera orientation and unsupported photos, first OCR load/network error/cancel, and JSON downloads/image restore. Confirm the stable HTTPS URL, refresh and all OCR assets before installing. These remain pending, not passed.

## Calorie upgrade local validation

The local upgrade was built against the existing schema with optional validated fields, version 2 backup export, and version 1 and 2 import. Tests use isolated fake IndexedDB and jsdom, never the live database. See BUILD_STATE.md for the final count. The exercised flows include the actual editor selecting the USDA large-egg portion (50 g, 71.5 kcal), persisting and reloading it; temporarily clearing and re-entering a calorie value without losing its serving basis; updating recipe servings without changing a previously logged snapshot; compound/unknown totals; malformed calorie records; v1 and v2 backup round trips; interrupted saves, duplicate callbacks and stale undo after restoration. USDA multi-piece and fractional portions use the full documented gram weight for the complete portion. Rounding is only for display.

The 7,793-item USDA SR Legacy catalogue is bundled locally, attributed and based on the official April 2018 release. Branded-food search from Open Food Facts is not included; enter packaged-label values manually. No live food search or API key is required. No native iPhone or supported rendered-browser route was available, so phone viewport screenshots, keyboard overlap, actual browser storage durability, camera and Home Screen behaviors remain unverified. Voice/OCR and prior data were covered by the existing automated regression suite, not by new device tests. Deployment state is tracked in DEPLOYMENT.md.

## Automatic voice and scan update

Automated component tests cover separate remembered voice/scan modes; exact, ambiguous and delayed voice callbacks; cancellation while microphone permission setup is pending; automatic OCR photo and unreviewed-label persistence in a draft; late scan cancellation; switching back to manual during scanning; and storage failure retaining the scanned text. Parser tests cover explicit metric and household portions and reject missing/ambiguous calories. Those tests use jsdom, fake IndexedDB and explicitly mocked browser recognition/OCR outcomes. The bundled Tesseract engine is also checked with a synthetic label on Node CPU. Native microphone recognition, Safari/Home Screen OCR, camera, keyboard, and device screenshot behavior remain unverified.


## Canadian catalogue update

The Canadian Nutrient File 2026 is searched first, with USDA results separately available. The local generator imports 5,993 foods and 21,206 unambiguous, documented edible portions; it filters refuse and yield and treats measure weights as full grams (not the old 2015 conversion factor). All source names, kcal values, source dates, and measure-type-6 keys/weights were checked against a separately built CNF 2026 SQLite distribution; two source names differed only in trailing whitespace. Exact input hashes and mirror provenance are in `src/data/canada-provenance.json`. Official direct CSV/ZIP downloads returned HTTP 403 in this environment.

Automated tests exercise word-order-independent garlic-naan search, the CNF 7912 value 288.462120365 kcal/100 g and 1-piece weight 100.0667763 g, documented 250 ml applesauce and 1-medium-apple weights from Health Canada's structure guide, rejection of refuse measures, old USDA source resolution, French search, Froot Loops source age, package-label guidance, and Canadian meal persistence/reload/backup. Native iPhone and supported rendered-browser checks remain unverified.

## Search relevance update

Search ranks exact food names and names beginning with the requested food above incidental matches in prepared combinations. Whole eggs are preferred over dried eggs and sandwiches for an ordinary egg search; an explicitly requested restaurant sandwich remains searchable. The same ranking is used for saved foods in Library and the meal editor. Tests cover Canadian and USDA egg results, explicit Burger King searches, garlic naan, French aliases, Froot Loops, plurals, result limits, and visible ordering of saved foods in both screens. Existing item names, calorie values and records are not modified.


## Serving defaults and calorie goals

The meal editor defaults to documented portions when available; 100 g remains the fallback when a documented serving is absent. Search ranks name-prefix and direct matches and supports portion words such as pizza slice. Titles and notes inputs were removed; legacy values remain stored and a UI edit test confirms preservation. Calorie day and average tests exclude unlogged days, incomplete days and future imports. Goal direction is user-selectable (at/below or at/above), stored as dated preferences, included in backups, and evaluated only for complete logged days. Automated UI exercises both directions, the Progress-only daily total, averages, markers and reload. Real iPhone and supported rendered-browser checks remain unverified.


## Scanner, voice and food-search stress checks

Hardened automatic calorie extraction to reject ambiguous multi-column values, kJ, negative numbers and ambiguous separators. Late speech results after an end event and malformed alternatives are ignored. Search explains empty results and documented serving defaults. Preserved existing food databases, records and aliases. Production build and asset checks passed; 80 automated tests passed with simulated browser speech, scan callbacks, cancellations, failed writes and database-backed drafts. Real Tesseract CPU OCR read a synthetic clear calorie label, rejected a two-column label and left a missing calorie value unknown. These are synthetic images and jsdom/fake IndexedDB checks, not real phone, microphone, camera or native browser tests. Packaged barcode lookup is not integrated.
