# Everyday

A device-local meal and workout journal, built for an iPhone home screen. React 19, TypeScript, Vite, `idb`, and lazy Tesseract.js. No backend, app login, paid API, analytics, ads or ChatGPT runtime dependency. Production starts empty and uses the real local clock.

## Run and build

Use Node 22 or newer and npm. From this directory:

```sh
npm ci
npm run dev
npm test
npm run build
node scripts/check-build.mjs
node tests/ocr-real.mjs
```

`dist/` is the portable production site. Serve over HTTP locally and HTTPS in production; do not open `index.html` with `file://`. Build assets and OCR paths are relative, so a project subdirectory is supported. Tabs use React state, with no URL routes to rewrite. Refresh returns to Today; a saved draft has an explicit Resume action. No service worker or offline startup promise.

OCR engine files and English/French language packs are already in `public/ocr/` and copied into `dist/`. They load only when scanning. `npm ci` is enough to rebuild without downloading language packs again. Tests use a small synthetic label, not personal photos. Fixtures are isolated in test databases and excluded from the production bundle. The real OCR script uses local resources and CPU inference.

## Deploy without a paid runtime

Selected provider: **GitHub Pages, public repository, branch-based publishing**. The application itself has no app login. The public site shell never contains personal user records, which remain in each browser. Do not commit real backups or browser profiles.

Deployment target: https://theshadowoffall-cell.github.io/-everyday-meal-journal/

This repository contains source at its root and the production site in `docs/`. Pages must publish from **main /docs** using branch-based publishing. No GitHub Actions or paid runtime is required.

The Settings screen shows the running build version and build date in the device’s local time. Each production build generates these automatically; the date is the build time, not proof of the time it reached GitHub Pages. An open app may need to be closed and reopened to load a newer release.

To update the site, run `npm ci`, the relevant tests, and `npm run build`; replace `docs/` with the contents of `dist/` (including `.nojekyll`), then commit and push. Keep the repository name and published origin stable. Never commit personal backups or browser profiles. Browser storage is shared by origin: use one instance of this journal per GitHub Pages hostname.

Provider limits checked against GitHub's primary documentation during this build: public repositories support Pages on GitHub Free; recommended source repository limit 1 GB; published site maximum 1 GB; soft bandwidth limit 100 GB/month; soft limit 10 builds/hour. This site's static files are about 46 MiB, and the largest asset is about 11 MiB. Limits and terms can change. This is personal journal software, not an e-commerce service. See https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits . Recheck those limits when you deploy. Free hosting is not a promise of permanent availability.

## Install and protect records

Open the stable HTTPS address in Safari, tap Share, then **Add to Home Screen**. Safari and an installed instance may have separate records. Startup needs internet access. Installed Safari speech, native keyboard dictation, camera orientation, downloads, available storage and keyboard positioning still need real iPhone verification.

In Settings, **Export complete backup** creates one versioned JSON download with meals, foods, workouts, preferences, drafts, and all stored images. “Last export created” records only that event. Check your downloads and save a copy outside the device. Local storage and a persistence request are not cloud backups. No personal records are uploaded by this app. Browser speech may process audio through its provider, and the static host may keep access logs.

Restore accepts that same JSON format and validates it before writing. Its review counts come from the file. **Export current data** and **Cancel** do not replace anything. Only **Replace current data** performs a replacement, in one IndexedDB transaction. It replaces all records, including preferences and drafts, and clears old undo actions. Older tabs must reload. There is no merge or undo of a restore. Always export a nonempty destination before installation handoff.

Supported limits: full-backup capacity 24 MiB, at most 4,000 combined foods/meals/workout records, 40 photos, 2 MiB per stored JPEG/PNG/WebP, 4,096 pixels maximum stored dimension, 12,000 characters per text field, 100 items per meal. Incoming photos must be at most 20 MiB; the app resizes to at most 2,400 pixels and checks the 2 MiB storage limit. HEIC works only when the device browser can decode it; otherwise convert it to JPEG or PNG. Storage admission reserves encoding/metadata overhead, so a supported export can be imported under the same limit. Device quota can be lower; failures retain recoverable input. Photos removed from templates remain stored if history might reference them; this version deliberately has no automatic photo garbage collector.

## Use

- Favourite plus → review date/category → Save. A tile opens details. At most two templates are pinned to Today, with an explicit replacement choice.
- All text, saved-food, voice and label routes return to the same meal editor. A name is sufficient. Several items make one meal. Closing keeps the draft; discard is explicit. Save optionally creates a separate library template in the meal transaction.
- The day strip selects dates; **Log workout** alone records a workout. **Day details** exposes rest and clear. Unlogged means no record.
- Progress reports distinct dates, excludes drafts and future imported dates from elapsed totals, and compares completed weeks only. Imported future history is preserved and labelled.
- Templates are snapshots when eaten. Editing or archiving a template never rewrites past meals. Undo is action-specific and checks record-version tokens, pin changes and database generation. An undo that would overwrite newer state is refused.
- Scanning starts after photo selection. In Manual mode, review the text and units, check **I reviewed this text**, and tap **Use in meal**; detected calories and the photo are added to the draft. **Save label** saves a library reference. Unrecognized values remain unknown.

