import type { ArticleInput } from '@news/contracts';
import type { DatabaseSync } from 'node:sqlite';
import { SqliteArticleRepository } from '../repositories/SqliteArticleRepository';

/**
 * Sample content, written to resemble the supplied design mock: regional
 * business and policy stories from South-East Asian mastheads.
 *
 * `daysAgo` rather than fixed dates, so the seed still reads as recent whenever
 * it is run. 36 rows is deliberate — enough for four pages at the default page
 * size, so pagination and search are visibly exercised the moment the app opens
 * rather than needing data typed in first.
 */
interface SeedArticle extends Omit<ArticleInput, 'date'> {
  daysAgo: number;
}

const SEED_ARTICLES: SeedArticle[] = [
  {
    title: 'EU relaxes food safety requirements for Vietnamese instant noodles',
    summary:
      'The EU will remove Vietnamese instant noodles from its Annex II control list after two years without a violation. Exporters still face 20 per cent border checks on dragon fruit.',
    publisher: 'Saigon Times',
    daysAgo: 1,
  },
  {
    title: 'Construction Ministry moves to aid real estate market recovery',
    summary:
      'A draft resolution would let developers restructure bond obligations falling due this year. Market watchers warn the measure treats symptoms rather than the underlying supply glut.',
    publisher: 'Saigon Times',
    daysAgo: 1,
  },
  {
    title: 'Singapore core inflation eases to a three-year low',
    summary:
      'Core inflation slowed to 1.6 per cent in June, the softest reading since 2023. The central bank left its policy band unchanged, citing lingering import price pressure.',
    publisher: 'The Business Times',
    daysAgo: 2,
  },
  {
    title: 'Grab expands driver insurance scheme across four markets',
    summary:
      'The programme extends accident cover to part-time drivers in Indonesia, Vietnam, Thailand and the Philippines. Analysts expect a modest margin impact this quarter.',
    publisher: 'Tech in Asia',
    daysAgo: 3,
  },
  {
    title: 'Indonesia nickel export curbs push battery makers to rethink supply',
    summary:
      'Jakarta confirmed tighter quotas on unprocessed nickel ore from October. Korean and Chinese cell manufacturers are accelerating plans for local refining capacity.',
    publisher: 'Nikkei Asia',
    daysAgo: 4,
  },
  {
    title: 'Malaysia data centre boom strains Johor power grid',
    summary:
      'Approved data centre capacity in Johor now exceeds 1.5 gigawatts. The state utility has begun staggering new connection approvals while transmission upgrades are completed.',
    publisher: 'The Edge Malaysia',
    daysAgo: 5,
  },
  {
    title: 'Thailand tourism arrivals recover to pre-pandemic levels',
    summary:
      'Arrivals reached 3.4 million in June, marking the first full month above 2019 levels. Hotel operators report rates rising fastest in secondary provinces.',
    publisher: 'Bangkok Post',
    daysAgo: 6,
  },
  {
    title: 'Philippine central bank signals room for further easing',
    summary:
      'The governor said two more cuts remain possible this year if inflation stays within target. The peso weakened slightly on the remarks.',
    publisher: 'BusinessWorld',
    daysAgo: 7,
  },
  {
    title: 'Vietnam approves offshore wind pilot in Binh Thuan province',
    summary:
      'The 600 megawatt pilot is the first approved under the revised power development plan. Construction is not expected to begin before late next year.',
    publisher: 'VnExpress International',
    daysAgo: 8,
  },
  {
    title: 'Sea Group posts first annual profit as e-commerce margins improve',
    summary:
      'Shopee reduced logistics cost per order for a fifth consecutive quarter. The gaming division remains a drag on overall growth.',
    publisher: 'Tech in Asia',
    daysAgo: 9,
  },
  {
    title: 'Singapore raises property cooling measures for foreign buyers',
    summary:
      'Additional buyer stamp duty for foreigners rises to 65 per cent. Agents expect transaction volumes in the prime districts to fall sharply.',
    publisher: 'The Business Times',
    daysAgo: 10,
  },
  {
    title: 'Indonesia sovereign wealth fund secures logistics commitment',
    summary:
      'A consortium of Gulf investors committed 1.2 billion dollars to port and warehousing assets. The fund has now raised roughly half its five-year target.',
    publisher: 'Jakarta Post',
    daysAgo: 11,
  },
  {
    title: 'Cambodian garment exports rebound on European demand',
    summary:
      'Shipments rose 12 per cent year on year in the first half. Manufacturers caution that order books beyond December remain thin.',
    publisher: 'Khmer Times',
    daysAgo: 12,
  },
  {
    title: 'Vietnam semiconductor training programme targets 50,000 engineers',
    summary:
      'The initiative pairs universities with foreign chipmakers on curriculum design. Industry groups say the shortfall is in packaging and test rather than design.',
    publisher: 'VnExpress International',
    daysAgo: 13,
  },
  {
    title: 'Bank Negara holds rate as ringgit steadies',
    summary:
      'The overnight policy rate stays at 3.00 per cent for a sixth meeting. Officials pointed to improved export receipts and a narrower trade gap.',
    publisher: 'The Edge Malaysia',
    daysAgo: 14,
  },
  {
    title: 'Regional airlines add capacity ahead of year-end travel peak',
    summary:
      'Five carriers announced additional South-East Asia to North Asia frequencies. Aircraft delivery delays continue to cap how quickly capacity can grow.',
    publisher: 'Nikkei Asia',
    daysAgo: 16,
  },
  {
    title: 'Thai baht strengthens on record gold exports',
    summary:
      'Gold re-exports reached a record in the second quarter as regional demand rose. The currency gained 2 per cent against the dollar over the month.',
    publisher: 'Bangkok Post',
    daysAgo: 18,
  },
  {
    title: 'Singapore fintech licensing framework enters second phase',
    summary:
      'Digital payment token providers must meet new custody and disclosure standards. Several smaller operators are expected to exit rather than comply.',
    publisher: 'The Business Times',
    daysAgo: 20,
  },
  {
    title: 'Philippine infrastructure spending falls short of target',
    summary:
      'Disbursement reached 4.1 per cent of GDP against a 5 per cent goal. Right-of-way acquisition remains the most common cause of delay.',
    publisher: 'BusinessWorld',
    daysAgo: 22,
  },
  {
    title: 'Vietnam coffee exports hit record value despite lower volume',
    summary:
      'Higher robusta prices lifted export value 38 per cent even as shipped tonnage fell. Farmers are replanting aging trees across the Central Highlands.',
    publisher: 'Saigon Times',
    daysAgo: 24,
  },
  {
    title: 'Indonesia expands electric vehicle purchase incentives',
    summary:
      'Locally assembled models qualify for a reduced value added tax rate. The policy requires 40 per cent domestic content by next year.',
    publisher: 'Jakarta Post',
    daysAgo: 26,
  },
  {
    title: 'Malaysia semiconductor exports lifted by AI server demand',
    summary:
      'Penang test and assembly plants are operating near capacity. Two firms announced expansions totalling 900 million dollars.',
    publisher: 'The Edge Malaysia',
    daysAgo: 28,
  },
  {
    title: 'Regional bond issuance slows as spreads widen',
    summary:
      'Local currency corporate issuance fell 18 per cent quarter on quarter. Bankers expect activity to resume once policy direction is clearer.',
    publisher: 'Nikkei Asia',
    daysAgo: 30,
  },
  {
    title: 'Singapore launches carbon credit exchange pilot',
    summary:
      'The exchange will initially list forestry and cookstove projects from the region. Buyers must retire credits within 24 months of purchase.',
    publisher: 'The Business Times',
    daysAgo: 33,
  },
  {
    title: 'Thai auto production drops on weak domestic financing',
    summary:
      'Output fell 15 per cent year on year as banks tightened auto loan approvals. Export volumes held broadly steady.',
    publisher: 'Bangkok Post',
    daysAgo: 36,
  },
  {
    title: 'Vietnam retail chains accelerate store openings outside major cities',
    summary:
      'Three grocery operators plan a combined 700 new outlets in tier-two provinces. Rising provincial incomes are driving the shift from traditional markets.',
    publisher: 'VnExpress International',
    daysAgo: 39,
  },
  {
    title: 'Philippine BPO sector adapts to generative AI adoption',
    summary:
      'Operators report headcount flat while revenue per seat rises. Industry bodies are revising their five-year employment projections downward.',
    publisher: 'BusinessWorld',
    daysAgo: 42,
  },
  {
    title: 'Indonesia rice imports fall as harvest exceeds forecast',
    summary:
      'The state procurement agency cut planned imports by 700,000 tonnes. Domestic prices have eased from their February peak.',
    publisher: 'Jakarta Post',
    daysAgo: 45,
  },
  {
    title: 'Regional startups see funding stabilise after two-year decline',
    summary:
      'Second quarter deal value rose for the first time since 2024. Early stage rounds account for most of the recovery.',
    publisher: 'Tech in Asia',
    daysAgo: 48,
  },
  {
    title: 'Cambodia and Vietnam agree cross-border power trading terms',
    summary:
      'The agreement covers up to 300 megawatts of hydro and solar transfers. Interconnection upgrades are scheduled to complete within 18 months.',
    publisher: 'Khmer Times',
    daysAgo: 52,
  },
  {
    title: 'Singapore port throughput sets quarterly record',
    summary:
      'Container volumes rose 9 per cent as carriers rerouted around Red Sea disruption. Berth utilisation remains near operational limits.',
    publisher: 'The Business Times',
    daysAgo: 56,
  },
  {
    title: 'Malaysia tightens rules on foreign labour recruitment fees',
    summary:
      'Employers must now bear all recruitment costs for migrant workers. Enforcement will begin with the plantation and manufacturing sectors.',
    publisher: 'The Edge Malaysia',
    daysAgo: 60,
  },
  {
    title: 'Thai central bank studies retail digital currency pilot',
    summary:
      'A limited trial with three commercial banks will run for six months. Officials stressed no decision has been taken on wider issuance.',
    publisher: 'Bangkok Post',
    daysAgo: 65,
  },
  {
    title: 'Vietnam industrial park occupancy reaches decade high',
    summary:
      'Northern provinces report occupancy above 85 per cent as electronics suppliers expand. Land rents rose 12 per cent year on year.',
    publisher: 'Saigon Times',
    daysAgo: 70,
  },
  {
    title: 'Indonesia digital bank consolidation expected to accelerate',
    summary:
      'Regulators signalled higher minimum capital requirements from next year. Several smaller licence holders are exploring mergers.',
    publisher: 'Jakarta Post',
    daysAgo: 76,
  },
  {
    title: 'Regional palm oil prices ease on improved Indonesian output',
    summary:
      'Benchmark futures fell to a nine-month low. Refiners expect margins to recover in the fourth quarter.',
    publisher: 'Nikkei Asia',
    daysAgo: 82,
  },
];

function isoDateDaysAgo(daysAgo: number, from: Date = new Date()): string {
  const date = new Date(from.getTime() - daysAgo * 86_400_000);
  return date.toISOString().slice(0, 10);
}

/**
 * Populate an empty database.
 *
 * A no-op when rows already exist, so it is safe to call on every boot and will
 * never overwrite work a reviewer has entered by hand.
 */
export async function seedIfEmpty(db: DatabaseSync): Promise<number> {
  const countRow = db.prepare('SELECT COUNT(*) AS total FROM articles').get() as
    { total: number } | undefined;

  if ((countRow?.total ?? 0) > 0) {
    return 0;
  }

  const repository = new SqliteArticleRepository(db);

  for (const { daysAgo, ...article } of SEED_ARTICLES) {
    await repository.create({ ...article, date: isoDateDaysAgo(daysAgo) });
  }

  return SEED_ARTICLES.length;
}
