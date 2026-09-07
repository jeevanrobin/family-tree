/**
 * ID Mapper — Maps local string IDs to Supabase UUIDs during migration.
 *
 * Local IDs (e.g., "gg-ramaiah", "person-1788335692146-gunp4e") are not valid UUIDs.
 * The database generates real UUIDs; this module tracks the mapping.
 */

export class IdMapper {
  constructor() {
    this._map = new Map();
  }

  set(localId, uuid) {
    this._map.set(localId, uuid);
  }

  get(localId) {
    return this._map.get(localId) || null;
  }

  resolve(localId) {
    const uuid = this._map.get(localId);
    if (!uuid) {
      throw new Error(`IdMapper: No UUID mapping found for local ID "${localId}"`);
    }
    return uuid;
  }

  resolveOptional(localId) {
    return this._map.get(localId) || null;
  }

  resolveArray(localIds) {
    return (localIds || [])
      .map((id) => this._map.get(id))
      .filter(Boolean);
  }

  has(localId) {
    return this._map.has(localId);
  }

  get size() {
    return this._map.size;
  }

  toJSON() {
    return Object.fromEntries(this._map);
  }

  static fromJSON(obj) {
    const mapper = new IdMapper();
    for (const [key, val] of Object.entries(obj)) {
      mapper.set(key, val);
    }
    return mapper;
  }
}
