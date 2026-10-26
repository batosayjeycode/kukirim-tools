# PLAN.md — tools.kukirim.com

> **Project:** tools.kukirim.com (this repository) — part of the Kukirim brand  
> **Product:** Free, practical tools for Indonesian online sellers  
> **Deployment:** Cloudflare Pages (static), custom domain `tools.kukirim.com`  
> **Related site:** `kukirim.com` — separate SEO landing/content site, separate Cloudflare Pages project (see §0.6)  
> **Initial budget:** Under IDR 500,000  
> **Initial timeline:** 30 days  
> **Primary goal:** Validate demand for useful seller tools and the first digital-product sales before building a larger SaaS.

---

## 0. Approved Decisions (2026-10-26)

These decisions override any conflicting text elsewhere in this plan.

### 0.1 Domains and site split

- This repository builds **`https://tools.kukirim.com`** only: tools, template landing pages, and essential info pages.
- Astro `site` = `https://tools.kukirim.com`; canonical URLs, sitemap, and `robots.txt` use this host.
- Trailing slashes always (`trailingSlash: 'always'`, `build.format: 'directory'`).
- No `www` variant for the subdomain; it is added to the Pages project as a custom domain (CNAME).

### 0.2 Profit formula (per unit; order-level costs divided by quantity)

Inputs (all IDR unless noted; empty = 0; negatives rejected):

| Input | Unit |
|---|---|
| `price` — listed selling price | per unit |
| `cost` — product cost (HPP) | per unit |
| `discount` — value + type (`fixed` IDR or `percent` of price) + funder (`seller` or `platform`) | per unit |
| `feePct` — marketplace fee percentage (0–100) | % of fee base |
| `feeBase` — `revenue` (default: price after seller-funded discount) or `listed` (price before seller-funded discount) | — |
| `feeFixed` — fixed marketplace fee | per unit |
| `shipping` — shipping subsidy paid by seller | per order |
| `packaging` — packaging cost | per order |
| `other` — other expenses | per order |
| `qty` — units per order (integer ≥ 1, default 1) | — |

Formula:

```text
sellerDiscount = funder == 'seller' ? (type == 'percent' ? price × pct/100 : amount) : 0
revenue        = price − sellerDiscount            # platform-funded discounts are NOT deducted
base           = feeBase == 'listed' ? price : revenue   # default feeBase = 'revenue'
fee            = base × feePct/100 + feeFixed     # fee base shown in UI as an assumption
orderCosts     = (shipping + packaging + other) / qty
profit         = revenue − cost − fee − orderCosts # per unit
margin         = revenue > 0 ? profit / revenue × 100 : null   # null → UI shows "—"
totalProfit    = profit × qty
```

Break-even listed price (profit = 0). Let `C = cost + feeFixed + orderCosts`, `f = feePct/100`, `p = pct/100`, `a` = fixed discount amount:

| Seller discount | `feeBase = revenue` | `feeBase = listed` |
|---|---|---|
| none | `C / (1 − f)` | `C / (1 − f)` |
| fixed `a` | `C / (1 − f) + a` | `(C + a) / (1 − f)` |
| percent `p` | `C / ((1 − f) × (1 − p))` | `C / (1 − p − f)` |

Edge cases:
- If the denominator is ≤ 0 (e.g. `f ≥ 1`, `p ≥ 1`, or `p + f ≥ 1` for `listed`), return an explicit `{ ok: false, reason: 'no-finite-break-even' }` result; the UI shows "Tidak ada harga impas yang memungkinkan". Never return `Infinity`, `NaN`, or a negative price.
- Platform-funded discounts do not affect break-even.
- Every numeric output is checked with `Number.isFinite` before display.

- Each discount/fee is applied exactly once; the UI breakdown lists every deducted line.
- Fee base and rates are user assumptions; marketplaces may compute fees differently — stated in the UI.
- Percent discount > 100 or a fixed discount > price is a validation error.

### 0.3 Label CSV schema

- Headers (case-insensitive, trimmed): `nama_penerima`, `no_hp`, `alamat`, `kelurahan`, `kecamatan`, `kota_kabupaten`, `provinsi`, `kode_pos`, `catatan`.
- Required: `nama_penerima`, `no_hp`, `alamat`, `kecamatan`, `kota_kabupaten`, `provinsi`. Optional: `kelurahan`, `kode_pos`, `catatan`.
- `no_hp`: after removing spaces/`-`/`.`, must match `^(\+62|62|0)8\d{7,12}$`.
- `kode_pos`: if present, exactly 5 digits.
- Delimiter auto-detected (`,` or `;`); UTF-8 with BOM stripped; quoted fields supported; max 500 rows.
- Invalid rows are reported with row number and field; valid rows can still be printed.
- Sample file: `public/downloads/contoh-label.csv` (fictitious data only).
- All processing is local; rendered with `textContent` only.

