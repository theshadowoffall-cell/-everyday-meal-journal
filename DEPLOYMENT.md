# Deployment verified

Live app: https://theshadowoffall-cell.github.io/-everyday-meal-journal/

GitHub Pages publishes `main` /docs with HTTPS enforced. The owner corrected the Pages setting after the integration could not change it. GitHub reported a successful build for commit `8ce1796dde06babe46859f12f8c841d60cd20980`.

Verification recorded 2026-11-17T04:45:50.111479+00:00: the exact public root URL returned HTTP 200 with production HTML. All 18 application assets (HTML, JS, CSS, manifest, icons, worker, WASM engines and English/French OCR data) returned HTTP 200 and byte-for-byte SHA-256 matches against the validated production bundle. MIME types were appropriate for scripts, styles, manifest, images and WASM.

These are live HTTP/asset checks, not a rendered-browser or iPhone test. Native Safari/Home Screen speech, camera, OCR worker execution, downloads, storage durability, keyboard and screenshot checks remain outstanding as described in VALIDATION.md. No application code changed during deployment.

Open the live URL in Safari, then Share → Add to Home Screen. Keep this origin stable and export local records regularly. Personal records remain in each visitor's browser; they are not in the public repository.


## Zoom interaction update

Viewport scaling, pinch and double-tap gestures are restricted at the user’s request. One-finger scrolling stays enabled. Safari gesture guards supplement viewport/CSS controls; device accessibility overrides can still apply. TypeScript, production build and asset checks passed. Real iPhone gesture testing remains unverified.


## Automatic input release

The current release candidate adds independent saved Manual/Automatic settings for voice and scan, conservative unreviewed calorie extraction, and historical label viewing. It also includes the previously prepared calorie upgrade. GitHub Pages publishes from main /docs. Final regression: 51 tests, production build and asset checks passed; iPhone-specific functionality is unverified.


## Canadian Nutrient File release candidate

Search now prioritizes the local Health Canada CNF 2026 dataset, with USDA results below. The source is attributed under the Open Government Licence – Canada. Database integrity and 2026 measure semantics were cross-checked as described in VALIDATION.md; the direct government download was blocked in the build environment, so a pinned mirror and independent second distribution were used. Full build and asset checks passed, as did 58 automated tests. Real iPhone behavior remains unverified.


## Food search relevance release

The release prioritizes direct food-name matches and common whole eggs over incidental matches in sandwiches and restaurant foods, while preserving explicit searches for prepared foods. Saved-food searches use the same ordering; no user records or food values are changed. Final build and static asset checks passed, together with 67 automated tests.


## Serving and goal release

The release adds closer food/portion matching, documented serving defaults, Progress-only calorie summaries and dated goals with user-selectable direction and calendar markers. Legacy meal title and notes values remain stored. Averages exclude incomplete and unlogged days. Final build, asset checks and 73 automated tests passed; native iPhone behavior remains unverified.


## Simpler food and calorie display

The release simplifies saved-food editing, makes all active favourites available for quick adding, and lets Settings choose one calorie summary in Progress. Stored legacy details remain intact; the Aliases control remains until the user confirms its removal. Production build, static asset checks and 75 automated tests passed. Real iPhone zoom and layout remain unverified.


## Scanner, voice and food-search stress checks

Hardened automatic calorie extraction to reject ambiguous multi-column values, kJ, negative numbers and ambiguous separators. Late speech results after an end event and malformed alternatives are ignored. Search explains empty results and documented serving defaults. Preserved existing food databases, records and aliases. Production build and asset checks passed; 80 automated tests passed with simulated browser speech, scan callbacks, cancellations, failed writes and database-backed drafts. Real Tesseract CPU OCR read a synthetic clear calorie label, rejected a two-column label and left a missing calorie value unknown. These are synthetic images and jsdom/fake IndexedDB checks, not real phone, microphone, camera or native browser tests. Packaged barcode lookup is not integrated.


## Build version in Settings

Settings shows the currently running build identifier and build date in the device’s local timezone. Both are generated automatically at build time, not stored with personal records. The date indicates build time, not the exact Pages publication time. The production build, static asset checks and 80 automated tests passed. Installed iPhone caching and reopening behavior remain unverified on a real device.


## New app icon

Updated the home-screen, manifest and browser icons to a cream bowl and checkmark on forest green. New filenames help avoid stale icon caches; older icon files remain for older cached pages. Production build, asset checks and 80 automated tests passed. The icon was not verified on a physical iPhone; iOS may retain an older installed icon until the shortcut is added again.


## Scanner repair

Both input modes now start OCR after photo selection; manual mode shows detected calories and adds a reviewed label and values to the meal draft, while automatic mode shows the unreviewed text directly in the draft. Silent worker failures (including string rejections) now surface an error and allow retry; progress is shown while loading. Compatible image formats may be selected and are converted to JPEG after device decoding. The calorie parser recognizes an unambiguous number on the line after Calories but rejects multiple columns. Existing user records are unchanged.

Production build, asset checks and 83 automated tests passed. Headless Chromium at a phone-sized viewport exercised real bundled OCR with synthetic images in both modes, saved 150 kcal and verified it after reload; automatic mode was also checked using the production build under a subdirectory. A blocked-worker browser test verified a visible error and retry state. These checks are not an iPhone camera or Safari test; HEIC decoding depends on device support and complex or unclear labels can remain unknown.
