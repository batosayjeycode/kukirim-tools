import { describe, it, expect } from 'vitest';
import { ORGANIZATION, webApplication, webSite } from '../src/lib/schema.js';

describe('schema', () => {
  it('references the kukirim.com organization entity', () => {
    expect(ORGANIZATION['@id']).toBe('https://kukirim.com/#organization');
    expect(webSite({ name: 'Kukirim Tools', description: 'x' }).publisher).toEqual({ '@id': ORGANIZATION['@id'] });
  });

  it('describes a free web application at its canonical URL', () => {
    const app = webApplication({ name: 'Kalkulator', path: '/kalkulator-keuntungan/', description: 'd', featureList: ['a'] });
    expect(app).toMatchObject({
      '@type': 'WebApplication',
      url: 'https://tools.kukirim.com/kalkulator-keuntungan/',
      applicationCategory: 'BusinessApplication',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR' },
      featureList: ['a'],
      isPartOf: { '@id': 'https://tools.kukirim.com/#website' },
    });
    expect(webApplication({ name: 'n', path: '/a/', description: 'd' })).not.toHaveProperty('featureList');
  });
});
