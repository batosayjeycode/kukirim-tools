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
  mainSiteUrl: 'https://kukirim.com/',
  /** Set to true only once kukirim.com is deployed; the footer link appears automatically. */
  mainSiteLive: true,
  tagline: 'Tools Gratis untuk Seller Online Indonesia',
  description:
    'Tools gratis untuk seller online Indonesia: kalkulator keuntungan, generator label paket, dan template spreadsheet. Tanpa daftar akun, diproses di browser Anda.',
  lang: 'id',
  /** Sitemap lastmod (YYYY-MM-DD) for the homepage; update when its content changes. */
  homeUpdated: '2026-11-08',
};

/** @type {{ businessName: string | null, email: string | null, whatsapp: string | null, instagram: string | null }} */
export const CONTACT = {
  businessName: 'Kukirim Digital',
  email: 'halo@kukirim.com',
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
 * Published guides on kukirim.com that pair with a tool (linked from tool pages).
 * Add a guide here only after it is live on kukirim.com.
 */
const GUIDES = {
  hargaJual: {
    title: 'Cara Menentukan Harga Jual Online Shop agar Untung',
    url: 'https://kukirim.com/panduan/cara-menentukan-harga-jual/',
  },
  pembukuan: {
    title: 'Cara Membuat Pembukuan Online Shop Sederhana',
    url: 'https://kukirim.com/panduan/cara-membuat-pembukuan-online-shop/',
  },
  label: {
    title: 'Cara Membuat dan Mencetak Label Pengiriman Paket',
    url: 'https://kukirim.com/panduan/cara-membuat-label-pengiriman-paket/',
  },
  pesanan: {
    title: 'Cara Mengelola Pesanan Online Shop dari Banyak Channel',
    url: 'https://kukirim.com/panduan/cara-mengelola-pesanan-online-shop/',
  },
  bep: {
    title: 'Cara Menghitung BEP (Titik Impas) Online Shop',
    url: 'https://kukirim.com/panduan/cara-menghitung-bep-online-shop/',
  },
  roas: {
    title: 'Cara Menghitung ROAS Impas agar Iklan Tidak Rugi',
    url: 'https://kukirim.com/panduan/cara-menghitung-roas-impas-iklan/',
  },
};

/**
 * Site pages in navigation order. `ready` is flipped to true when the page
 * exists, so links to unbuilt pages are never rendered. Pages with `nav` are
 * shown in the header and on the homepage, grouped by `kind`. `updated`
 * (YYYY-MM-DD) is the sitemap lastmod: the date the page's visible content
 * last changed. `guides` are companion guides on kukirim.com shown as
 * "Panduan terkait"; list only published guides.
 * @typedef {{ title: string, url: string }} Guide
 * @type {{ path: string, label: string, ready: boolean, updated: string, nav?: boolean, kind?: 'tool' | 'template', summary?: string, guides?: Guide[] }[]}
 */
export const PAGES = [
  {
    path: '/kalkulator-keuntungan/',
    label: 'Kalkulator Keuntungan',
    ready: true,
    updated: '2026-11-08',
    nav: true,
    kind: 'tool',
    summary: 'Hitung laba bersih, margin, harga impas, dan harga jual untuk target margin setelah diskon dan biaya marketplace.',
    guides: [GUIDES.hargaJual, GUIDES.roas, GUIDES.pembukuan],
  },
  {
    path: '/kalkulator-bep/',
    label: 'Kalkulator BEP',
    ready: true,
    updated: '2026-11-08',
    nav: true,
    kind: 'tool',
    summary: 'Hitung berapa unit dan berapa rupiah penjualan per bulan yang dibutuhkan untuk menutup biaya tetap toko.',
    guides: [GUIDES.bep, GUIDES.hargaJual, GUIDES.pembukuan],
  },
  {
    path: '/generator-label-paket/',
    label: 'Generator Label Paket',
    ready: true,
    updated: '2026-11-03',
    nav: true,
    kind: 'tool',
    summary: 'Buat label alamat dari isian manual atau file CSV, lalu cetak di kertas thermal 100 × 150 mm atau A4.',
    guides: [GUIDES.label, GUIDES.pesanan],
  },
  {
    path: '/template-pembukuan-online-shop/',
    label: 'Template Pembukuan',
    ready: true,
    updated: '2026-11-03',
    nav: true,
    kind: 'template',
    summary: 'Catat pemasukan dan pengeluaran toko, lalu lihat laba per bulan dan per kategori secara otomatis.',
    guides: [GUIDES.pembukuan, GUIDES.hargaJual],
  },
  {
    path: '/template-manajemen-order/',
    label: 'Template Manajemen Order',
    ready: true,
    updated: '2026-11-03',
    nav: true,
    kind: 'template',
    summary: 'Rekap pesanan dari semua channel dan pantau mana yang sudah dibayar dan perlu dikirim.',
    guides: [GUIDES.pesanan, GUIDES.label],
  },
  { path: '/tentang/', label: 'Tentang', ready: true, updated: '2026-11-03' },
  { path: '/kontak/', label: 'Kontak', ready: true, updated: '2026-11-03' },
  { path: '/privasi/', label: 'Kebijakan Privasi', ready: true, updated: '2026-10-30' },
  { path: '/syarat-ketentuan/', label: 'Syarat & Ketentuan', ready: true, updated: '2026-10-26' },
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