### 0.4 Sender details

- Entered manually (name, phone, optional address/shop name). Never hardcoded.
- Saved to `localStorage` only when the user ticks "Simpan di browser ini"; "Hapus data pengirim" clears it.
- This is the seller's own data, saved with explicit consent — an approved exception to "no local storage by default". Recipient/CSV data is **never** persisted.

### 0.5 Label size

- Default: 100 × 150 mm (4×6 in) thermal label, one label per page (`@page { size: 100mm 150mm }`).
- Option: A4 with multiple labels per sheet (grid, cut lines).
- "Download" = browser Print → Save as PDF. No CSV export in the MVP.

### 0.6 Main site `kukirim.com`

- **Approved:** `kukirim.com` lives in a **separate repository, `kukirim-site`**, deployed as its own Cloudflare Pages project. This repository (`kukirim-tools`) contains only the tools site for `tools.kukirim.com`.
- Content: SEO landing page for Indonesian sellers, guides/articles (`/panduan/...`), links to free templates and to `tools.kukirim.com`.
- No backend, accounts, or database.
- Built only **after** the tools MVP is complete (§0.9 Step 11), sharing visual style only, not code.

### 0.7 Contact and business info

- Central config `src/config.js` with placeholders (`CONTACT_EMAIL`, `BUSINESS_NAME`, etc.).
- Unset values stay `null` in config. Pages **never** render placeholder text; incomplete contact fields are hidden until real values are configured. A launch check lists unset required values (launch is blocked until supplied).
- Privacy, Terms, and Contact pages are included.

### 0.8 Implementation defaults

- JavaScript with JSDoc; Vitest for unit tests; `@astrojs/sitemap`; plain CSS; no CSV library; no `AdSlot` component.
- Analytics deferred to P1 (Cloudflare Web Analytics; page views only).
- Astro 7.x on Node ≥ 22.23.4 (`.nvmrc` pins `22.23.4`: CI runners cache an older 22.x that Astro rejects). Astro ≤ 7.3.1 has published security advisories; do not downgrade.

### 0.9 Implementation roadmap

Work one step at a time; each step needs owner review before the next starts. A step is complete only when its criteria are met **and** its status below is updated to `done` with the date. Future sessions: the last `done` row is the last completed step; verify with `npm test` and `npm run build`.

| # | Step | Depends on | Completion criteria | Status |
|---|---|---|---|---|
| 1 | Foundation: git, Astro, config, layout, header/footer, homepage stub, robots.txt, README | — | `npm run build` passes; `npm test` passes (config smoke test) | done 2026-10-26 |
| 2 | Profit logic `src/lib/profit.js` (incl. `feeBase`, break-even) | 1 | `tests/profit.test.js` covers §9 cases + both fee bases + no-finite-break-even | done 2026-10-26 |
| 3 | Profit calculator page `/kalkulator-keuntungan/` | 2 | Page builds; breakdown, reset, IDR formatting, explanation + example | done 2026-10-26 |
| 4 | CSV + label logic `src/lib/csv.js`, `src/lib/labels.js` | 1 | `tests/csv.test.js`, `tests/labels.test.js` cover §0.3 and §9 cases | done 2026-10-26 |
| 5 | Label generator page `/generator-label-paket/` (manual + CSV, sender opt-in storage, 100×150 / A4 print) | 4 | Page builds; sample CSV in `public/downloads/`; print styles for both sizes | done 2026-10-26 |
| 6 | Template pages + first free template file | 1 | Both template pages build; no download advertised unless the file exists | done 2026-10-26 |
| 7 | Info pages (tentang, kontak, privasi, syarat-ketentuan) + 404 | 1 | Pages build; no placeholder text rendered | done 2026-10-26 |
| 8 | SEO pass: titles, descriptions, canonical, OG, sitemap, internal links | 3, 5, 6, 7 | Build output verified for every route (`npm run check:seo`: 0 errors, 0 warnings) | done 2026-10-26 |
| 9 | QA: tests, build, accessibility, mobile, link check; README update | 8 | §9 production checks (local items) ticked | done 2026-10-26 |
| 10 | Deployment: GitHub, Cloudflare Pages, custom domain, Search Console (owner performs account steps) | 9 + real contact details | Live HTTPS verified on `tools.kukirim.com` | pending |
| 11 | Main site `kukirim-site` (separate repository) | 10 | Out of scope for this repository | pending |

Post-launch integration tasks (not part of the MVP steps above):

| # | Task | Depends on | Completion criteria | Status |
|---|---|---|---|---|
| P1 | Link to `kukirim.com` from this site | 11 deployed and reachable | Set `SITE.mainSiteLive = true` in `src/config.js` (footer link renders automatically); add header/nav or in-content links only if useful; build passes | pending |

