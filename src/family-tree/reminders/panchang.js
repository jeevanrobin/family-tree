/**
 * panchang — Telugu lunar date (masam, paksham, thithi) of a calendar day,
 * and the yearly thithi day of a date (for death anniversaries / thithi).
 *
 * Sun and Moon positions use the low-precision series from Meeus,
 * Astronomical Algorithms (Moon to ~0.3°), so a thithi that changes close
 * to the reference time can come out one day off. Calendar days are read at
 * 6:00 IST sunrise; death anniversaries (thithi / taddinam) at 2 PM IST,
 * the aparahna (afternoon) when the ceremony's thithi is reckoned. Months are amanta (new moon to new moon), as in Andhra Pradesh
 * and Telangana; an adhika (extra) month is skipped for anniversaries.
 */

const RAD = Math.PI / 180;
const norm = (x) => ((x % 360) + 360) % 360;

export const MASAMS = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada',
  'Ashvayuja', 'Kartika', 'Margashira', 'Pushya', 'Magha', 'Phalguna',
];
export const THITHIS = [
  'Padyami', 'Vidiya', 'Tadiya', 'Chavithi', 'Panchami', 'Shashti', 'Saptami',
  'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
];

export const SUNRISE_IST = 6;
export const APARAHNA_IST = 14;

/** Julian day of a time (hours, IST) on a calendar day. */
export function istJd(year, month, day, hourIst = SUNRISE_IST) {
  return Date.UTC(year, month - 1, day, hourIst - 5.5) / 86400000 + 2440587.5;
}

function sunLongitude(jd) {
  const T = (jd - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T;
  const M = (357.52911 + 35999.05029 * T) * RAD;
  const C = (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  return norm(L0 + C);
}

// Main periodic terms of the Moon's longitude (Meeus table 47.A): [D, M, M', F, coefficient in 1e-6 deg]
const MOON_TERMS = [
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689],
];

function moonLongitude(jd) {
  const T = (jd - 2451545) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T;
  const D = 297.8501921 + 445267.1114034 * T;
  const M = 357.5291092 + 35999.0502909 * T;
  const Mp = 134.9633964 + 477198.8675055 * T;
  const F = 93.272095 + 483202.0175233 * T;
  const E = 1 - 0.002516 * T;
  let sum = 0;
  for (const [d, m, mp, f, c] of MOON_TERMS) {
    const arg = (d * D + m * M + mp * Mp + f * F) * RAD;
    sum += c * Math.sin(arg) * (Math.abs(m) === 1 ? E : 1);
  }
  return norm(Lp + sum / 1e6);
}

const elongation = (jd) => norm(moonLongitude(jd) - sunLongitude(jd));

// Lahiri ayanamsa, close enough for which sign the Sun is in.
const ayanamsa = (jd) => 23.853 + ((jd - 2451545) / 365.25) * 0.013969;
const siderealSign = (jd) => Math.floor(norm(sunLongitude(jd) - ayanamsa(jd)) / 30);

/** The new moon nearest before jd (elongation 0). */
function previousNewMoon(jd) {
  let t = jd - elongation(jd) / 12.19;
  for (let i = 0; i < 6; i++) {
    let e = elongation(t);
    if (e > 180) e -= 360;
    t -= e / 12.19;
  }
  return t;
}

/** Masam of the lunar month containing jd: { index 0-11, adhika }. */
function masamAt(jd) {
  const start = previousNewMoon(jd);
  const end = previousNewMoon(start + 35);
  const signStart = siderealSign(start);
  const signEnd = siderealSign(end);
  // Amanta month named by the Sun's sign at its starting new moon:
  // Sun in Meena (11) → Chaitra (0). No sankranti inside → adhika.
  return { index: (signStart + 1) % 12, adhika: signStart === signEnd };
}

/**
 * Lunar date of a calendar day at a time of day (default sunrise).
 * @returns {{ masam, masamIndex, adhika, paksham: 'Shukla'|'Bahula', thithi, thithiNumber: 1-30 }}
 */
export function panchangOf(year, month, day, hourIst = SUNRISE_IST) {
  const jd = istJd(year, month, day, hourIst);
  const thithiNumber = Math.floor(elongation(jd) / 12) + 1; // 1..30
  const { index, adhika } = masamAt(jd);
  const inPaksham = ((thithiNumber - 1) % 15) + 1;
  return {
    masam: MASAMS[index],
    masamIndex: index,
    adhika,
    paksham: thithiNumber <= 15 ? 'Shukla' : 'Bahula',
    thithi: inPaksham === 15 ? (thithiNumber === 15 ? 'Pournami' : 'Amavasya') : THITHIS[inPaksham - 1],
    thithiNumber,
  };
}

export const describePanchang = (p) =>
  `${p.adhika ? 'Adhika ' : ''}${p.masam} ${p.paksham} ${p.thithi}`;

const parseIso = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
};

/**
 * The next day, from `today` on (within ~13 months), with the same masam and
 * thithi as `iso`, skipping adhika months. If that thithi is skipped in the
 * calendar that year (kshaya), the day it falls within is used.
 * @returns {{ date: Date, panchang: object } | null}
 */
export function nextThithiDay(iso, today = new Date(), hourIst = APARAHNA_IST, maxDays = 400) {
  const p = parseIso(iso);
  if (!p) return null;
  const target = panchangOf(p.y, p.m, p.d, hourIst);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let prev = null;
  for (let i = 0; i <= maxDays; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const cur = panchangOf(day.getFullYear(), day.getMonth() + 1, day.getDate(), hourIst);
    if (cur.masamIndex === target.masamIndex && !cur.adhika) {
      if (cur.thithiNumber === target.thithiNumber) return { date: day, panchang: target };
      // Kshaya: the thithi began and ended between two sunrises.
      if (prev && prev.thithiNumber < target.thithiNumber && cur.thithiNumber > target.thithiNumber) {
        return { date: day, panchang: target };
      }
    }
    prev = cur;
  }
  return null;
}
