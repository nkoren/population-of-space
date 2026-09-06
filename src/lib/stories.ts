// Story pages: scrollable sequences of charts and narrative about one subject.
// Until each story page exists, its card opens the explorer on the closest cut.
import { img } from './eras';

export interface Story {
  id: string;
  title: string;
  /** one short line under the title */
  blurb: string;
  image: string;
  alt: string;
  credit: string;
  /** explorer query used as the link target until the story page is built */
  params: Record<string, string>;
}

export const STORIES: Story[] = [
  {
    id: 'women',
    title: 'Women in space',
    blurb: 'From Tereshkova to today',
    image: img('tereshkova-1963.jpg'),
    alt: 'Valentina Tereshkova in 1963',
    credit: 'Alexander Mokletsov / RIA Novosti · CC BY-SA 3.0',
    params: { m: 'population', by: 'sex', r: 'year', c: 'share' },
  },
  {
    id: 'nations',
    title: 'Nations in space',
    blurb: 'Who has been up, and for how long',
    image: img('aldrin-flag-1969.jpg'),
    alt: 'Buzz Aldrin salutes the United States flag on the Moon, Apollo 11, 1969',
    credit: 'NASA · AS11-40-5874',
    params: { m: 'cumulativePeople', by: 'nationality', r: 'year', c: 'stacked' },
  },
  {
    id: 'generations',
    title: 'Generations in space',
    blurb: 'How old are the people in orbit?',
    image: img('glenn-sts95-1998.jpg'),
    alt: 'John Glenn on the middeck of Discovery during STS-95, 1998',
    credit: 'NASA · STS-95, 1998',
    params: { m: 'population', by: 'age', r: 'year', c: 'share' },
  },
  {
    id: 'space-race',
    title: 'The first space race',
    blurb: 'Vostok to Apollo, 1961–1972',
    image: img('apollo-11-launch.jpg'),
    alt: 'The Saturn V carrying Apollo 11 lifts off, 16 July 1969',
    credit: 'NASA · GPN-2000-000630',
    params: { m: 'population', by: 'launchNation', r: 'month', c: 'stacked', from: '1961', to: '1972' },
  },
  {
    id: 'salyut-mir',
    title: 'The Salyut and Mir era',
    blurb: 'Learning to live in orbit',
    image: img('soyuz-19.jpg'),
    alt: 'Soyuz 19 in orbit, photographed from Apollo in 1975',
    credit: 'NASA · Apollo–Soyuz, 1975',
    params: { m: 'population', by: 'destination', r: 'month', c: 'stacked', from: '1971', to: '2001' },
  },
  {
    id: 'shuttle',
    title: 'The Shuttle era',
    blurb: '135 flights, 1981–2011',
    image: img('atlantis-sts132-2010.jpg'),
    alt: 'Space Shuttle Atlantis in orbit after undocking from the ISS, STS-132, 2010',
    credit: 'NASA · STS-132, 2010',
    params: { m: 'launched', by: 'destination', r: 'year', c: 'stacked', from: '1981', to: '2011' },
  },
  {
    id: 'iss',
    title: 'The ISS era',
    blurb: 'A permanent address in orbit',
    image: img('iss-thirteen-2009.jpg'),
    alt: 'The thirteen people aboard the International Space Station during STS-127, July 2009',
    credit: 'NASA · STS-127 / Expedition 20, 2009',
    params: { m: 'population', by: 'nationality', r: 'month', c: 'stacked', from: '2000' },
  },
  {
    id: 'china',
    title: 'The rise of China',
    blurb: 'Shenzhou and Tiangong',
    image: img('shenzhou-13.jpg'),
    alt: 'A Shenzhou 13 spacewalk outside Tiangong, 2021',
    credit: 'China Manned Space Engineering Office · CC BY 4.0',
    params: { m: 'population', by: 'launchNation', r: 'month', c: 'stacked', from: '2003' },
  },
  {
    id: 'commercial',
    title: 'The rise of commercial space',
    blurb: 'Dragon, New Shepard and private crews',
    image: img('polaris-dawn-crew.jpg'),
    alt: 'The Polaris Dawn crew',
    credit: 'U.S. Air Force / Justin Pacheco · public domain',
    params: { m: 'launched', by: 'sector', r: 'year', c: 'stacked', from: '2000' },
  },
];