Legal drafts: `/privasi/` and `/syarat-ketentuan/` are plain-language drafts pending the owner's review (incl. UU PDP). The public pages show no review notices; status is tracked internally by `LEGAL_REVIEW` in `src/config.js`, and `npm run check:launch` fails until both are `true`. Do not add the operator's legal identity or a governing-law clause unless the owner supplies verified details.

---

## 1. Executive Summary

tools.kukirim.com will be a lightweight, SEO-oriented toolkit for small and independent online sellers in Indonesia. It will help sellers calculate product profitability, prepare parcel labels, and organize orders without installing software or creating an account.

The MVP should prioritize tools that can run entirely in the browser. This keeps hosting and operational costs low, avoids unnecessary backend infrastructure, and reduces the amount of customer data that must be transmitted or stored.

### Initial positioning

**Kukirim Tools — Tools Gratis untuk Seller Online Indonesia**

### Business model

1. **Digital products:** sell spreadsheet templates for bookkeeping, inventory, order management, and profit tracking.
2. **Affiliate:** recommend relevant seller equipment and software through legitimate affiliate programs.
3. **Display advertising:** consider only after the site has useful original content and meets the provider's current requirements.
4. **Premium tools:** introduce paid bulk processing or other advanced features only after user demand has been demonstrated.

### MVP success criteria

- Deploy a working, mobile-friendly static website on `https://tools.kukirim.com`.
- Release two useful browser-based tools and two template landing pages.
- Publish 3–5 original, useful guides during the initial launch.
- Test the product with 10–20 sellers.
- Measure search indexing, tool usage, template downloads, and the first paid conversions.
- Keep initial cash spending below IDR 500,000.

These are internal validation targets, not guarantees of traffic, rankings, or revenue.

---

## 2. Goals and Non-Goals

### Goals

- Deliver practical value to Indonesian marketplace and social-commerce sellers.
- Build SEO-friendly pages with clear search intent and helpful content.
- Keep hosting and maintenance simple enough for a solo developer working a few hours per week.
- Validate whether users want spreadsheet templates and advanced tools.
- Make privacy and correctness part of the product from the beginning.

### Non-goals for the MVP

Do **not** build these in the first release:

- Real-time tracking integrations for multiple couriers.
- Direct integrations with Shopee, Tokopedia, TikTok Shop, Lazada, or other marketplaces.
- Marketplace account login or OAuth.
- User accounts, teams, subscriptions, or a multi-tenant dashboard.
- A custom Node.js API server or PostgreSQL database.
- Automated scraping of marketplace or courier websites.
- Automated order importing from users' marketplace accounts.
- Complex analytics, AI features, or a mobile application.

Revisit a non-goal only when user feedback and validated demand justify the extra cost and complexity.

---

## 3. Target Audience and User Problems

### Primary audience

Indonesian micro and small online sellers who manage orders manually or with spreadsheets. They may sell through marketplaces, social media, chat applications, or a combination of channels.

### Core problems

- Sellers may not know their actual profit after product cost, discounts, marketplace fees, packaging, and other expenses.
- Manual order and inventory spreadsheets can become inconsistent.
- Preparing parcel labels and cleaning customer address data is repetitive.
- Sellers need simple templates but may not want to pay for a full inventory or accounting system.

### Primary user journey

1. A seller finds a Kukirim tool through Google or a shared link.
2. The seller uses the tool without creating an account.
3. The page explains the result and links to a relevant guide or template.
4. The seller downloads a free template or visits a paid template offer.
5. Kukirim measures usage and conversion without collecting unnecessary personal data.

---

## 4. MVP Scope and Priorities

### P0 — Required for launch

#### 4.1 Homepage

Route: `/`

Requirements:
- Explain the value proposition in Indonesian.
- Prominently link to the profit calculator, parcel-label generator, and templates.
- Include concise descriptions and useful internal links.
- Include a clear header, navigation, and footer.
- Work well on mobile and desktop.
- Avoid unsupported claims about official marketplace or courier integrations.

#### 4.2 Profit calculator

Route: `/kalkulator-keuntungan/`

Purpose: help sellers estimate net profit and selling-price requirements.

Inputs:
- Product cost per unit.
- Selling price per unit.
- Discount or seller-funded promotion, if applicable.
- Marketplace/platform fee as a configurable percentage or amount.
- Packaging and other per-order costs.
- Optional shipping subsidy or other seller-paid costs.
- Quantity, where relevant.

Outputs:
- Estimated net profit per unit.
- Estimated total profit for the selected quantity.
- Profit margin based on clearly defined revenue.
- Break-even selling price or minimum selling price, where mathematically valid.
- A breakdown of the values used in the calculation.

