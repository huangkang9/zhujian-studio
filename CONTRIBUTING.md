# Contributing

Use the original Qingchuan sample for reproducible bug reports. Include the app version, browser, steps, expected result and actual result. Remove private plans, addresses and API keys from attachments.

Keep one millimeter-based model for 2D, 3D and export. Preserve version 1 project compatibility and undo/save behavior. Add focused regression coverage for geometry or persistence changes.

Run `npm ci`, `npm test` and `npm run typecheck`. For sample changes run `node scripts/build-showcase.mjs`; for copy changes update `public/studio/locales/en.tsv` and run `node scripts/build-locales.mjs`. Record verified behavior and remaining browser checks in `docs/QUALITY.md`.

Keep third-party notices and document the origin and license of any new assets. Contributions are distributed under the project MIT license.
