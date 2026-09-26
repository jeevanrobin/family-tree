import { describe, it, expect } from 'vitest';
import { buildTreePosterSvg, wrapName, escapeXml } from '../../../src/family-tree/poster/treePoster.js';
import intermarried from '../../fixtures/intermarried-family.json';

describe('tree poster', () => {
  it('draws every person, connector and the title', () => {
    const { svg, count, width, height } = buildTreePosterSvg(intermarried, { title: 'Medida Family', subtitle: 'Muthagudem · 2026' });
    expect(count).toBe(intermarried.people.length);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Medida Family');
    expect(svg).toContain('Muthagudem · 2026');
    expect((svg.match(/<rect x=/g) || []).length).toBeGreaterThanOrEqual(intermarried.people.length);
    expect(svg).toContain('stroke-dasharray="8 6"'); // cross-family link
    expect(width).toBeGreaterThan(900);
    expect(height).toBeGreaterThan(600);
  });

  it('escapes names so the SVG stays valid', () => {
    const { svg } = buildTreePosterSvg({
      people: [{ id: 'a', displayName: 'A <script> & "B"', firstName: 'A' }],
      relationships: [],
    });
    expect(svg).toContain('A &lt;script&gt; &amp; &quot;B&quot;');
    expect(svg).not.toContain('<script>');
  });

  it('shows years and optionally places', () => {
    const family = {
      people: [{ id: 'a', displayName: 'Ravi', dateOfBirth: '1950-01-01', dateOfDeath: '2010-05-05', livingStatus: 'deceased', placeOfBirth: 'Warangal' }],
      relationships: [],
    };
    expect(buildTreePosterSvg(family).svg).toContain('1950 – 2010');
    expect(buildTreePosterSvg(family).svg).not.toContain('Warangal');
    expect(buildTreePosterSvg(family, { showPlaces: true }).svg).toContain('Warangal');
    expect(buildTreePosterSvg(family, { showYears: false }).svg).not.toContain('1950');
  });

  it('wraps long names onto two lines', () => {
    expect(wrapName('Venkata Ramaiah Singireddy')).toEqual(['Venkata Ramaiah', 'Singireddy']);
    expect(wrapName('Short')).toEqual(['Short']);
    expect(wrapName('A very long name that keeps going on and on')[1].endsWith('…')).toBe(true);
  });

  it('escapes all XML special characters', () => {
    expect(escapeXml(`<&>"'`)).toBe('&lt;&amp;&gt;&quot;&apos;');
  });
});

describe('tree poster wording', () => {
  it('marks relatives who have passed away as "Late", without religious symbols', () => {
    const { svg } = buildTreePosterSvg({
      people: [{ id: 'a', displayName: 'Ramaiah Medida', livingStatus: 'deceased' }],
      relationships: [],
    });
    expect(svg).toContain('>Late<');
    expect(svg).not.toMatch(/[✝†]/);
  });
});