Requirements:
- Do not hardcode one marketplace fee as universally correct.
- Let users enter or adjust fee assumptions.
- Explain which costs are included and excluded.
- Show IDR formatting using Indonesian locale conventions.
- Handle empty, malformed, zero, and negative inputs safely.
- Prevent division-by-zero and non-finite output.
- Provide a reset action.
- Include a brief explanation and examples below the tool for SEO and usability.
- Unit-test calculation logic.

Calculation specification:
- Treat all user-entered values as assumptions, not verified marketplace rates.
- Define gross revenue, discounts, platform fees, and costs explicitly in the UI.
- `netProfit = netRevenue - productCost - platformFees - packagingCost - otherCosts - sellerPaidShipping`
- `profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : undefined`
- `breakEvenPrice` must be derived from the configured fee model. If fees are a percentage of selling price, solve the equation using the percentage fee rather than simply adding a fixed amount. Document the formula and guard against a fee rate that makes a finite break-even price impossible.
- Do not mix per-unit and per-order values. Label the calculation basis clearly.
- The final implementation must align the formula with the actual input definitions; the equations above are a baseline, not a substitute for specifying each input's units.

#### 4.3 Parcel-label generator and address formatter

Route: `/generator-label-paket/`

Purpose: help sellers format a small batch of addresses and print simple labels.

MVP capabilities:
- Manual entry for one label.
- CSV import for multiple labels.
- Preview labels before printing.
- Print-friendly layout using browser print styles.
- Clear validation errors for missing required fields.
- Download or print labels without uploading customer data to a server.
- Provide a sample CSV file with fictitious data.
- Explain expected CSV columns and delimiters.
- Support common UTF-8 text and Indonesian addresses.

Security and privacy requirements:
- Process CSV locally in the browser.
- Do not send customer names, addresses, or phone numbers to analytics.
- Treat imported CSV content as untrusted input.
- Render imported text as text, never as executable HTML.
- Escape CSV output correctly if export is implemented.
- Mitigate spreadsheet formula injection when exporting values that may begin with `=`, `+`, `-`, or `@`.
- Do not persist customer data in local storage by default.
- Do not claim integration with courier label systems or official shipping labels.

For the first release, a simple generic address label is sufficient. Official courier-specific formats are out of scope unless the relevant format and permission requirements are confirmed.

#### 4.4 Free spreadsheet template

Route: `/template-pembukuan-online-shop/`

Requirements:
- Provide a genuinely useful free starter template.
- Explain what each sheet or column does.
- Include a fictitious sample dataset.
- Link to a paid, more complete bundle only if it is available and the offer is clear.
- Clearly identify supported formats, such as Google Sheets and/or Excel.
- Avoid promising that the template automatically synchronizes with any marketplace.

#### 4.5 Order-management template

Route: `/template-manajemen-order/`

Requirements:
- Provide a landing page describing the intended workflow.
- Include a simple free template or a clear planned release date before promoting it as available.
- Suggested columns: order date, internal order ID, sales channel, item, quantity, payment status, fulfillment status, tracking number, and notes.
- Do not collect uploaded order files on the website.

#### 4.6 Essential information pages

Routes:
- `/tentang/`
- `/kontak/`
- `/privasi/`
- `/syarat-ketentuan/`

Requirements:
- Describe the product and its limitations honestly.
- Provide a real contact method chosen by the owner; do not invent contact details.
- Explain what analytics or third-party services are used.
- Explain local processing for CSV tools.
- Update privacy disclosures when analytics, ads, checkout, or affiliate services are added.
- Terms must clarify that calculator results are estimates and not financial, tax, legal, or marketplace policy advice.

### P1 — After the initial release

- 3–5 original educational guides.
- A paid spreadsheet bundle and checkout link.
- Affiliate links with clear disclosures.
- Google Search Console verification and monitoring.
- Basic privacy-conscious analytics.
- Better sample files and onboarding instructions based on user feedback.

### P2 — Only after demand is validated

- Bulk label layout options.
- More advanced profit scenarios.
- Additional spreadsheet templates.
- Premium export or saved presets.
- Server-backed features, accounts, or subscriptions only if justified by user demand and an explicit cost/security review.

---

## 5. SEO and Content Plan

### Initial keyword hypotheses

These are candidate queries to validate with Google Keyword Planner and manual SERP inspection. Search volume, difficulty, CPC, and ranking potential have not yet been verified.

| Candidate keyword | Search intent | Target page |
|---|---|---|
| kalkulator keuntungan jualan online | Calculate profit | `/kalkulator-keuntungan/` |
| kalkulator keuntungan Shopee | Marketplace profit calculation | `/kalkulator-keuntungan/` |
| cara menghitung harga jual produk | Learn a calculation | A dedicated guide |
| template pembukuan online shop | Find a spreadsheet template | `/template-pembukuan-online-shop/` |
| template stok barang Excel | Find an inventory template | Future template guide/page |
| generator label paket | Use a label tool | `/generator-label-paket/` |
| format alamat pengiriman paket | Learn or format an address | Label tool or dedicated guide |
| template manajemen order online shop | Find an order template | `/template-manajemen-order/` |

