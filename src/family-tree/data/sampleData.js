/**
 * Modern Sample Family Data — MEDIDA'S FAMILY
 * 4 Generations of the Medida Heritage (20 members)
 * Modern Premium Digital Family Platform dataset.
 */

import { createPerson, createRelationship, resetModelCounters } from './models.js';

resetModelCounters();

// ── GENERATION I: Great-Grandparents (1918–2005) ─────────────
const ggRamaiah = createPerson({
  id: 'gg-ramaiah',
  firstName: 'Ramaiah',
  middleName: '',
  lastName: 'Medida',
  displayName: 'Ramaiah Medida',
  gender: 'male',
  dateOfBirth: '1920-03-15',
  dateOfDeath: '1998-11-02',
  livingStatus: 'deceased',
  placeOfBirth: 'Warangal, Telangana',
  hometown: 'Warangal, Telangana',
  currentLocation: '',
  occupation: 'Agronomist & Village Elder',
  biography: 'Ramaiah Medida was a revered community leader in Warangal. He introduced sustainable canal irrigation methods to local farms and founded the village primary school in 1955.',
  notes: 'Preserved ancient Telugu palm-leaf manuscripts. Awarded civic honor in 1982.',
  photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const ggSaraswathi = createPerson({
  id: 'gg-saraswathi',
  firstName: 'Saraswathi',
  middleName: '',
  lastName: 'Medida',
  displayName: 'Saraswathi Medida',
  gender: 'female',
  dateOfBirth: '1924-07-22',
  dateOfDeath: '2005-01-18',
  livingStatus: 'deceased',
  placeOfBirth: 'Karimnagar, Telangana',
  hometown: 'Warangal, Telangana',
  currentLocation: '',
  occupation: 'Master Weaver & Herbalist',
  biography: 'Saraswathi was renowned for her mastery of Pochampally ikat weaving and extensive botanical knowledge of Ayurvedic herbal remedies.',
  notes: 'Won a regional handloom preservation award in 1974.',
  photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const ggNarasimha = createPerson({
  id: 'gg-narasimha',
  firstName: 'Narasimha',
  middleName: '',
  lastName: 'Reddy',
  displayName: 'Narasimha Reddy',
  gender: 'male',
  dateOfBirth: '1918-12-01',
  dateOfDeath: '1995-06-10',
  livingStatus: 'deceased',
  placeOfBirth: 'Nalgonda, Telangana',
  hometown: 'Nalgonda, Telangana',
  currentLocation: '',
  occupation: 'Senior Land Registrar',
  biography: 'Narasimha served for 35 years in the revenue and land registry, championing fair land tenancy documentation for rural families.',
  notes: 'Avid chess player and Sanskrit scholar.',
  photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const ggLakshmi = createPerson({
  id: 'gg-lakshmi',
  firstName: 'Lakshmi',
  middleName: '',
  lastName: 'Reddy',
  displayName: 'Lakshmi Reddy',
  gender: 'female',
  dateOfBirth: '1922-09-08',
  dateOfDeath: '2003-04-25',
  livingStatus: 'deceased',
  placeOfBirth: 'Khammam, Telangana',
  hometown: 'Nalgonda, Telangana',
  currentLocation: '',
  occupation: 'Headmistress & Educator',
  biography: 'Lakshmi was among the earliest female headmistresses in the district, advocating for girls secondary education across five taluks.',
  notes: 'Fluent in Telugu, Hindi, Kannada, and English.',
  photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

// ── GENERATION II: Grandparents (1945–Present) ───────────────
const gVenkat = createPerson({
  id: 'g-venkat',
  firstName: 'Venkat',
  middleName: 'Ramaiah',
  lastName: 'Medida',
  displayName: 'Venkat Ramaiah Medida',
  gender: 'male',
  dateOfBirth: '1948-05-20',
  dateOfDeath: '2020-08-14',
  livingStatus: 'deceased',
  placeOfBirth: 'Warangal, Telangana',
  hometown: 'Hyderabad, Telangana',
  currentLocation: '',
  occupation: 'Civil Infrastructure Engineer',
  biography: 'A graduate of Osmania University College of Engineering, Venkat designed reservoir dams, aqueducts, and municipal bridges across South India.',
  notes: 'Accomplished Carnatic flute player (Venu).',
  photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const gPadma = createPerson({
  id: 'g-padma',
  firstName: 'Padma',
  middleName: '',
  lastName: 'Medida',
  displayName: 'Padma Medida',
  gender: 'female',
  dateOfBirth: '1952-11-12',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Nalgonda, Telangana',
  hometown: 'Hyderabad, Telangana',
  currentLocation: 'Hyderabad, Telangana',
  occupation: 'Retired College Principal',
  biography: 'Professor of Comparative Literature and former Principal of St. Francis College. Author of two acclaimed monographs on South Indian medieval poetry.',
  notes: 'Currently curates the Medida family oral history archive.',
  photoUrl: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const gSrinivas = createPerson({
  id: 'g-srinivas',
  firstName: 'Srinivas',
  middleName: '',
  lastName: 'Kumar',
  displayName: 'Srinivas Kumar',
  gender: 'male',
  dateOfBirth: '1945-02-14',
  dateOfDeath: '2018-09-30',
  livingStatus: 'deceased',
  placeOfBirth: 'Rajahmundry, Andhra Pradesh',
  hometown: 'Visakhapatnam, Andhra Pradesh',
  currentLocation: '',
  occupation: 'Textile Merchant & Exporter',
  biography: 'Built a premier handloom export house connecting Godavari weavers with European textile houses. Dedicated patron of classical Kuchipudi dance.',
  notes: 'Trustee of Visakhapatnam Heritage Society.',
  photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const gAnnapurna = createPerson({
  id: 'g-annapurna',
  firstName: 'Annapurna',
  middleName: '',
  lastName: 'Kumar',
  displayName: 'Annapurna Kumar',
  gender: 'female',
  dateOfBirth: '1950-08-19',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Kakinada, Andhra Pradesh',
  hometown: 'Visakhapatnam, Andhra Pradesh',
  currentLocation: 'Visakhapatnam, Andhra Pradesh',
  occupation: 'Retired Bank Executive',
  biography: 'Pioneered rural microfinance programs across coastal Andhra Pradesh over a distinguished 34-year banking career.',
  notes: 'Expert organic horticulturist.',
  photoUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

// ── GENERATION III: Parents & In-laws (1972–1980) ────────────
const pSuresh = createPerson({
  id: 'p-suresh',
  firstName: 'Suresh',
  middleName: 'Venkat',
  lastName: 'Medida',
  displayName: 'Suresh Venkat Medida',
  gender: 'male',
  dateOfBirth: '1972-04-03',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Hyderabad, Telangana',
  hometown: 'Hyderabad, Telangana',
  currentLocation: 'Austin, Texas, USA',
  occupation: 'Professor of Quantum Physics',
  biography: 'Tenured professor at UT Austin specializing in quantum optics and nanophotonics. Fellow of the American Physical Society.',
  notes: 'Loves marathon running and telescope stargazing.',
  photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const pKavitha = createPerson({
  id: 'p-kavitha',
  firstName: 'Kavitha',
  middleName: '',
  lastName: 'Medida',
  displayName: 'Kavitha Medida',
  gender: 'female',
  dateOfBirth: '1976-09-17',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Chennai, Tamil Nadu',
  hometown: 'Austin, Texas, USA',
  currentLocation: 'Austin, Texas, USA',
  occupation: 'Senior Corporate Tax Attorney',
  biography: 'Partner at a leading international law firm advising cross-border technology mergers and intellectual property compliance.',
  notes: 'Classical Bharatanatyam soloist.',
  photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const pRajesh = createPerson({
  id: 'p-rajesh',
  firstName: 'Rajesh',
  middleName: 'Venkat',
  lastName: 'Medida',
  displayName: 'Rajesh Venkat Medida',
  gender: 'male',
  dateOfBirth: '1975-01-10',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Hyderabad, Telangana',
  hometown: 'Hyderabad, Telangana',
  currentLocation: 'Bangalore, Karnataka',
  occupation: 'Principal Cloud Architect',
  biography: 'Distinguished technologist leading distributed cloud platforms and AI systems. Active mentor in open-source developer communities.',
  notes: 'Avid camera collector and landscape photographer.',
  photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const pMeena = createPerson({
  id: 'p-meena',
  firstName: 'Meena',
  middleName: '',
  lastName: 'Medida',
  displayName: 'Meena Medida',
  gender: 'female',
  dateOfBirth: '1978-06-25',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Vijayawada, Andhra Pradesh',
  hometown: 'Bangalore, Karnataka',
  currentLocation: 'Bangalore, Karnataka',
  occupation: 'Chief Pediatrician',
  biography: 'Head of Pediatric Intensive Care at Manipal Hospital Bangalore. Co-founded rural neonatal outreach clinics across North Karnataka.',
  notes: 'Violinist and passionate baker.',
  photoUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const pVikram = createPerson({
  id: 'p-vikram',
  firstName: 'Vikram',
  middleName: '',
  lastName: 'Nair',
  displayName: 'Vikram Nair',
  gender: 'male',
  dateOfBirth: '1977-10-30',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Cochin, Kerala',
  hometown: 'Mumbai, Maharashtra',
  currentLocation: 'Mumbai, Maharashtra',
  occupation: 'Independent Film Producer',
  biography: 'National Film Award-winning documentary producer exploring environmental conservation, folk heritage, and tribal craft traditions.',
  notes: 'Certified deep-sea diver.',
  photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const pDeepa = createPerson({
  id: 'p-deepa',
  firstName: 'Deepa',
  middleName: '',
  lastName: 'Nair',
  displayName: 'Deepa Nair',
  gender: 'female',
  dateOfBirth: '1980-03-12',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Visakhapatnam, Andhra Pradesh',
  hometown: 'Mumbai, Maharashtra',
  currentLocation: 'Mumbai, Maharashtra',
  occupation: 'Investigative Journalist & Editor',
  biography: 'Senior investigative editor covering public health policies and ecological governance across South Asia.',
  notes: 'Author of the nonfiction work River of Memory (2019).',
  photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

// ── GENERATION IV: Children & Next Generation (2000–2007) ────
const cPriya = createPerson({
  id: 'c-priya',
  firstName: 'Priya',
  middleName: 'Suresh',
  lastName: 'Medida',
  displayName: 'Priya Suresh Medida',
  gender: 'female',
  dateOfBirth: '2000-08-14',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Austin, Texas, USA',
  hometown: 'Austin, Texas, USA',
  currentLocation: 'Stanford, California, USA',
  occupation: 'AI & Genomics Researcher',
  biography: 'PhD candidate at Stanford University applying foundation models to rare genetic variant discovery and protein folding dynamics.',
  notes: 'Stanford intercollegiate debate champion.',
  photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const cRohan = createPerson({
  id: 'c-rohan',
  firstName: 'Rohan',
  middleName: 'Suresh',
  lastName: 'Medida',
  displayName: 'Rohan Suresh Medida',
  gender: 'male',
  dateOfBirth: '2003-12-05',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Austin, Texas, USA',
  hometown: 'Austin, Texas, USA',
  currentLocation: 'New York City, New York, USA',
  occupation: 'Architectural Designer',
  biography: 'Graduate of Columbia GSAPP, focusing on regenerative timber architecture and resilient urban waterfronts.',
  notes: 'Electronic music producer and cellist.',
  photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const cAnika = createPerson({
  id: 'c-anika',
  firstName: 'Anika',
  middleName: 'Rajesh',
  lastName: 'Medida',
  displayName: 'Anika Rajesh Medida',
  gender: 'female',
  dateOfBirth: '2002-04-15',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Bangalore, Karnataka',
  hometown: 'Bangalore, Karnataka',
  currentLocation: 'Bangalore, Karnataka',
  occupation: 'Pediatric Resident Physician',
  biography: 'Gold medalist from Bangalore Medical College (BMCRI), specializing in pediatric emergency care and developmental neurology.',
  notes: 'Co-leads youth community literacy programs.',
  photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const cArjun = createPerson({
  id: 'c-arjun',
  firstName: 'Arjun',
  middleName: 'Rajesh',
  lastName: 'Medida',
  displayName: 'Arjun Rajesh Medida',
  gender: 'male',
  dateOfBirth: '2005-09-28',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Bangalore, Karnataka',
  hometown: 'Bangalore, Karnataka',
  currentLocation: 'Chennai, Tamil Nadu',
  occupation: 'Robotics Engineering Student',
  biography: 'Undergraduate at IIT Madras building autonomous underwater vehicles and surgical micro-robotics.',
  notes: 'Captain of the university drone racing team.',
  photoUrl: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const cMaya = createPerson({
  id: 'c-maya',
  firstName: 'Maya',
  middleName: 'Vikram',
  lastName: 'Nair',
  displayName: 'Maya Vikram Nair',
  gender: 'female',
  dateOfBirth: '2004-06-18',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Mumbai, Maharashtra',
  hometown: 'Mumbai, Maharashtra',
  currentLocation: 'Mumbai, Maharashtra',
  occupation: 'Documentary Cinematographer',
  biography: 'Documentary filmmaker capturing oral histories, artisan communities, and coastal marine ecologies.',
  notes: 'Exhibited at Mumbai Youth Photo Biennale 2024.',
  photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

const cKiran = createPerson({
  id: 'c-kiran',
  firstName: 'Kiran',
  middleName: 'Vikram',
  lastName: 'Nair',
  displayName: 'Kiran Vikram Nair',
  gender: 'male',
  dateOfBirth: '2007-11-09',
  dateOfDeath: null,
  livingStatus: 'alive',
  placeOfBirth: 'Mumbai, Maharashtra',
  hometown: 'Mumbai, Maharashtra',
  currentLocation: 'Mumbai, Maharashtra',
  occupation: 'High School Honors Scholar',
  biography: 'State-ranked competitive swimmer and aspiring aerospace engineer leading his school astronomical society.',
  notes: 'National Science Olympiad medalist.',
  photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=360&h=360&fit=crop&crop=faces&auto=format&q=80',
});

export const samplePersons = [
  ggRamaiah,
  ggSaraswathi,
  ggNarasimha,
  ggLakshmi,
  gVenkat,
  gPadma,
  gSrinivas,
  gAnnapurna,
  pSuresh,
  pKavitha,
  pRajesh,
  pMeena,
  pVikram,
  pDeepa,
  cPriya,
  cRohan,
  cAnika,
  cArjun,
  cMaya,
  cKiran,
];

// ── RELATIONSHIP LINKS ───────────────────────────────────────
export const sampleRelationships = [
  // Generation I Marriages
  createRelationship({
    personId1: 'gg-ramaiah',
    personId2: 'gg-saraswathi',
    type: 'spouse',
    startDate: '1944-05-10',
  }),
  createRelationship({
    personId1: 'gg-narasimha',
    personId2: 'gg-lakshmi',
    type: 'spouse',
    startDate: '1942-02-18',
  }),

  // Generation I → Generation II (Ramaiah & Saraswathi → Venkat)
  createRelationship({
    personId1: 'gg-ramaiah',
    personId2: 'g-venkat',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'gg-saraswathi',
    personId2: 'g-venkat',
    type: 'parent',
  }),

  // Generation I → Generation II (Narasimha & Lakshmi → Padma)
  createRelationship({
    personId1: 'gg-narasimha',
    personId2: 'g-padma',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'gg-lakshmi',
    personId2: 'g-padma',
    type: 'parent',
  }),

  // Generation II Marriages
  createRelationship({
    personId1: 'g-venkat',
    personId2: 'g-padma',
    type: 'spouse',
    startDate: '1970-11-25',
  }),
  createRelationship({
    personId1: 'g-srinivas',
    personId2: 'g-annapurna',
    type: 'spouse',
    startDate: '1973-04-12',
  }),

  // Generation II → Generation III (Venkat & Padma → Suresh & Rajesh)
  createRelationship({
    personId1: 'g-venkat',
    personId2: 'p-suresh',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'g-padma',
    personId2: 'p-suresh',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'g-venkat',
    personId2: 'p-rajesh',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'g-padma',
    personId2: 'p-rajesh',
    type: 'parent',
  }),

  // Generation II → Generation III (Srinivas & Annapurna → Meena & Deepa)
  createRelationship({
    personId1: 'g-srinivas',
    personId2: 'p-meena',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'g-annapurna',
    personId2: 'p-meena',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'g-srinivas',
    personId2: 'p-deepa',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'g-annapurna',
    personId2: 'p-deepa',
    type: 'parent',
  }),

  // Generation III Marriages
  createRelationship({
    personId1: 'p-suresh',
    personId2: 'p-kavitha',
    type: 'spouse',
    startDate: '1998-12-28',
  }),
  createRelationship({
    personId1: 'p-rajesh',
    personId2: 'p-meena',
    type: 'spouse',
    startDate: '2000-02-14',
  }),
  createRelationship({
    personId1: 'p-vikram',
    personId2: 'p-deepa',
    type: 'spouse',
    startDate: '2003-05-18',
  }),

  // Generation III → Generation IV (Suresh & Kavitha → Priya & Rohan)
  createRelationship({
    personId1: 'p-suresh',
    personId2: 'c-priya',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'p-kavitha',
    personId2: 'c-priya',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'p-suresh',
    personId2: 'c-rohan',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'p-kavitha',
    personId2: 'c-rohan',
    type: 'parent',
  }),

  // Generation III → Generation IV (Rajesh & Meena → Anika & Arjun)
  createRelationship({
    personId1: 'p-rajesh',
    personId2: 'c-anika',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'p-meena',
    personId2: 'c-anika',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'p-rajesh',
    personId2: 'c-arjun',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'p-meena',
    personId2: 'c-arjun',
    type: 'parent',
  }),

  // Generation III → Generation IV (Vikram & Deepa → Maya & Kiran)
  createRelationship({
    personId1: 'p-vikram',
    personId2: 'c-maya',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'p-deepa',
    personId2: 'c-maya',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'p-vikram',
    personId2: 'c-kiran',
    type: 'parent',
  }),
  createRelationship({
    personId1: 'p-deepa',
    personId2: 'c-kiran',
    type: 'parent',
  }),
];

/**
 * Modern Editorial Timeline Milestones
 */
export const sampleTimelineEvents = [
  {
    year: '1918',
    title: 'The Ancestral Foundation',
    era: 'GEN I',
    subtitle: 'Warangal, Telangana',
    description: 'Narasimha Reddy and Ramaiah Medida establish agricultural stewardship and early community foundations in Warangal.',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
    imageCaption: 'The ancestral homestead grounds in Warangal.',
    tags: ['Foundation', 'Warangal', 'Agriculture'],
  },
  {
    year: '1948',
    title: 'Post-Independence Expansion',
    era: 'GEN II',
    subtitle: 'Hyderabad & Godavari Basin',
    description: 'Venkat Ramaiah Medida joins Osmania Engineering; Srinivas Kumar establishes Godavari handloom export guilds.',
    imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&auto=format&fit=crop&q=80',
    imageCaption: 'Venkat Medida civil design laboratory notebook.',
    tags: ['Osmania', 'Engineering', 'Commerce'],
  },
  {
    year: '1975',
    title: 'Science & Innovation Emergence',
    era: 'GEN III',
    subtitle: 'Hyderabad & Bangalore',
    description: 'Rajesh Venkat Medida and Suresh Venkat Medida born; family branches expand into modern quantum physics, medicine, and cloud technology.',
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80',
    imageCaption: 'Family gathering at the Jubilee Hills residence, 1985.',
    tags: ['Science', 'Technology', 'Medicine'],
  },
  {
    year: '2002',
    title: 'Global Generation & Future Horizons',
    era: 'GEN IV',
    subtitle: 'Bangalore, Austin & Stanford',
    description: 'Anika, Priya, Rohan, Arjun, Maya, and Kiran carry the family legacy across medicine, AI genomics, cinema, and architecture.',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
    imageCaption: 'Four generations centenary reunion archive, 2018.',
    tags: ['Global', 'AI & Genomics', 'Creative Arts'],
  },
];

/**
 * Modern Photography Album Collection
 */
export const sampleAlbumPhotos = [
  {
    id: 'ph-1',
    title: 'Summer in Jubilee Hills',
    category: 'Gatherings',
    year: '2018',
    location: 'Hyderabad, Telangana',
    era: 'GEN I — IV',
    imageUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&auto=format&fit=crop&q=80',
    caption: 'Four generations gathered at the family residence to celebrate the centenary milestone.',
  },
  {
    id: 'ph-2',
    title: 'Osmania Engineering Archive',
    category: 'Historic',
    year: '1970',
    location: 'Hyderabad, Telangana',
    era: 'GEN II',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
    caption: 'Venkat Ramaiah Medida on graduation day at Osmania College of Engineering.',
  },
  {
    id: 'ph-3',
    title: 'Silicon Valley & Stanford Labs',
    category: 'Portraits',
    year: '2023',
    location: 'Stanford, California',
    era: 'GEN IV',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    caption: 'Priya Medida presenting computational biology research on genomics foundation models.',
  },
  {
    id: 'ph-4',
    title: 'Coastal Godavari Handloom Guild',
    category: 'Historic',
    year: '1974',
    location: 'Rajahmundry, AP',
    era: 'GEN I',
    imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&auto=format&fit=crop&q=80',
    caption: 'Saraswathi Medida demonstrating master ikat weaving techniques.',
  },
  {
    id: 'ph-5',
    title: 'Bangalore Studio & Architecture',
    category: 'Places',
    year: '2022',
    location: 'Bangalore, Karnataka',
    era: 'GEN III',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
    caption: 'Rajesh and Meena Medida at the sustainable design and robotics workshop.',
  },
  {
    id: 'ph-6',
    title: 'Mumbai Marine Cinematography',
    category: 'Portraits',
    year: '2024',
    location: 'Mumbai, Maharashtra',
    era: 'GEN IV',
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    caption: 'Maya Nair directing documentary film crew on coastal marine restoration.',
  },
];

/**
 * Modern Story Memoirs & Oral Histories
 */
export const sampleMemories = [
  {
    id: 'mem-1',
    title: 'The House by the Lake',
    location: 'Hyderabad, Telangana',
    year: '1978',
    category: 'Oral History',
    story: 'Every summer, the entire family would convene at the lakeside home in Hyderabad. Grandfather Ramaiah would recount stories under the courtyard trees while grandmother Saraswathi prepared traditional delicacies.',
    narrator: 'Padma Medida',
    avatarUrl: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=200&fit=crop&crop=faces&auto=format&q=80',
    audioDuration: '4 min 18 sec',
  },
  {
    id: 'mem-2',
    title: 'The Blueprints on the Drafting Table',
    location: 'Warangal & Hyderabad',
    year: '1965',
    category: 'Milestone',
    story: 'Venkat sat for hours with compass and ink ruler drawing the first canal diversion diagrams that would later modernize irrigation for five surrounding agricultural districts.',
    narrator: 'Suresh Venkat Medida',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&fit=crop&crop=faces&auto=format&q=80',
    audioDuration: '6 min 02 sec',
  },
  {
    id: 'mem-3',
    title: 'The First Silk Loom at Dawn',
    location: 'Karimnagar, Telangana',
    year: '1940',
    category: 'Family Lore',
    story: 'The rhythm of the wooden shuttle was the morning clock of the house. Saraswathi believed each woven motif held a mathematical geometry and a protective blessing for the wearer.',
    narrator: 'Meena Medida',
    avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&fit=crop&crop=faces&auto=format&q=80',
    audioDuration: '3 min 45 sec',
  },
];

/**
 * Modern Digital Archive Catalog
 */
export const sampleArchivalArtifacts = [
  {
    id: 'art-01',
    title: 'Land Tenancy Deed & Village Ledger',
    date: 'August 14, 1947',
    category: 'Deed & Record',
    personId: 'gg-narasimha',
    description: 'Original bilingual Urdu-Telugu revenue ledger recording rural tenancy reforms under Narasimha Reddy.',
    docType: 'Official Document',
  },
  {
    id: 'art-02',
    title: 'Pochampally Ikat Master Weaver Citation',
    date: 'October 22, 1974',
    category: 'Honors & Awards',
    personId: 'gg-saraswathi',
    description: 'Handloom preservation citation presented to Saraswathi Medida by the All India Handloom Board.',
    docType: 'National Award',
  },
  {
    id: 'art-03',
    title: 'Nagarjuna Sagar Dam Civil Engineering Log',
    date: 'June 18, 1972',
    category: 'Technical Journal',
    personId: 'g-venkat',
    description: 'Handwritten technical diary of Venkat Ramaiah Medida detailing hydraulic stress calculations.',
    docType: 'Engineering Journal',
  },
  {
    id: 'art-04',
    title: 'Centenary Family Gathering at Warangal',
    date: 'December 28, 2018',
    category: 'Digital Photograph',
    personId: 'p-rajesh',
    description: '20 family members gathered across all four living and remembered generations.',
    docType: 'Photography Archive',
  },
];
