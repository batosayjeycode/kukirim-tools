import { describe, it, expect } from 'vitest';
import { CONTACT, PAGES, getContactFields, missingLaunchValues, readyPages } from '../src/config.js';

describe('getContactFields', () => {
  it('hides every field while contact details are unset', () => {
    expect(getContactFields({ email: null, whatsapp: null, instagram: null })).toEqual([]);
  });

  it('hides blank strings and placeholder-like whitespace', () => {
    expect(getContactFields({ email: '   ', whatsapp: '', instagram: null })).toEqual([]);
  });

  it('returns only configured fields with safe hrefs', () => {
    const fields = getContactFields({ email: ' halo@example.com ', whatsapp: '+62 812-0000-0000', instagram: '@contoh' });
    expect(fields).toEqual([
      { key: 'email', label: 'Email', value: 'halo@example.com', href: 'mailto:halo@example.com' },
      { key: 'whatsapp', label: 'WhatsApp', value: '+62 812-0000-0000', href: 'https://wa.me/6281200000000' },
      { key: 'instagram', label: 'Instagram', value: '@contoh', href: 'https://instagram.com/contoh' },
    ]);
  });

  it('shipped contact details are well-formed, not placeholders', () => {
    const values = Object.values(CONTACT).filter((v) => v !== null);
    for (const v of values) expect(v).not.toMatch(/example\.|contoh|belum diisi|\[|\]|todo|xxx/i);
    if (CONTACT.email !== null) expect(CONTACT.email).toMatch(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i);
  });
});

describe('missingLaunchValues', () => {
  it('lists required values that are unset', () => {
    expect(missingLaunchValues({ businessName: null, email: null })).toEqual(['businessName', 'email']);
    expect(missingLaunchValues({ businessName: 'Toko', email: 'a@b.co' })).toEqual([]);
  });
});

describe('readyPages', () => {
  it('only exposes pages marked ready', () => {
    expect(readyPages([{ path: '/a/', label: 'A', ready: true }, { path: '/b/', label: 'B', ready: false }])).toEqual([
      { path: '/a/', label: 'A', ready: true },
    ]);
  });

  it('uses trailing-slash paths for every page', () => {
    for (const p of PAGES) expect(p.path).toMatch(/^\/.*\/$/);
  });
});
