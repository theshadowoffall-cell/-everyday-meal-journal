# Bundled third-party components

React / React DOM 19.0.0: MIT licence, `licenses/React-LICENSE`.
idb 8.0.2: ISC licence, `licenses/idb-LICENSE`.
Tesseract.js 6.0.1 and Tesseract.js-core 6.1.2: Apache 2.0, licence files in `licenses/`.
English/French tessdata: downloaded from the Naptha tessdata 4.0.0 language resources at https://github.com/naptha/tessdata/tree/gh-pages/4.0.0 . Tesseract language data is distributed under Apache 2.0. Included resources remain local to the static site; no external OCR API is used.
Build dependencies and exact transitive versions are recorded in `package-lock.json`. Tests have development-only dependencies; they are not runtime services.
Bundled OCR file integrity hashes are in `OCR-SHA256SUMS.json`.

## Canadian Nutrient File 2026

Canadian Nutrient File 2026, Health Canada. Contains information licensed under the [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada). This application is not endorsed by Health Canada. Official dataset: https://open.canada.ca/data/en/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109 . The official download returned HTTP 403 in the build environment; source CSVs and documentation were obtained from the pinned mirror and independently cross-checked against a second CNF 2026 SQLite distribution as described in `src/data/canada-provenance.json`. Personal food searches do not leave the device.
