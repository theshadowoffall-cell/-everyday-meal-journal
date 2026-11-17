# GitHub Pages deployment

Source and production files have been pushed successfully to:
https://github.com/theshadowoffall-cell/-everyday-meal-journal

Publishing files are in `docs/`; source is at the repository root. The production code is the previously validated build (29 automated tests, TypeScript/Vite build, portable asset checks and real synthetic-label CPU OCR passed). No application code changed for this upload. Real iPhone and rendered browser checks remain outstanding.

## One owner action remains

The integration successfully pushed to main, but `POST /repos/theshadowoffall-cell/-everyday-meal-journal/pages` returned HTTP 403, `Resource not accessible by integration`. Pages has not been enabled by this session, and no successful deployment is claimed.

Open https://github.com/theshadowoffall-cell/-everyday-meal-journal/settings/pages . Choose **Deploy from a branch**, then **main** and **/docs**, then **Save**. Keep the leading hyphen in the repository name.

Expected address after GitHub completes publishing:
https://theshadowoffall-cell.github.io/-everyday-meal-journal/

Once Pages reports success, verify the HTTPS page, reload, manifest/icons, lazy OCR files, and iPhone flows. This URL is an expected destination until those checks succeed. Personal meals/workouts/photos are not in this repository; they are stored in each visitor's browser.
