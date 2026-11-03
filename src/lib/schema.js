/**
 * Schema.org JSON-LD nodes for BaseLayout's `jsonLd` prop.
 * The organization node points at the brand entity defined on kukirim.com
 * (same @id), so both sites describe one publisher.
 */

const MAIN_SITE = 'https://kukirim.com';
const TOOLS_SITE = 'https://tools.kukirim.com';

/** Reference to the Kukirim organization defined on https://kukirim.com/. */
export const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${MAIN_SITE}/#organization`,
  name: 'Kukirim',
  alternateName: 'Kukirim Digital',
  url: `${MAIN_SITE}/`,
};

/**
 * WebSite node for the tools homepage.
 * @param {{ name: string, description: string }} site
 */
export function webSite({ name, description }) {
  return {
    '@type': 'WebSite',
    '@id': `${TOOLS_SITE}/#website`,
    name,
    description,
    url: `${TOOLS_SITE}/`,
    inLanguage: 'id-ID',
    publisher: { '@id': ORGANIZATION['@id'] },
  };
}

/**
 * Free browser tool (WebApplication) on tools.kukirim.com.
 * @param {{ name: string, path: string, description: string, featureList?: string[] }} app
 */
export function webApplication({ name, path, description, featureList }) {
  return {
    '@type': 'WebApplication',
    '@id': `${TOOLS_SITE}${path}#app`,
    name,
    description,
    url: `${TOOLS_SITE}${path}`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires JavaScript.',
    inLanguage: 'id-ID',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR' },
    ...(featureList?.length ? { featureList } : {}),
    isPartOf: { '@id': `${TOOLS_SITE}/#website` },
    publisher: { '@id': ORGANIZATION['@id'] },
  };
}
