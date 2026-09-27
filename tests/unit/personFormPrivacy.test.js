import { describe, it, expect } from 'vitest';
import { getPersonInitialState, preparePersonUpdates } from '../../src/family-tree/utils/personFormHelpers.js';

describe('private switch in the person form', () => {
  it('reads the current setting', () => {
    expect(getPersonInitialState({ firstName: 'N', privacy: 'private' }).isPrivate).toBe(true);
    expect(getPersonInitialState({ firstName: 'N', privacy: 'family' }).isPrivate).toBe(false);
  });

  it('saves private / back to family, and keeps it when the form does not say', () => {
    expect(preparePersonUpdates({ firstName: 'N', isPrivate: true }, {}).privacy).toBe('private');
    expect(preparePersonUpdates({ firstName: 'N', isPrivate: false }, { privacy: 'private' }).privacy).toBe('family');
    expect(preparePersonUpdates({ firstName: 'N', isPrivate: false }, { privacy: 'public' }).privacy).toBe('public');
    expect(preparePersonUpdates({ firstName: 'N' }, { privacy: 'private' }).privacy).toBe('private');
  });
});
