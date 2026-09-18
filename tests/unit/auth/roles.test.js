import { describe, it, expect } from 'vitest';
import {
  canViewFamily,
  canCreateFamilyData,
  canEditFamilyData,
  canDeleteFamilyData,
  canManageFamily,
  canManageMembers,
  canAddPerson,
  canEditPerson,
  canDeletePerson,
  canAddRelative,
  canAddStory,
  canDeleteStory,
  canAddLifeEvent,
  canDeleteLifeEvent,
  canUploadMedia,
  canDeleteMedia,
  canUploadDocument,
  canDeleteDocument,
  isValidRole
} from '../../../src/family-tree/auth/roles.js';

describe('Role Permission Validation', () => {
  describe('isValidRole', () => {
    it('recognizes all four valid roles', () => {
      expect(isValidRole('owner')).toBe(true);
      expect(isValidRole('editor')).toBe(true);
      expect(isValidRole('contributor')).toBe(true);
      expect(isValidRole('viewer')).toBe(true);
    });

    it('rejects invalid roles', () => {
      expect(isValidRole('admin')).toBe(false);
      expect(isValidRole('user')).toBe(false);
      expect(isValidRole('member')).toBe(false);
      expect(isValidRole('guest')).toBe(false);
    });

    it('rejects null and undefined', () => {
      expect(isValidRole(null)).toBe(false);
      expect(isValidRole(undefined)).toBe(false);
      expect(isValidRole('')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(isValidRole('OWNER')).toBe(true);
      expect(isValidRole('Editor')).toBe(true);
      expect(isValidRole('CONTRIBUTOR')).toBe(true);
      expect(isValidRole('Viewer')).toBe(true);
    });
  });
});

describe('OWNER Role', () => {
  const role = 'owner';

  it('can view family', () => {
    expect(canViewFamily(role)).toBe(true);
  });

  it('can create family data', () => {
    expect(canCreateFamilyData(role)).toBe(true);
  });

  it('can edit family data', () => {
    expect(canEditFamilyData(role)).toBe(true);
  });

  it('can delete family data', () => {
    expect(canDeleteFamilyData(role)).toBe(true);
  });

  it('can manage family', () => {
    expect(canManageFamily(role)).toBe(true);
  });

  it('can manage members', () => {
    expect(canManageMembers(role)).toBe(true);
  });

  it('can add person', () => {
    expect(canAddPerson(role)).toBe(true);
  });

  it('can edit person', () => {
    expect(canEditPerson(role)).toBe(true);
  });

  it('can delete person', () => {
    expect(canDeletePerson(role)).toBe(true);
  });

  it('can add relative', () => {
    expect(canAddRelative(role)).toBe(true);
  });

  it('can add story', () => {
    expect(canAddStory(role)).toBe(true);
  });

  it('can delete story', () => {
    expect(canDeleteStory(role)).toBe(true);
  });

  it('can add life event', () => {
    expect(canAddLifeEvent(role)).toBe(true);
  });

  it('can delete life event', () => {
    expect(canDeleteLifeEvent(role)).toBe(true);
  });

  it('can upload media', () => {
    expect(canUploadMedia(role)).toBe(true);
  });

  it('can delete media', () => {
    expect(canDeleteMedia(role)).toBe(true);
  });

  it('can upload document', () => {
    expect(canUploadDocument(role)).toBe(true);
  });

  it('can delete document', () => {
    expect(canDeleteDocument(role)).toBe(true);
  });
});

describe('EDITOR Role', () => {
  const role = 'editor';

  it('can view family', () => {
    expect(canViewFamily(role)).toBe(true);
  });

  it('can create family data', () => {
    expect(canCreateFamilyData(role)).toBe(true);
  });

  it('can edit family data', () => {
    expect(canEditFamilyData(role)).toBe(true);
  });

  it('can delete family data', () => {
    expect(canDeleteFamilyData(role)).toBe(true);
  });

  it('CANNOT manage family', () => {
    expect(canManageFamily(role)).toBe(false);
  });

  it('CANNOT manage members', () => {
    expect(canManageMembers(role)).toBe(false);
  });

  it('can add person', () => {
    expect(canAddPerson(role)).toBe(true);
  });

  it('can edit person', () => {
    expect(canEditPerson(role)).toBe(true);
  });

  it('can delete person', () => {
    expect(canDeletePerson(role)).toBe(true);
  });

  it('can add relative', () => {
    expect(canAddRelative(role)).toBe(true);
  });

  it('can add story', () => {
    expect(canAddStory(role)).toBe(true);
  });

  it('can delete story', () => {
    expect(canDeleteStory(role)).toBe(true);
  });

  it('can add life event', () => {
    expect(canAddLifeEvent(role)).toBe(true);
  });

  it('can delete life event', () => {
    expect(canDeleteLifeEvent(role)).toBe(true);
  });

  it('can upload media', () => {
    expect(canUploadMedia(role)).toBe(true);
  });

  it('can delete media', () => {
    expect(canDeleteMedia(role)).toBe(true);
  });

  it('can upload document', () => {
    expect(canUploadDocument(role)).toBe(true);
  });

  it('can delete document', () => {
    expect(canDeleteDocument(role)).toBe(true);
  });
});

describe('CONTRIBUTOR Role', () => {
  const role = 'contributor';

  it('can view family', () => {
    expect(canViewFamily(role)).toBe(true);
  });

  it('can create family data (stories/events/photos/docs)', () => {
    expect(canCreateFamilyData(role)).toBe(true);
  });

  it('can edit family data', () => {
    expect(canEditFamilyData(role)).toBe(true);
  });

  it('CANNOT delete family data', () => {
    expect(canDeleteFamilyData(role)).toBe(false);
  });

  it('CANNOT manage family', () => {
    expect(canManageFamily(role)).toBe(false);
  });

  it('CANNOT manage members', () => {
    expect(canManageMembers(role)).toBe(false);
  });

  it('CANNOT add person', () => {
    expect(canAddPerson(role)).toBe(false);
  });

  it('CANNOT edit person', () => {
    expect(canEditPerson(role)).toBe(false);
  });

  it('CANNOT delete person', () => {
    expect(canDeletePerson(role)).toBe(false);
  });

  it('CANNOT add relative', () => {
    expect(canAddRelative(role)).toBe(false);
  });

  it('can add story', () => {
    expect(canAddStory(role)).toBe(true);
  });

  it('CANNOT delete story', () => {
    expect(canDeleteStory(role)).toBe(false);
  });

  it('can add life event', () => {
    expect(canAddLifeEvent(role)).toBe(true);
  });

  it('CANNOT delete life event', () => {
    expect(canDeleteLifeEvent(role)).toBe(false);
  });

  it('can upload media', () => {
    expect(canUploadMedia(role)).toBe(true);
  });

  it('CANNOT delete media', () => {
    expect(canDeleteMedia(role)).toBe(false);
  });

  it('can upload document', () => {
    expect(canUploadDocument(role)).toBe(true);
  });

  it('CANNOT delete document', () => {
    expect(canDeleteDocument(role)).toBe(false);
  });
});

describe('VIEWER Role', () => {
  const role = 'viewer';

  it('can view family tree', () => {
    expect(canViewFamily(role)).toBe(true);
  });

  it('CANNOT create family data', () => {
    expect(canCreateFamilyData(role)).toBe(false);
  });

  it('CANNOT edit family data', () => {
    expect(canEditFamilyData(role)).toBe(false);
  });

  it('CANNOT delete family data', () => {
    expect(canDeleteFamilyData(role)).toBe(false);
  });

  it('CANNOT manage family', () => {
    expect(canManageFamily(role)).toBe(false);
  });

  it('CANNOT manage members', () => {
    expect(canManageMembers(role)).toBe(false);
  });

  it('CANNOT add person', () => {
    expect(canAddPerson(role)).toBe(false);
  });

  it('CANNOT edit person', () => {
    expect(canEditPerson(role)).toBe(false);
  });

  it('CANNOT delete person', () => {
    expect(canDeletePerson(role)).toBe(false);
  });

  it('CANNOT add relative', () => {
    expect(canAddRelative(role)).toBe(false);
  });

  it('CANNOT add story', () => {
    expect(canAddStory(role)).toBe(false);
  });

  it('CANNOT delete story', () => {
    expect(canDeleteStory(role)).toBe(false);
  });

  it('CANNOT add life event', () => {
    expect(canAddLifeEvent(role)).toBe(false);
  });

  it('CANNOT delete life event', () => {
    expect(canDeleteLifeEvent(role)).toBe(false);
  });

  it('CANNOT upload media', () => {
    expect(canUploadMedia(role)).toBe(false);
  });

  it('CANNOT delete media', () => {
    expect(canDeleteMedia(role)).toBe(false);
  });

  it('CANNOT upload document', () => {
    expect(canUploadDocument(role)).toBe(false);
  });

  it('CANNOT delete document', () => {
    expect(canDeleteDocument(role)).toBe(false);
  });
});

describe('Role Case Insensitivity', () => {
  it('handles uppercase roles correctly', () => {
    expect(canViewFamily('OWNER')).toBe(true);
    expect(canCreateFamilyData('EDITOR')).toBe(true);
    expect(canAddStory('CONTRIBUTOR')).toBe(true);
    expect(canViewFamily('VIEWER')).toBe(true);
  });

  it('handles mixed case roles correctly', () => {
    expect(canManageFamily('Owner')).toBe(true);
    expect(canAddPerson('Editor')).toBe(true);
    expect(canAddLifeEvent('Contributor')).toBe(true);
    expect(canAddPerson('Viewer')).toBe(false);
  });
});

describe('Null Role Safety', () => {
  it('safely handles null role', () => {
    expect(canViewFamily(null)).toBe(false);
    expect(canCreateFamilyData(null)).toBe(false);
    expect(canManageFamily(null)).toBe(false);
    expect(canAddPerson(null)).toBe(false);
  });

  it('safely handles undefined role', () => {
    expect(canViewFamily(undefined)).toBe(false);
    expect(canCreateFamilyData(undefined)).toBe(false);
    expect(canManageFamily(undefined)).toBe(false);
    expect(canAddPerson(undefined)).toBe(false);
  });

  it('safely handles empty string role', () => {
    expect(canViewFamily('')).toBe(false);
    expect(canCreateFamilyData('')).toBe(false);
    expect(canManageFamily('')).toBe(false);
    expect(canAddPerson('')).toBe(false);
  });
});
