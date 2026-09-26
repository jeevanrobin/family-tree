import { describe, it, expect } from 'vitest';
import { exportGedcom, importGedcom, isoToGedcomDate, gedcomDateToIso } from '../../../src/family-tree/gedcom/gedcom.js';
import intermarried from '../../fixtures/intermarried-family.json';

const family = {
  people: [
    { id: 'a', firstName: 'Ramaiah', middleName: '', lastName: 'Medida', displayName: 'Ramaiah Medida', gender: 'male', livingStatus: 'deceased', dateOfBirth: '1930-03-05', dateOfDeath: null, placeOfBirth: 'Muthagudem', occupation: 'Farmer', currentLocation: '', biography: 'Line one\nLine two', notes: '' },
    { id: 'b', firstName: 'Lalithamma', lastName: 'Medida', displayName: 'Lalithamma Medida', gender: 'female', livingStatus: 'deceased', dateOfBirth: null, dateOfDeath: '2009-05-09', placeOfBirth: 'Edulapuram' },
    { id: 'c', firstName: 'Venkata Reddy', lastName: 'Medida', displayName: 'Venkata Reddy Medida', gender: 'male', livingStatus: 'alive', dateOfBirth: '1969-07-10', currentLocation: 'Muthagudem' },
    { id: 'd', firstName: 'Neeraja', lastName: 'Ponnala', displayName: 'Neeraja Ponnala', gender: 'female', livingStatus: 'alive' },
  ],
  relationships: [
    { id: 'r1', type: 'spouse', personAId: 'a', personBId: 'b', startDate: '1955-02-01' },
    { id: 'r2', type: 'parent-child', parentId: 'a', childId: 'c' },
    { id: 'r3', type: 'parent-child', parentId: 'b', childId: 'c' },
    { id: 'r4', type: 'parent-child', parentId: 'a', childId: 'd' }, // only father recorded
  ],
};

describe('GEDCOM dates', () => {
  it('converts exact dates both ways', () => {
    expect(isoToGedcomDate('1969-07-10')).toBe('10 JUL 1969');
    expect(gedcomDateToIso('10 JUL 1969')).toBe('1969-07-10');
    expect(gedcomDateToIso('ABT 1969')).toBeNull();
    expect(isoToGedcomDate(null)).toBeNull();
  });
});

describe('exportGedcom', () => {
  const ged = exportGedcom(family, { now: new Date('2026-09-26T00:00:00Z') });

  it('writes a valid header and trailer', () => {
    expect(ged.startsWith('0 HEAD\n')).toBe(true);
    expect(ged).toContain('2 VERS 5.5.1');
    expect(ged).toContain('1 CHAR UTF-8');
    expect(ged.trim().endsWith('0 TRLR')).toBe(true);
  });

  it('writes people with names, sex, dates and places', () => {
    expect(ged).toContain('1 NAME Ramaiah /Medida/');
    expect(ged).toContain('1 SEX M');
    expect(ged).toContain('2 DATE 5 MAR 1930');
    expect(ged).toContain('2 PLAC Muthagudem');
    expect(ged).toContain('1 OCCU Farmer');
    expect(ged).toMatch(/1 DEAT Y/); // deceased without a date
    expect(ged).toContain('1 NOTE Line one\n2 CONT Line two');
  });

  it('writes couples and single-parent families', () => {
    expect(ged).toMatch(/0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 CHIL @I3@\n1 MARR\n2 DATE 1 FEB 1955/);
    expect(ged).toMatch(/0 @F2@ FAM\n1 HUSB @I1@\n1 CHIL @I4@/);
  });
});

describe('importGedcom', () => {
  it('round-trips people and relationships', () => {
    const { family: back, warnings } = importGedcom(exportGedcom(family));
    expect(warnings).toEqual([]);
    expect(back.people.map((p) => p.displayName)).toEqual(family.people.map((p) => p.displayName));
    const venkata = back.people.find((p) => p.firstName === 'Venkata');
    expect(venkata).toMatchObject({ middleName: 'Reddy', lastName: 'Medida', dateOfBirth: '1969-07-10', gender: 'male' });
    const count = (type) => back.relationships.filter((r) => r.type === type).length;
    expect(count('spouse')).toBe(1);
    expect(count('parent-child')).toBe(3);
    expect(back.relationships.find((r) => r.type === 'spouse').startDate).toBe('1955-02-01');
  });

  it('round-trips a large real-shaped tree', () => {
    const { family: back } = importGedcom(exportGedcom(intermarried));
    expect(back.people).toHaveLength(intermarried.people.length);
    expect(back.relationships).toHaveLength(intermarried.relationships.length);
  });

  it('reads files from other apps: approximate dates, CONC/CONT, BOM, CRLF', () => {
    const text = '﻿0 HEAD\r\n1 GEDC\r\n2 VERS 5.5.1\r\n0 @P1@ INDI\r\n1 NAME John /Smith/\r\n1 SEX M\r\n1 BIRT\r\n2 DATE ABT 1900\r\n1 NOTE First part\r\n2 CONC  continued\r\n0 @P2@ INDI\r\n1 NAME Mary /Jones/\r\n1 SEX F\r\n0 @F1@ FAM\r\n1 HUSB @P1@\r\n1 WIFE @P2@\r\n0 TRLR\r\n';
    const { family: back } = importGedcom(text);
    const john = back.people[0];
    expect(john).toMatchObject({ firstName: 'John', lastName: 'Smith', dateOfBirth: null });
    expect(john.notes).toContain('Birth date (from GEDCOM): ABT 1900');
    expect(john.notes).toContain('First part continued');
    expect(back.relationships).toHaveLength(1);
  });

  it('rejects files that are not GEDCOM', () => {
    expect(() => importGedcom('{"people": []}')).toThrow(/GEDCOM/);
  });

  it('warns about links to missing people instead of failing', () => {
    const text = '0 HEAD\n0 @P1@ INDI\n1 NAME A /B/\n0 @F1@ FAM\n1 HUSB @P1@\n1 CHIL @P9@\n0 TRLR\n';
    const { warnings } = importGedcom(text);
    expect(warnings[0]).toMatch(/missing person/);
  });
});

describe('GEDCOM import into the store', () => {
  it('produces data the regular backup import accepts', async () => {
    const { FamilyStore } = await import('../../../src/family-tree/store/FamilyStore.js');
    const store = new FamilyStore();
    const { family: back } = importGedcom(exportGedcom(intermarried));
    expect(store.importData(JSON.stringify({ schemaVersion: '2.0.0', family: back }))).toBe(true);
    expect(store.people.size).toBe(intermarried.people.length);
  });
});