## Delivery and limitations

See `VALIDATION.md` for executed evidence, simulated services and outstanding device checks; `BUILD_STATE.md` records milestones. Source includes the dependency lockfile, bundled OCR assets and licence notices. Source and production ZIPs are packaged separately in the workspace's `work/delivery` directory. The client-specified `/codex/browser/.../output` path could not be created in this Cloud environment because `/codex` is on a read-only filesystem; no broken download link is presented.

The written composition was used because the supplied ChatGPT Library boards were not available as local images. Screenshot comparison, 320/390/430 layout observation, large-text/zoom, safe-area and iPhone keyboard checks are outstanding. No pixel-match or native iPhone verification is claimed.

## Calorie data and calculations

The primary local catalogue contains 5,993 foods from Health Canada's Canadian Nutrient File 2026, with 21,206 unambiguous documented portions. Nutrient source dates are shown where available. Contains information licensed under the [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada); this app is not endorsed by Health Canada. Food-search data stays on the device. Packaged products can change; use the package label where available.

The secondary local catalogue contains 7,793 foods extracted from USDA FoodData Central's SR Legacy CSV (April 2018). Data and documented food portions are public domain/CC0; attribution: USDA FoodData Central, https://fdc.nal.usda.gov/ . The data describe a specific food and preparation, so choose the closest match. Values are per 100 g; household portions use only gram weights supplied by USDA. The source identifier and selected serving basis are saved in each meal snapshot. Rebuild the catalogue with `python3 scripts/build-catalog.py` using the USDA public download; no API key or food-search request is used at runtime.

Open Food Facts offers branded products under ODbL/DbCL with distinct attribution and reuse requirements; this build does not integrate it. For a packaged food, enter the calories and serving size from its label as a saved food. No barcode lookup or comprehensive branded-product database is included.

Select ingredients and their quantities, then choose **Save as a dish** and enter the number of servings to create a reusable recipe. Values are calculated from saved ingredient snapshots. If any ingredient is unknown, the recipe calorie value remains unknown. Choose the daily total, last-week average, or current-month average in Settings to show it in Progress. Individual meal calories appear beside meals, and all unarchived favourites are available for quick adding on Today. Averages use recorded days with complete calorie information; missing days are not counted as zero. A dated daily goal can be set in Progress as at-or-below or at-or-above the target. Goal markers use logged entries and are unavailable when any logged calorie value is unknown. Values are rounded for display only. Backups now export version 2; version 1 remains importable. Backups made by this version should be restored into this version or later.

### Automatic voice and label input

Voice and Scan each have a Manual / Automatic switch; each choice is remembered on this device. In Manual mode, review and explicitly use the result. In Automatic mode, a successful voice result returns to the meal draft: a single exact saved-food match is used, while ambiguous or unmatched words remain plain text with unknown calories. Browser speech may be processed by the browser provider. iPhone keyboard dictation still needs the Use transcript button because the website cannot detect that dictation has finished.

In both modes, selecting a photo starts OCR. Automatic scanning places an unreviewed label and its locally stored photo into the meal draft; Manual mode lets you review the result first. The item is named `Scanned food` unless a saved food was selected before scanning; rename it if necessary. An unambiguous `Calories` value and explicitly stated serving may be copied into the draft as an unreviewed estimate; ambiguous or missing information remains unknown. Label text and image remain available for inspection. Neither mode automatically saves a meal. Device and iPhone behavior must be verified separately.

The Canadian source CSVs, data structure guide, source hashes, official licence and mirror/cross-check provenance are described in `src/data/canada-provenance.json` and `THIRD_PARTY_NOTICES.md`. To rebuild from extracted CSVs, run `python3 scripts/build-canadian-catalog.py /path/to/cnf-csv [path/to/independent.sqlite]`. Energy code 208 is per 100 g of edible food; only measure type 6 is a household portion. Refuse and yield values are excluded. The 2026 measure-weight conversion is already in grams; do not multiply it by 100.

Food search favors direct matches and uses a documented common portion by default when available. Search results and quantities show the portion basis, such as one large egg or a documented slice/fraction of pizza. Grams remain available; if a food has no documented portion, the 100 g basis remains explicit. Meal title and notes inputs have been removed, while existing saved text remains in the records.
