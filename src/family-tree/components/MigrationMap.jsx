/**
 * MigrationMap — Leaflet map of family places with arrows for moves.
 * Loaded on demand (Leaflet is only downloaded when the map is opened).
 * Map tiles © OpenStreetMap contributors.
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const ACCENT = '#E56515';

export default function MigrationMap({ places, moves, coords, onSelectPlace }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = L.map(containerRef.current, { scrollWheelZoom: true, worldCopyJump: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const layer = L.layerGroup().addTo(map);
    const points = [];

    moves.forEach((move) => {
      const a = coords[move.from];
      const b = coords[move.to];
      if (!a || !b) return;
      L.polyline(
        [
          [a.lat, a.lng],
          [b.lat, b.lng],
        ],
        { color: ACCENT, weight: Math.min(2 + move.people.length, 8), opacity: 0.7, dashArray: '6 6' }
      )
        .bindTooltip(`${move.fromName} → ${move.toName}: ${move.people.length} ${move.people.length === 1 ? 'person' : 'people'}`)
        .addTo(layer);
      // Arrow head at the destination.
      L.circleMarker([b.lat, b.lng], { radius: 3, color: ACCENT, fillColor: ACCENT, fillOpacity: 1 }).addTo(layer);
    });

    places.forEach((place) => {
      const c = coords[place.key];
      if (!c) return;
      const count = new Set([...place.born, ...place.living]).size;
      points.push([c.lat, c.lng]);
      L.circleMarker([c.lat, c.lng], {
        radius: Math.min(6 + count * 2, 22),
        color: '#FFFFFF',
        weight: 2,
        fillColor: ACCENT,
        fillOpacity: 0.85,
      })
        .bindTooltip(`${place.name}: ${place.born.length} born, ${place.living.length} living`, { direction: 'top' })
        .on('click', () => onSelectPlace?.(place.key))
        .addTo(layer);
    });

    if (points.length === 1) map.setView(points[0], 9);
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 10 });
    else map.setView([17.4, 78.5], 6); // Telangana / Andhra Pradesh

    return () => layer.remove();
  }, [places, moves, coords, onSelectPlace]);

  return <div ref={containerRef} className="ft-migration-map" role="region" aria-label="Map of family places" />;
}
