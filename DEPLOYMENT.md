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
