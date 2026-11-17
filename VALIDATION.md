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
