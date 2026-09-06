// Eras of human spaceflight, used for the home-page strip and the explorer's year presets.
// Each opens the explorer on its span of years. `to: null` means "through today".

export interface Era {
  id: string;
  name: string;
  from: number;
  to: number | null;
  /** one short line under the name */
  blurb: string;
  image: string;
  alt: string;
  credit: string;
}

export const img = (file: string) => `${import.meta.env.BASE_URL}img/${file}`;

export const ERAS: Era[] = [
  { id: 'space-race', name: 'Space Race', from: 1961, to: 1970, blurb: 'Vostok to Apollo', image: img('apollo-11.jpg'), alt: 'Buzz Aldrin on the Sea of Tranquility, Apollo 11, 1969', credit: 'NASA · AS11-40-5875' },
  { id: 'salyut', name: 'Salyut', from: 1971, to: 1986, blurb: 'The first stations', image: img('soyuz-19.jpg'), alt: 'Soyuz 19 in orbit, photographed from Apollo in 1975', credit: 'NASA · Apollo–Soyuz, 1975' },
  { id: 'shuttle', name: 'Shuttle', from: 1981, to: 2011, blurb: '135 flights', image: img('mmu-1984.jpg'), alt: 'Bruce McCandless flying untethered above Earth, 1984', credit: 'NASA · S84-27031' },
  { id: 'mir', name: 'Mir', from: 1986, to: 2001, blurb: 'Fifteen years aloft', image: img('mir-1995.jpg'), alt: 'Mir after Atlantis undocks, 1995', credit: 'NASA · STS074-716-044' },
  { id: 'iss', name: 'ISS', from: 2000, to: null, blurb: 'Continuous since 2000', image: img('iss-2011.jpg'), alt: 'The International Space Station over Earth, photographed from a departing Soyuz in 2011', credit: 'NASA · S134-E-010137' },
  { id: 'shenzhou', name: 'Shenzhou', from: 2003, to: null, blurb: 'China’s own station', image: img('shenzhou-13.jpg'), alt: 'A Shenzhou 13 spacewalk outside Tiangong, 2021', credit: 'China Manned Space Engineering Office · CC BY 4.0' },
];

/** Background photographs for full-bleed pages. */
export const PHOTOS = {
  home: { image: img('iss-2011.jpg'), alt: 'The International Space Station over Earth, photographed from a departing Soyuz in 2011', credit: 'NASA · S134-E-010137 · Soyuz TMA-20 fly-around, 23 May 2011' },
  explorer: { image: img('tiangong-2023.jpg'), alt: 'The Tiangong space station seen from a departing Shenzhou', credit: 'China Manned Space Engineering Office · Tiangong from Shenzhou 15, 2023 · CC BY 4.0' },
};