Do not publish thin pages simply to target every keyword variant. Consolidate closely related intent when one useful page can satisfy it.

### Competitor research

Competitors and adjacent products identified for further manual review:
- Seller Tools Indonesia — `https://sellertoolsindo.id/`
- Risetika — `https://risetika.temaninovasi.com/`
- LarisID — `https://larisid.com/`

Treat these as research leads, not as a completed competitive audit. Verify current availability, product features, pricing, indexed pages, and search results before drawing conclusions.

### Validation procedure

1. Enter the candidate queries into Google Keyword Planner, targeting Indonesia and Indonesian language.
2. Inspect the top search results for at least five high-priority queries.
3. Record observed intent, page type, competitor strengths, content gaps, and any available volume/CPC data.
4. Interview 5–10 sellers about their current profit and order workflows.
5. Build and test the calculator before investing in a large content calendar.
6. After launch, use Search Console impressions, clicks, queries, and indexed URLs to refine the plan.

### Initial content calendar

Publish only content that answers a real user question and is fact-checked.

1. Cara menghitung keuntungan jualan online dengan contoh angka.
2. Cara menentukan harga jual produk dan margin.
3. Cara membuat pembukuan sederhana untuk online shop.
4. Cara mengelola order dan stok menggunakan spreadsheet.
5. Cara menyiapkan format alamat dan label paket yang rapi.

Each guide should link to a relevant tool or template and include original examples, clear assumptions, and a last-reviewed date when rates or policies may change.

### On-page SEO requirements

- Unique, descriptive title and meta description for every indexable page.
- One clear page heading and a logical heading hierarchy.
- Canonical URL on each page.
- Descriptive internal links and useful breadcrumbs where appropriate.
- Open Graph metadata and a suitable social preview image.
- Valid sitemap and `robots.txt`.
- No accidental `noindex` on production pages.
- Avoid duplicate pages created by query parameters.
- Add structured data only when it accurately represents visible content and meets search-engine guidelines.
- Never promise search rankings or fabricate search-volume data.

---

## 6. Technical Architecture

### Technology choices

- **Framework:** Astro.
- **Language:** JavaScript initially; TypeScript is acceptable if it does not slow delivery.
- **Styling:** plain CSS or a lightweight, well-maintained utility approach.
- **Hosting:** Cloudflare Pages.
- **Repository:** GitHub.
- **Content:** Markdown/MDX or Astro content collections.
- **Tools:** browser-side JavaScript.
- **Analytics:** Cloudflare Web Analytics or another privacy-appropriate option after reviewing its current behavior and privacy implications.
- **Search reporting:** Google Search Console.
- **Payments:** a third-party checkout provider that supports the seller's country, settlement, and product type. Choose only after checking fees, onboarding, taxes, and refund handling.

### Static-first request flow

1. Source files are committed to GitHub.
2. GitHub Actions (`.github/workflows/ci.yml`) builds and verifies the Astro site, then deploys `dist/` to Cloudflare Pages with Wrangler on pushes to `main`.
3. Generated HTML, CSS, JavaScript, and static assets are deployed to the custom domain.
4. Calculations and CSV processing run in the visitor's browser.
5. Paid products are delivered through a selected third-party checkout/delivery provider.
6. No custom API or database is required for the initial MVP.

Verify current Cloudflare plan terms and quotas before launch. Keep the MVP static so that it does not depend on Pages Functions or a server-side database.

### Suggested project structure

```text
kukirim-tools/
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   ├── images/
│   └── downloads/
│       └── contoh-label.csv
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   └── ToolCard.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── kalkulator-keuntungan.astro
│   │   ├── generator-label-paket.astro
│   │   ├── template-pembukuan-online-shop.astro
│   │   ├── template-manajemen-order.astro
│   │   ├── tentang.astro
│   │   ├── kontak.astro
│   │   ├── privasi.astro
│   │   ├── syarat-ketentuan.astro
│   │   └── 404.astro
│   ├── config.js              # contact/business placeholders
│   ├── lib/                   # pure, unit-tested logic
│   │   ├── profit.js
│   │   ├── csv.js
│   │   └── labels.js
│   ├── scripts/               # browser glue (DOM only)
│   │   ├── profit-calculator.js
│   │   └── label-generator.js
│   └── styles/
│       └── global.css
├── tests/
├── astro.config.mjs
├── package.json
├── README.md
└── PLAN.md
```

The implementation may adjust this structure if Astro conventions or test tooling make a simpler structure preferable. Do not add abstractions without a concrete benefit.

### Custom domain and deployment checklist

