// Lists required launch values that are still unset in src/config.js (PLAN.md §0.7).
// Usage: npm run check:launch   — exits 1 while anything required is missing.
import { missingLaunchValues, PAGES, LEGAL_REVIEW } from '../src/config.js';

const missing = missingLaunchValues();
const unbuilt = PAGES.filter((p) => !p.ready).map((p) => p.path);
const unreviewed = Object.entries(LEGAL_REVIEW)
  .filter(([, done]) => !done)
  .map(([doc]) => doc);

if (missing.length === 0 && unbuilt.length === 0 && unreviewed.length === 0) {
  console.log('Launch check passed.');
} else {
  if (missing.length > 0) console.error(`Unset in CONTACT (src/config.js): ${missing.join(', ')}`);
  if (unbuilt.length > 0) console.error(`Pages not ready: ${unbuilt.join(', ')}`);
  if (unreviewed.length > 0) console.error(`Legal drafts not yet reviewed (LEGAL_REVIEW in src/config.js): ${unreviewed.join(', ')}`);
  process.exitCode = 1;
}
