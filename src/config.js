/**
 * Central site and business configuration.
 *
 * Values left as `null` are not configured yet. They are never rendered as
 * placeholder text; fields without a real value are simply hidden.
 * Fill these in with real details before launch (see PLAN.md §0.7).
 */

export const SITE = {
  name: 'Kukirim Tools',
  url: 'https://tools.kukirim.com',
  mainSiteUrl: 'https://kukirim.com',
  /** Set to true only once kukirim.com is deployed; the footer link appears automatically. */
  mainSiteLive: false,
  tagline: 'Tools Gratis untuk Seller Online Indonesia',
  description:
    'Tools gratis untuk seller online Indonesia: kalkulator keuntungan, generator label paket, dan template spreadsheet. Tanpa daftar akun, diproses di browser Anda.',
  lang: 'id',
};

/** @type {{ businessName: string | null, email: string | null, whatsapp: string | null, instagram: string | null }} */
export const CONTACT = {
  businessName: 'Kukirim Digital',
  email: 'jey.owner@gmail.com',
  whatsapp: null,
  instagram: null,
};

/** Values that must be set before launch. */
export const REQUIRED_FOR_LAUNCH = /** @type {const} */ (['businessName', 'email']);

/**
 * Internal status of the plain-language legal drafts (/privasi/, /syarat-ketentuan/).
 * Never rendered. Set to true after the owner's review (incl. UU PDP); the
 * launch check fails until then.
 */
export const LEGAL_REVIEW = {
  privacy: true,
  terms: true,
};

/**
 * Site pages in navigation order. `ready` is flipped to true when the page
 * exists, so links to unbuilt pages are never rendered. Pages with `nav` are
 * shown in the header and on the homepage, grouped by `kind`.
 * @type {{ path: string, label: string, ready: boolean, nav?: boolean, kind?: 'tool' | 'template', summary?: string }[]}
 */
export const PAGES = [
  {
    path: '/kalkulator-keuntungan/',
    label: 'Kalkulator Keuntungan',
    ready: true,
    nav: true,
    kind: 'tool',
    summary: 'Hitung laba bersih, margin, dan harga impas setelah diskon, biaya marketplace, ongkir, dan kemasan.',
  },
  {
    path: '/generator-label-paket/',
    label: 'Generator Label Paket',
    ready: true,
    nav: true,
    kind: 'tool',
    summary: 'Buat label alamat dari isian manual atau file CSV, lalu cetak di kertas thermal 100 × 150 mm atau A4.',
  },
  {
    path: '/template-pembukuan-online-shop/',
    label: 'Template Pembukuan',
    ready: true,
    nav: true,
    kind: 'template',
    summary: 'Catat pemasukan dan pengeluaran toko, lalu lihat laba per bulan dan per kategori secara otomatis.',
  },
  {
    path: '/template-manajemen-order/',
    label: 'Template Manajemen Order',
    ready: true,
    nav: true,
    kind: 'template',
    summary: 'Kumpulkan pesanan dari semua channel dan pantau mana yang sudah dibayar dan perlu dikirim.',
  },
  { path: '/tentang/', label: 'Tentang', ready: true },
  { path: '/kontak/', label: 'Kontak', ready: true },
  { path: '/privasi/', label: 'Kebijakan Privasi', ready: true },
  { path: '/syarat-ketentuan/', label: 'Syarat & Ketentuan', ready: true },
];

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isSet(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Contact fields that have real values, ready for display.
 * @param {Record<string, string | null>} [contact]
 * @returns {{ key: string, label: string, value: string, href: string }[]}
 */
export function getContactFields(contact = CONTACT) {
  /** @type {{ key: string, label: string, href: (v: string) => string }[]} */
  const fields = [
    { key: 'email', label: 'Email', href: (v) => `mailto:${v}` },
    { key: 'whatsapp', label: 'WhatsApp', href: (v) => `https://wa.me/${v.replace(/\D/g, '')}` },
    { key: 'instagram', label: 'Instagram', href: (v) => `https://instagram.com/${v.replace(/^@/, '')}` },
  ];
  return fields
    .filter((f) => isSet(contact[f.key]))
    .map((f) => {
      const value = /** @type {string} */ (contact[f.key]).trim();
      return { key: f.key, label: f.label, value, href: f.href(value) };
    });
}

/**
 * Required launch values that are still unset.
 * @param {Record<string, string | null>} [contact]
 * @returns {string[]}
 */
export function missingLaunchValues(contact = CONTACT) {
  return REQUIRED_FOR_LAUNCH.filter((key) => !isSet(contact[key]));
}

/**
 * Pages that exist and may be linked.
 * @param {typeof PAGES} [pages]
 */
export function readyPages(pages = PAGES) {
  return pages.filter((p) => p.ready);
}