- [ ] Confirm the `kukirim.com` zone is in the correct Cloudflare account.
- [ ] Create the Cloudflare Pages project `kukirim-tools` as a Direct Upload project (no Git integration; GitHub Actions deploys it).
- [ ] Add GitHub repository secrets `CLOUDFLARE_API_TOKEN` (scoped to Cloudflare Pages: Edit) and `CLOUDFLARE_ACCOUNT_ID`.
- [ ] Confirm the first push to `main` passes the `check` job. The `deploy` job fails at `npm run check:launch` until contact details and `LEGAL_REVIEW` are set; after that, confirm it publishes `dist/`.
- [ ] Add `tools.kukirim.com` as a custom domain on the Pages project (Cloudflare creates the CNAME).
- [ ] Verify HTTPS and that canonical tags use `https://tools.kukirim.com`.
- [ ] Keep the `*.pages.dev` preview host out of the index (canonical tags point to the custom domain).
- [ ] `kukirim.com` (apex) is served by its own Pages project (§0.6); do not redirect it to the tools subdomain.
- [ ] Test direct navigation to every route, refreshes, trailing-slash behavior, and 404 handling.
- [ ] Verify sitemap, robots rules, canonical tags, and production metadata (`npm run check:seo` covers the build; also confirm `X-Robots-Tag: noindex` on the `*.pages.dev` host).
- [ ] Add the site to Google Search Console.
- [ ] Run a production build and smoke tests before launch.
- [ ] `npm run check:launch` passes (contact details set, legal drafts reviewed).
- [ ] Review `/privasi/` whenever Cloudflare security, bot protection, analytics, or any other feature that may set cookies or process visitor data is enabled; update the public policy if actual behavior changes.

Do not introduce redirect rules until the canonical-host behavior is understood and tested. Avoid redirect loops.

---

## 7. Design and User Experience

### Design principles

- Indonesian language first.
- Mobile-first layout and readable typography.
- Fast initial load with minimal JavaScript.
- Clear primary action on each tool page.
- Neutral, trustworthy visual design.
- Accessible labels, keyboard navigation, visible focus states, and sufficient contrast.
- Results must be easy to copy, print, or download where appropriate.
- Explain assumptions near the calculation, not hidden in a distant FAQ.
- No fake testimonials, fabricated reviews, false scarcity, or misleading official-partner badges.

### Homepage content order

1. Value proposition and primary CTA: use the profit calculator.
2. Featured tools.
3. Free templates.
4. Latest practical guides.
5. Short explanation of who Kukirim serves.
6. Links to About, Contact, Privacy, and Terms.

### Tool page content order

1. Page title and a short problem statement.
2. Tool interface.
3. Result and transparent breakdown.
4. Explanation of formula or supported input format.
5. Worked example with fictitious data.
6. Common questions.
7. Related tools and templates.
8. Relevant disclosures.

---

## 8. Analytics and Privacy

### Events to measure

Track only events needed to understand product usage. Potential events include:
- `tool_open`
- `profit_calculation_completed`
- `label_preview_generated`
- `template_download`
- `paid_product_click`
- `affiliate_click`

Use a consistent event naming scheme and document what each event means. Avoid sending user-entered values to analytics.

### Privacy requirements

- Do not collect customer names, addresses, phone numbers, or order contents in analytics.
- Do not send CSV contents to a server.
- Do not use session replay on pages where personal order data might be entered.
- Do not add tracking scripts without reviewing their privacy impact.
- Disclose analytics, ads, affiliate links, and checkout providers in the privacy policy as applicable.
- Store no unnecessary personal data.
- Provide a real contact channel for privacy-related questions.
- Review applicable Indonesian legal requirements before processing personal data or selling digital products.

---

## 9. Testing and Quality Gates

### Unit tests

Profit calculator:
- No fees and no extra costs.
- Percentage-based platform fee.
- Fixed costs.
- Discounts.
- Quantity greater than one.
- Zero revenue.
- Invalid, missing, negative, or non-finite input.
- Break-even calculation with percentage fees.
- Fee rate at or above an invalid threshold for a finite break-even solution.

Label generator:
- Valid CSV.
- Empty file.
- Missing required columns.
- Quoted fields containing commas.
- Unicode names and addresses.
- Malformed rows.
- HTML-like text rendered safely.
- Spreadsheet formula-injection mitigation on any CSV export.

### Production checks

- [x] `npm run build` passes.
- [ ] Tests pass in CI. (Workflow added; `npm run verify` passes locally. Confirm on GitHub after the first push.)
- [x] No broken internal links. (`npm run check:seo`)
- [x] No console errors in key flows.
- [x] Forms and controls work on mobile. (390 px layout checked; real-device test with sellers still recommended.)
- [x] Keyboard navigation works.
- [x] Pages have titles, descriptions, canonical URLs, and correct status codes.
- [x] CSV processing remains local. (No network APIs in page scripts; DOM tests cover import.)
- [x] No secrets or credentials are committed. (Checked before first commit; `.env*` ignored.)
- [ ] Custom domain and HTTPS work.
- [x] Lighthouse or equivalent checks reveal no critical performance/accessibility problems. (Lighthouse 13.5 mobile: 100/100/100/100 on all indexable pages.)

