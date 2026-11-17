# Calorie feature research (in progress)

The existing journal stores snapshots, drafts, IndexedDB records and versioned JSON backups. Calorie fields are additive to the existing storage records; version 1 backups remain supported.

USDA FoodData Central's API guide says an API key is required, lists a default limit of 1,000 requests/hour/IP, and describes the data as public domain under CC0 1.0 while requesting attribution: https://fdc.nal.usda.gov/api-guide/ . A static browser app cannot protect an embedded private key. Evaluate the USDA downloadable datasets as a bundled common-food catalogue, with documented portion weights and attribution.

Open Food Facts states its database is ODbL, individual contents are DbCL, and product images are CC-BY-SA: https://world.openfoodfacts.org/data . Its API documentation requests a usage form and warns that users assume the risk of data use: https://openfoodfacts.github.io/openfoodfacts-server/api/ . Verify browser CORS, search rate limits, data quality, attribution/share-alike obligations and a privacy explanation before integrating. Do not assume household conversions or treat unknown nutrients as zero.

Still needed: source selection and catalogue acquisition, implementation, migrations and backward-compatible backup validation, recipe and quantity UI, daily totals, automated and browser/device checks, and deployment. Existing production was not changed.


## Implemented local choice

The April 2018 SR Legacy CSV was downloaded from the official USDA dataset page. The catalogue builder extracts energy nutrient 1008 and USDA-provided gram weights into 7,793 searchable common-food records; foods without energy are omitted. Data remain CC0, with USDA attribution. The bundled catalogue requires neither a secret key nor a live data request. Open Food Facts is not integrated: packaged-food label values can be entered manually; its licensing and live-browser service constraints would need further work before use.