Do not optimize for an arbitrary perfect Lighthouse score at the expense of a usable, accurate tool. Fix material issues first.

---

## 10. Monetization Plan

### Phase A — Validate value

- Offer the calculator and generic label tool for free.
- Provide a useful free starter spreadsheet.
- Ask for feedback through a real contact channel or a simple, privacy-conscious feedback mechanism.
- Do not require an account.

### Phase B — Sell a digital bundle

Create a bundle that may include:
- Order-management spreadsheet.
- Inventory tracker.
- Daily sales and profit tracker.
- Simple cash-flow or expense tracker.
- Instructions and example data.

Initial price hypotheses:
- Basic bundle: IDR 29,000.
- More complete bundle: IDR 59,000–99,000.

These are prices to test, not validated market prices. Make the contents, file formats, license, update policy, and refund policy clear.

### Phase C — Affiliate

- Identify legitimate affiliate programs for relevant tools and supplies.
- Verify eligibility, commission, payout minimum, and current terms.
- Add recommendations only where they help users.
- Clearly disclose affiliate relationships.

### Phase D — Advertising

- Apply to an ad provider only after checking current eligibility and policy requirements.
- Keep the interface useful and avoid intrusive ad placement.
- Never click or encourage users to click ads.
- Do not rely on ads as the only source of revenue.

### Phase E — Premium tools

Consider premium features only when feedback shows that users need them. Possible options include additional label layouts, bulk-processing convenience, and more advanced spreadsheet templates.

Avoid subscriptions until Kukirim offers recurring value that users demonstrably want.

### Revenue model examples

Illustrative template revenue, before fees, taxes, refunds, and operating costs:

| Scenario | Monthly sales | Price per sale | Gross revenue |
|---|---:|---:|---:|
| Early validation | 5 | IDR 29,000 | IDR 145,000 |
| Developing | 20 | IDR 39,000 | IDR 780,000 |
| Optimistic | 50 | IDR 49,000 | IDR 2,450,000 |

These are arithmetic scenarios only. They are not forecasts and do not imply that the stated number of sales will occur.

---

## 11. Budget

Keep spending below IDR 500,000 for the initial 30-day validation period.

| Item | Budget assumption |
|---|---:|
| Cloudflare Pages static hosting | IDR 0 on an eligible free setup |
| Astro and open-source libraries | IDR 0 |
| Basic search reporting and analytics | IDR 0 |
| Design | IDR 0 using original, lightweight assets |
| Optional checkout or business services | IDR 100,000–200,000 reserve |
| Unexpected costs and testing | IDR 100,000–200,000 reserve |
| **Total planned ceiling** | **IDR 200,000–400,000** |

The budget is an initial planning estimate. Check current service terms, transaction fees, tax obligations, and payment-provider eligibility before spending. Domain renewal is excluded because the domain is already owned.

---

## 12. Thirty-Day Delivery Roadmap

### Week 1 — Validate and establish the foundation

Deliverables:
- Review candidate keywords and search results.
- Interview 5–10 target sellers.
- Create the Astro project and GitHub repository.
- Configure Cloudflare Pages and `tools.kukirim.com`.
- Build the shared layout and homepage.
- Document the profit calculator's exact inputs and formulas.

Acceptance criteria:
- Production domain serves the initial site over HTTPS.
- Homepage is responsive and has working navigation.
- Keyword and interview findings are recorded.
- No paid infrastructure is required.

### Week 2 — Build the tools

Deliverables:
- Complete profit calculator.
- Complete generic label generator and CSV import.
- Create a fictitious sample CSV.
- Add validation, error messages, print styling, and unit tests.

Acceptance criteria:
- Calculations match independently checked examples.
- Invalid inputs cannot break the page.
- Imported customer data is processed locally.
- Main flows work on desktop and mobile.

### Week 3 — Content and digital product

Deliverables:
- Publish bookkeeping template landing page.
- Publish order-management template landing page.
- Prepare at least one genuinely useful free template.
- Publish 3–5 original guides as time allows.
- Add essential policy and contact pages.
- Configure Search Console and basic analytics.

Acceptance criteria:
- Each page has unique metadata and useful content.
- No template is advertised as downloadable until it is ready.
- Analytics does not capture personal order data.
- Sitemap and canonical URLs are valid.

### Week 4 — Test, launch, and learn

Deliverables:
- Run production smoke tests.
- Ask 10–20 sellers to try the tools.
- Fix the most important usability issues.
- Test interest in the paid bundle.
- Record indexing, tool usage, downloads, and conversions.

Acceptance criteria:
- No critical defects in the primary flows.
- The website is discoverable and its sitemap is submitted.
- Feedback and next actions are documented.
- The next development decision is based on evidence, not guesses.

---

## 13. KPIs and Decision Rules

### First 30 days

Measure:
- Number of seller interviews and product testers.
- Number of valid indexed pages.
- Search impressions and clicks.
- Calculator completions.
- Label previews and downloads.
- Paid product clicks and completed purchases.
- User feedback and repeated usage.

Internal milestones:
- 10–20 testers.
- 3–5 core pages indexed.
- 3–5 useful guides published.
- First 5 paid template sales as a validation milestone.

These are goals, not guarantees. SEO may take longer than 30 days.

### At 60–90 days

- Identify which tool attracts the most relevant visitors.
- Compare search impressions, click-through rate, and tool completion.
- Improve pages with impressions but weak clicks or engagement.
- Expand the tool users value most.
- Consider affiliate or ads only where relevant and compliant.
- Do not add a backend unless a real limitation blocks a validated use case.

### Decision rules

- If sellers do not understand the calculator, improve the interface and examples before adding features.
- If users use the free template but do not buy, interview them and improve the paid bundle or offer.
- If a page receives no search impressions, review indexing, intent, competition, and content quality before producing many similar pages.
- If a feature creates privacy or maintenance risk without clear demand, defer it.
- If users repeatedly request a workflow that cannot be done safely in the browser, prepare a separate architecture and cost proposal before implementation.

---

## 14. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| SEO competition is stronger than expected | Focus on specific user problems and original examples; validate search results first. |
| Users do not pay for templates | Test the bundle with real sellers before expanding it. |
| Marketplace fees change | Use configurable assumptions and clearly dated explanatory content. |
| CSV contains sensitive customer data | Process locally, avoid analytics capture, and do not persist data by default. |
| Scope grows too quickly | Enforce P0/P1/P2 priorities and defer integrations. |
| Third-party checkout changes terms or fees | Verify provider eligibility and maintain a clear product-delivery process. |
| Ads reduce usability | Add ads only after product value is established and use restrained placement. |
| Revenue is slower than expected | Keep fixed costs near zero and review evidence before investing. |

---

## 15. Definition of Done

The initial MVP is done when:

- [ ] `https://tools.kukirim.com` works with HTTPS and a consistent canonical host.
- [ ] Homepage and core pages are responsive and accessible.
- [ ] Profit calculator returns tested, clearly explained estimates.
- [ ] Generic parcel-label generator supports safe local CSV import and printing.
- [ ] At least one free spreadsheet template is available.
- [ ] Order-management template page accurately describes what is available.
- [ ] About, Contact, Privacy, and Terms pages are complete.
- [ ] SEO metadata, canonical URLs, robots rules, and sitemap are correct.
- [ ] Search Console is configured.
- [ ] Analytics is privacy-conscious and excludes user-entered customer data.
- [ ] Production build and automated tests pass.
- [ ] The site has been tested by real target users.
- [ ] The next iteration is prioritized using observed user feedback and product metrics.

---

## 16. Instructions for the Implementing Agent

Before writing code:

1. Inspect the existing repository and report its current structure, scripts, dependencies, and deployment setup.
2. If the repository already contains work, preserve useful existing decisions and avoid replacing files without inspecting them.
3. Compare the current project against this plan and identify the smallest implementation path.
4. Confirm the exact profit formulas, input units, and label CSV schema before implementation.
5. Check current official Cloudflare Pages and Astro documentation if deployment details are uncertain.
6. Present a concise implementation plan, assumptions, risks, and test strategy before making broad changes.

During implementation:

- Work in small, reviewable steps.
- Prefer the simplest solution that satisfies the requirements.
- Do not add a database, API server, authentication, or framework-heavy dependencies without a documented need.
- Do not invent API keys, payment credentials, contact details, affiliate relationships, or marketplace integrations.
- Keep personal customer data in the browser and out of analytics.
- Add tests for calculation logic and CSV edge cases.
- Keep documentation and `README.md` up to date.
- Do not claim deployment, indexing, payment setup, or affiliate approval succeeded unless it was actually verified.

At completion, report:
- Files created or changed.
- Implemented features and deferred scope.
- Commands and tests executed, including their results.
- Build and deployment instructions.
- Any manual setup required in GitHub, Cloudflare, Search Console, checkout, or affiliate platforms.
- Known limitations and recommended next steps.

---

## 17. Official References

Verify current documentation and terms before relying on plan limits or deployment behavior:

- Astro documentation: https://docs.astro.build/
- Cloudflare Pages: https://developers.cloudflare.com/pages/
- Cloudflare Pages custom domains: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Google Search Central SEO starter guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Console: https://search.google.com/search-console/about
- Google Keyword Planner: https://ads.google.com/home/tools/keyword-planner/

---

**End of plan.**
