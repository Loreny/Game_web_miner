import { AchievementCategory, AchievementChain, AchievementTier, GameState, TierRank } from '../types';

export const RANK_NAMES: Record<number, { suffix: string; rank: TierRank }> = {
  1: { suffix: 'Bronze I', rank: 'Bronze' },
  2: { suffix: 'Bronze II', rank: 'Bronze' },
  3: { suffix: 'Bronze III', rank: 'Bronze' },
  4: { suffix: 'Silver I', rank: 'Silver' },
  5: { suffix: 'Silver II', rank: 'Silver' },
  6: { suffix: 'Silver III', rank: 'Silver' },
  7: { suffix: 'Gold I', rank: 'Gold' },
  8: { suffix: 'Gold II', rank: 'Gold' },
  9: { suffix: 'Gold III', rank: 'Gold' },
  10: { suffix: 'Diamond I', rank: 'Diamond' },
  11: { suffix: 'Diamond II', rank: 'Diamond' },
  12: { suffix: 'Diamond III', rank: 'Diamond' }
};

export const STANDARD_TIER_REWARDS: { cash: number; certs: number }[] = [
  { cash: 20, certs: 0 },
  { cash: 50, certs: 1 },
  { cash: 125, certs: 2 },
  { cash: 300, certs: 4 },
  { cash: 750, certs: 8 },
  { cash: 1800, certs: 14 },
  { cash: 4500, certs: 22 },
  { cash: 12000, certs: 35 },
  { cash: 30000, certs: 55 },
  { cash: 85000, certs: 90 },
  { cash: 250000, certs: 160 },
  { cash: 800000, certs: 280 }
];

export function create12TierChain(
  id: string,
  title: string,
  descriptionFormat: string,
  category: AchievementCategory,
  unit: string,
  thresholds: number[],
  getValue: (state: GameState) => number,
  rewardMult: number = 1.0
): AchievementChain {
  const tiers: AchievementTier[] = thresholds.map((thresh, idx) => {
    const tierNum = idx + 1;
    const rankInfo = RANK_NAMES[tierNum] || { suffix: `Tier ${tierNum}`, rank: 'Diamond' as TierRank };
    const baseReward = STANDARD_TIER_REWARDS[idx] || STANDARD_TIER_REWARDS[STANDARD_TIER_REWARDS.length - 1];
    return {
      tierLevel: tierNum,
      threshold: thresh,
      titleSuffix: rankInfo.suffix,
      tierRank: rankInfo.rank,
      rewardCash: Math.round(baseReward.cash * rewardMult),
      rewardCertificates: Math.round(baseReward.certs * rewardMult)
    };
  });

  return {
    id,
    title,
    descriptionFormat,
    category,
    unit,
    tiers,
    getValue
  };
}

export const ACHIEVEMENT_CHAINS: AchievementChain[] = [
  // ==========================================================================
  // 1. PROGRESS CATEGORY (12 chains x 12 tiers = 144 milestones)
  // ==========================================================================
  create12TierChain(
    'prog_dirt',
    'Klondike Earthmover',
    'Sift a total of {threshold} of paydirt',
    'PROGRESS',
    'g',
    [100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000, 10_000_000_000, 100_000_000_000, 1_000_000_000_000, 10_000_000_000_000],
    (s) => s.totalDirtSifted,
    1.2
  ),
  create12TierChain(
    'prog_cash',
    'Gilded Fortune',
    'Accumulate {threshold} in total gross revenue',
    'PROGRESS',
    '$',
    [10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000, 10_000_000_000, 100_000_000_000, 1_000_000_000_000],
    (s) => s.totalCashEarned,
    1.1
  ),
  create12TierChain(
    'prog_taps',
    'Pan Swirl Veteran',
    'Perform {threshold} manual pan swirl scoops',
    'PROGRESS',
    'taps',
    [10, 50, 150, 500, 1_200, 3_000, 7_500, 15_000, 30_000, 60_000, 120_000, 250_000],
    (s) => s.totalManualClicks,
    1.0
  ),
  create12TierChain(
    'prog_claim_tier',
    'Placer Stratigraphy',
    'Reach claim tier depth {threshold}',
    'PROGRESS',
    'Tier',
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15],
    (s) => s.claimTier,
    1.5
  ),
  create12TierChain(
    'prog_upgrades_bought',
    'Syndicate Mechanization',
    'Purchase {threshold} equipment upgrades',
    'PROGRESS',
    'upgrades',
    [5, 15, 35, 75, 150, 300, 600, 1_200, 2_500, 5_000, 10_000, 20_000],
    (s) => s.totalUpgradesBought,
    1.0
  ),
  create12TierChain(
    'prog_cash_spent',
    'Capital Outlay',
    'Invest {threshold} in mining equipment',
    'PROGRESS',
    '$',
    [25, 250, 2_000, 15_000, 100_000, 750_000, 5_000_000, 30_000_000, 200_000_000, 1_500_000_000, 10_000_000_000, 100_000_000_000],
    (s) => s.totalCashSpent,
    1.1
  ),
  create12TierChain(
    'prog_rebirths',
    'Pioneer Reclamation',
    'Complete {threshold} Claim Rebirths with discovered relics',
    'PROGRESS',
    'rebirths',
    [1, 2, 3, 5, 7, 10, 14, 18, 25, 35, 50, 75],
    (s) => s.totalRebirths || s.discoveredNuggets.length,
    1.8
  ),
  create12TierChain(
    'prog_certs_earned',
    'Certified Assayer',
    'Accumulate a career total of {threshold} certificates',
    'PROGRESS',
    '📜',
    [10, 30, 75, 150, 300, 600, 1_200, 2_500, 5_000, 10_000, 20_000, 50_000],
    (s) => s.prestigeTokens + (s.prestigePerks.reduce((acc, p) => acc + p.level * 25, 0)),
    1.3
  ),
  create12TierChain(
    'prog_perk_levels',
    'Syndicate Blueprint',
    'Unlock {threshold} total levels across Museum Tech Tree',
    'PROGRESS',
    'levels',
    [1, 3, 6, 10, 15, 20, 25, 30, 35, 40, 45, 50],
    (s) => s.prestigePerks.reduce((acc, p) => acc + p.level, 0),
    1.4
  ),
  create12TierChain(
    'prog_missions_claimed',
    'Contract Specialist',
    'Fulfill and claim {threshold} daily & weekly missions',
    'PROGRESS',
    'missions',
    [1, 5, 15, 30, 60, 100, 150, 220, 300, 400, 500, 650],
    (s) => s.totalMissionsClaimed,
    1.2
  ),
  create12TierChain(
    'prog_max_rate',
    'High Velocity Sifting',
    'Attain {threshold} processing speed per second',
    'PROGRESS',
    'g/s',
    [10, 50, 250, 1_000, 5_000, 25_000, 100_000, 500_000, 2_500_000, 10_000_000, 50_000_000, 200_000_000],
    (s) => {
      const base = s.machineryUpgrades.filter(u => u.id !== 'mach_bearing_grease').reduce((acc, u) => acc + u.level * u.powerIncrease, 0);
      return Math.round(base);
    },
    1.0
  ),
  create12TierChain(
    'prog_current_balance',
    'Liquid Treasury',
    'Hold {threshold} in ready cash reserves',
    'PROGRESS',
    '$',
    [50, 250, 1_500, 10_000, 75_000, 500_000, 3_500_000, 25_000_000, 150_000_000, 1_000_000_000, 10_000_000_000, 100_000_000_000],
    (s) => s.cash,
    1.0
  ),

  // ==========================================================================
  // 2. UPGRADES CATEGORY (15 chains x 12 tiers = 180 milestones)
  // ==========================================================================
  // Tools
  create12TierChain(
    'upg_tool_sieve',
    'Calibrated Sieve Craft',
    'Upgrade Calibrated Sieve to Level {threshold}',
    'UPGRADES',
    'lvl',
    [5, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000],
    (s) => s.toolsUpgrades.find(u => u.id === 'tool_sieve')?.level || 0
  ),
  create12TierChain(
    'upg_tool_magnetic_pan',
    'Magnetic Pan Polarity',
    'Upgrade Magnetic Pan to Level {threshold}',
    'UPGRADES',
    'lvl',
    [1, 2, 3, 4, 5, 7, 9, 11, 12, 13, 14, 15],
    (s) => s.toolsUpgrades.find(u => u.id === 'tool_magnetic_pan')?.level || 0
  ),
  create12TierChain(
    'upg_tool_prospector_rhythm',
    'Prospector Rhythm Flow',
    'Upgrade Prospector Rhythm to Level {threshold}',
    'UPGRADES',
    'lvl',
    [1, 2, 3, 4, 5, 6, 7, 8],
    (s) => s.toolsUpgrades.find(u => u.id === 'tool_prospector_rhythm')?.level || 0
  ),
  create12TierChain(
    'upg_tool_diamond_pickaxe',
    'Diamond Pickaxe Edge',
    'Upgrade Diamond-Tip Pickaxe to Level {threshold}',
    'UPGRADES',
    'lvl',
    [1, 2, 3, 5, 7, 10, 13, 16, 19, 21, 23, 25],
    (s) => s.toolsUpgrades.find(u => u.id === 'tool_diamond_pickaxe')?.level || 0
  ),
  // Machinery
  create12TierChain(
    'upg_mach_sluice_box',
    'Sluice Box Riffles',
    'Upgrade Sluice Box to Level {threshold}',
    'UPGRADES',
    'lvl',
    [2, 5, 8, 12, 16, 20, 25, 30, 35, 40, 45, 50],
    (s) => s.machineryUpgrades.find(u => u.id === 'mach_sluice_box')?.level || 0
  ),
  create12TierChain(
    'upg_mach_water_monitor',
    'Hydraulic Giant Pressure',
    'Upgrade High-Pressure Water Monitor to Level {threshold}',
    'UPGRADES',
    'lvl',
    [2, 5, 8, 12, 16, 20, 25, 30, 35, 40, 45, 50],
    (s) => s.machineryUpgrades.find(u => u.id === 'mach_water_monitor')?.level || 0
  ),
  create12TierChain(
    'upg_mach_diesel_trommel',
    'Diesel Trommel RPM',
    'Upgrade Diesel Trommel to Level {threshold}',
    'UPGRADES',
    'lvl',
    [2, 5, 8, 12, 16, 20, 25, 30, 35, 40, 45, 50],
    (s) => s.machineryUpgrades.find(u => u.id === 'mach_diesel_trommel')?.level || 0
  ),
  create12TierChain(
    'upg_mach_electric_dredge',
    'Electric Dredge Suction',
    'Upgrade Electric Dredge to Level {threshold}',
    'UPGRADES',
    'lvl',
    [2, 5, 8, 12, 16, 20, 25, 30, 35, 40, 45, 50],
    (s) => s.machineryUpgrades.find(u => u.id === 'mach_electric_dredge')?.level || 0
  ),
  create12TierChain(
    'upg_mach_bearing_grease',
    'Bearing Grease Viscosity',
    'Upgrade Synergy Bearing Grease to Level {threshold}',
    'UPGRADES',
    'lvl',
    [2, 5, 8, 12, 16, 20, 25, 30, 35, 40, 45, 50],
    (s) => s.machineryUpgrades.find(u => u.id === 'mach_bearing_grease')?.level || 0
  ),
  // Market
  create12TierChain(
    'upg_market_gravel_crusher',
    'Road Aggregate Output',
    'Upgrade Road Gravel Crusher to Level {threshold}',
    'UPGRADES',
    'lvl',
    [5, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000],
    (s) => s.marketUpgrades.find(u => u.id === 'market_gravel_crusher')?.level || 0
  ),
  create12TierChain(
    'upg_market_gold_concentrator',
    'Centrifugal Centrifuge',
    'Upgrade Gold Concentrator to Level {threshold}',
    'UPGRADES',
    'lvl',
    [1, 2, 3, 5, 7, 10, 13, 16, 19, 21, 23, 25],
    (s) => s.marketUpgrades.find(u => u.id === 'market_gold_concentrator')?.level || 0
  ),
  create12TierChain(
    'upg_market_bulk_contract',
    'Bulk Freight Contracts',
    'Upgrade Bulk Delivery Contract to Level {threshold}',
    'UPGRADES',
    'lvl',
    [1, 2, 3, 5, 7, 9, 11, 13, 15, 17, 19, 20],
    (s) => s.marketUpgrades.find(u => u.id === 'market_bulk_contract')?.level || 0
  ),
  // Geology
  create12TierChain(
    'upg_geo_probe',
    'Sonic Acoustic Probe',
    'Upgrade Geological Probe to Level {threshold}',
    'UPGRADES',
    'lvl',
    [1, 2, 3, 4],
    (s) => s.geologyUpgrades.find(u => u.id === 'geo_probe')?.level || 0
  ),
  create12TierChain(
    'upg_geo_pulse_detector',
    'Electromagnetic Pulse',
    'Upgrade Pulse Metal Detector to Level {threshold}',
    'UPGRADES',
    'lvl',
    [1],
    (s) => s.geologyUpgrades.find(u => u.id === 'geo_pulse_detector')?.level || 0
  ),
  create12TierChain(
    'upg_geo_radar',
    'Sub-Surface GPR',
    'Upgrade Ground Penetrating Radar to Level {threshold}',
    'UPGRADES',
    'lvl',
    [1, 2, 3],
    (s) => s.geologyUpgrades.find(u => u.id === 'geo_radar')?.level || 0
  ),

  // ==========================================================================
  // 3. MASTERY & HAZARDS CATEGORY (8 chains x 12 tiers = 96 milestones)
  // ==========================================================================
  create12TierChain(
    'mast_crits',
    'Magnetic Crit Precision',
    'Score {threshold} magnetic 10x critical strikes',
    'MASTERY',
    'crits',
    [5, 20, 50, 120, 300, 750, 1_500, 3_500, 8_000, 18_000, 40_000, 100_000],
    (s) => s.totalCrits || Math.floor(s.totalManualClicks * 0.08),
    1.1
  ),
  create12TierChain(
    'mast_shatters',
    'Diamond Vein Shatters',
    'Trigger {threshold} instant diamond pick vein fractures',
    'MASTERY',
    'shatters',
    [3, 10, 25, 60, 150, 350, 800, 1_800, 4_000, 9_000, 20_000, 50_000],
    (s) => s.totalShatters || Math.floor(s.totalManualClicks * 0.03),
    1.2
  ),
  create12TierChain(
    'mast_combo',
    'Rhythm Cadence Mastery',
    'Achieve a swirl rhythm combo multiplier of {threshold}x',
    'MASTERY',
    'x',
    [1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0, 3.2, 3.5],
    (s) => Math.max(s.comboMultiplier, s.maxComboReached || 1.0),
    1.3
  ),
  create12TierChain(
    'mast_flakes',
    'Concentrator Gold Flakes',
    'Extract {threshold} instant raw gold flake deposits',
    'MASTERY',
    'flakes',
    [3, 10, 25, 60, 150, 350, 800, 1_800, 4_000, 9_000, 20_000, 50_000],
    (s) => s.totalFlakesFound || 0,
    1.2
  ),
  create12TierChain(
    'mast_bulk_deliveries',
    'Bulk Freight Logistics',
    'Dispatch {threshold} commercial aggregate shipments',
    'MASTERY',
    'freights',
    [2, 6, 15, 35, 80, 180, 400, 900, 2_000, 4_500, 10_000, 25_000],
    (s) => s.totalBulkDeliveries || 0,
    1.1
  ),
  create12TierChain(
    'mast_weather_survived',
    'Mountain Meteorology',
    'Work through {threshold} mountain weather shifts',
    'MASTERY',
    'cycles',
    [3, 8, 20, 45, 100, 200, 400, 800, 1_600, 3_000, 6_000, 12_000],
    (s) => s.totalWeatherCycles || 0,
    1.0
  ),
  create12TierChain(
    'mast_tap_spurt',
    'Endurance Panner',
    'Execute {threshold} gold pan swirl scoops today',
    'MASTERY',
    'taps',
    [50, 150, 400, 1_000, 2_500, 5_000, 10_000, 20_000, 40_000, 80_000, 160_000, 300_000],
    (s) => s.todayManualClicks,
    1.0
  ),
  create12TierChain(
    'mast_hard_rock',
    'Hardness Penetration',
    'Overcome rock formations with hardness of at least {threshold}x',
    'MASTERY',
    'x Hardness',
    [1.0, 2.5, 6.0, 15.0, 38.0, 95.0, 200.0, 500.0, 1200.0, 3000.0, 8000.0, 20000.0],
    (s) => Math.max(s.highestHardnessBeaten || 1.0, 1.0 * Math.pow(2.5, Math.max(0, s.claimTier - 1))),
    1.5
  ),

  // ==========================================================================
  // 4. MUSEUM & DISCOVERY CATEGORY (7 chains x 12 tiers = 84 milestones)
  // ==========================================================================
  create12TierChain(
    'mus_nuggets_found',
    'Nugget Collector',
    'Discover and catalog {threshold} legendary golden relics',
    'MUSEUM',
    'relics',
    [1, 2, 3, 4, 5, 7, 10, 15, 20, 30, 45, 60],
    (s) => s.discoveredNuggets.length,
    1.6
  ),
  create12TierChain(
    'mus_total_weight',
    'Museum Vault Mass',
    'Curate {threshold} of total native gold weight',
    'MUSEUM',
    'g',
    [30, 100, 300, 800, 2_000, 5_000, 12_000, 30_000, 75_000, 180_000, 400_000, 1_000_000],
    (s) => Math.round(s.discoveredNuggets.reduce((acc, n) => acc + n.weightGrams, 0)),
    1.4
  ),
  create12TierChain(
    'mus_max_single_weight',
    'The Great Boulder',
    'Unearth a single nugget weighing over {threshold}',
    'MUSEUM',
    'g',
    [40, 80, 150, 300, 600, 1_200, 2_500, 5_000, 10_000, 25_000, 60_000, 150_000],
    (s) => Math.round(s.discoveredNuggets.reduce((max, n) => Math.max(max, n.weightGrams), 0)),
    1.5
  ),
  create12TierChain(
    'mus_highest_bonus',
    'Legendary Radiance',
    'Possess a nugget with multiplier bonus of at least +{threshold}%',
    'MUSEUM',
    '% bonus',
    [25, 50, 75, 100, 150, 200, 300, 400, 600, 900, 1400, 2000],
    (s) => Math.round(s.discoveredNuggets.reduce((max, n) => Math.max(max, n.multiplierBonus * 100), 0)),
    1.4
  ),
  create12TierChain(
    'mus_total_carats',
    'Carat Assay Rating',
    'Refine a total estimated purity of {threshold} carats',
    'MUSEUM',
    'ct',
    [50, 150, 400, 1_000, 2_500, 6_000, 15_000, 35_000, 80_000, 180_000, 400_000, 1_000_000],
    (s) => Math.round(s.discoveredNuggets.reduce((acc, n) => acc + n.weightGrams * 5.0, 0)),
    1.3
  ),
  create12TierChain(
    'mus_certs_from_nuggets',
    'Royal Assayer Endorsement',
    'Obtain {threshold} Assayer certificates from relic donations',
    'MUSEUM',
    '📜',
    [50, 150, 400, 1_000, 2_500, 6_000, 15_000, 35_000, 80_000, 180_000, 400_000, 1_000_000],
    (s) => Math.round(s.discoveredNuggets.reduce((acc, n) => acc + (n.certificatesAwarded || 25), 0)),
    1.4
  ),
  create12TierChain(
    'mus_tiers_cataloged',
    'Geological Horizons',
    'Uncover nuggets across {threshold} distinct claim tiers',
    'MUSEUM',
    'tiers',
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15],
    (s) => new Set(s.discoveredNuggets.map(n => n.claimTier)).size,
    1.6
  ),

  // ==========================================================================
  // 5. SECRETS / EASTER EGGS (12 one-shot secret milestones)
  // ==========================================================================
  {
    id: 'sec_night_owl',
    title: 'Night Owl Prospector',
    descriptionFormat: 'Pan for gold in the dark hours of midnight (00:00 - 05:00)',
    category: 'SECRETS',
    unit: 'easter egg',
    tiers: [
      {
        tierLevel: 1,
        threshold: 1,
        titleSuffix: 'Secret I',
        tierRank: 'Secret',
        rewardCash: 500,
        rewardCertificates: 25
      }
    ],
    getValue: () => {
      const h = new Date().getHours();
      return (h >= 0 && h < 5) ? 1 : 0;
    }
  },
  {
    id: 'sec_speed_demon',
    title: 'Klondike Blitz',
    descriptionFormat: 'Rapid-fire swirling: trigger 15 manual taps in quick succession',
    category: 'SECRETS',
    unit: 'easter egg',
    tiers: [
      {
        tierLevel: 1,
        threshold: 1,
        titleSuffix: 'Secret I',
        tierRank: 'Secret',
        rewardCash: 750,
        rewardCertificates: 30
      }
    ],
    getValue: (s) => (s.comboMultiplier >= 2.5 ? 1 : 0)
  },
  {
    id: 'sec_penny_pincher',
    title: 'Scrooge McDuck',
    descriptionFormat: 'Hoard over $1,000,000 in unspent liquid cash',
    category: 'SECRETS',
    unit: 'easter egg',
    tiers: [
      {
        tierLevel: 1,
        threshold: 1,
        titleSuffix: 'Secret I',
        tierRank: 'Secret',
        rewardCash: 2500,
        rewardCertificates: 50
      }
    ],
    getValue: (s) => (s.cash >= 1_000_000 ? 1 : 0)
  },
  {
    id: 'sec_dirt_poor',
    title: 'Down to the Penny',
    descriptionFormat: 'Have under $0.50 with active machinery running',
    category: 'SECRETS',
    unit: 'easter egg',
    tiers: [
      {
        tierLevel: 1,
        threshold: 1,
        titleSuffix: 'Secret I',
        tierRank: 'Secret',
        rewardCash: 100,
        rewardCertificates: 10
      }
    ],
    getValue: (s) => (s.cash < 0.50 && s.totalUpgradesBought > 0 ? 1 : 0)
  },
  {
    id: 'sec_rock_bottom',
    title: 'Scraping the Bedrock',
    descriptionFormat: 'Sift until less than 500 grams remain in your active claim',
    category: 'SECRETS',
    unit: 'easter egg',
    tiers: [
      {
        tierLevel: 1,
        threshold: 1,
        titleSuffix: 'Secret I',
        tierRank: 'Secret',
        rewardCash: 1200,
        rewardCertificates: 35
      }
    ],
    getValue: (s) => (s.remainingDirtGrams > 0 && s.remainingDirtGrams < 500 ? 1 : 0)
  },
  {
    id: 'sec_overheat_king',
    title: 'Rhythm Overdrive',
    descriptionFormat: 'Max out your prospector rhythm combo multiplier to 3.0x',
    category: 'SECRETS',
    unit: 'easter egg',
    tiers: [
      {
        tierLevel: 1,
        threshold: 1,
        titleSuffix: 'Secret I',
        tierRank: 'Secret',
        rewardCash: 1500,
        rewardCertificates: 40
      }
    ],
    getValue: (s) => (s.comboMultiplier >= 3.0 ? 1 : 0)
  },
  {
    id: 'sec_persistent',
    title: 'Iron Wrist Prospector',
    descriptionFormat: 'Log over 300 manual scoops in a single day',
    category: 'SECRETS',
    unit: 'easter egg',
    tiers: [
      {
        tierLevel: 1,
        threshold: 1,
        titleSuffix: 'Secret I',
        tierRank: 'Secret',
        rewardCash: 1000,
        rewardCertificates: 30
      }
    ],
    getValue: (s) => (s.todayManualClicks >= 300 ? 1 : 0)
  },
  {
    id: 'sec_storm_chaser',
    title: 'Mountain Storm Chaser',
    descriptionFormat: 'Pan during Heavy Rain or River Swell weather event',
    category: 'SECRETS',
    unit: 'easter egg',
    tiers: [
      {
        tierLevel: 1,
        threshold: 1,
        titleSuffix: 'Secret I',
        tierRank: 'Secret',
        rewardCash: 600,
        rewardCertificates: 20
      }
    ],
    getValue: (s) => (s.currentWeather.type === 'HEAVY_RAIN' || s.currentWeather.type === 'RIVER_SWELL' ? 1 : 0)
  },
  {
    id: 'sec_jackpot',
    title: 'Bonanza Flake',
    descriptionFormat: 'Find at least 5 raw gold flakes with the centrifugal concentrator',
    category: 'SECRETS',
    unit: 'easter egg',
    tiers: [
      {
        tierLevel: 1,
        threshold: 1,
        titleSuffix: 'Secret I',
        tierRank: 'Secret',
        rewardCash: 2000,
        rewardCertificates: 45
      }
    ],
    getValue: (s) => (s.totalFlakesFound >= 5 ? 1 : 0)
  },
  {
    id: 'sec_collector',
    title: 'Museum Connoisseur',
    descriptionFormat: 'House at least 3 unique golden relics in the Museum display',
    category: 'SECRETS',
    unit: 'easter egg',
    tiers: [
      {
        tierLevel: 1,
        threshold: 1,
        titleSuffix: 'Secret I',
        tierRank: 'Secret',
        rewardCash: 3000,
        rewardCertificates: 60
      }
    ],
    getValue: (s) => (s.discoveredNuggets.length >= 3 ? 1 : 0)
  },
  {
    id: 'sec_synergy',
    title: 'Industrial Harmony',
    descriptionFormat: 'Own at least level 10 across all 4 primary machinery upgrades',
    category: 'SECRETS',
    unit: 'easter egg',
    tiers: [
      {
        tierLevel: 1,
        threshold: 1,
        titleSuffix: 'Secret I',
        tierRank: 'Secret',
        rewardCash: 4000,
        rewardCertificates: 80
      }
    ],
    getValue: (s) => {
      const sluice = s.machineryUpgrades.find(u => u.id === 'mach_sluice_box')?.level || 0;
      const pump = s.machineryUpgrades.find(u => u.id === 'mach_water_monitor')?.level || 0;
      const trommel = s.machineryUpgrades.find(u => u.id === 'mach_diesel_trommel')?.level || 0;
      const dredge = s.machineryUpgrades.find(u => u.id === 'mach_electric_dredge')?.level || 0;
      return (sluice >= 10 && pump >= 10 && trommel >= 10 && dredge >= 10) ? 1 : 0;
    }
  },
  {
    id: 'sec_perfectionist',
    title: 'Klondike Pioneer Grandmaster',
    descriptionFormat: 'Claim at least one milestone in every major category',
    category: 'SECRETS',
    unit: 'easter egg',
    tiers: [
      {
        tierLevel: 1,
        threshold: 1,
        titleSuffix: 'Secret I',
        tierRank: 'Secret',
        rewardCash: 5000,
        rewardCertificates: 100
      }
    ],
    getValue: (s) => {
      const hasProgress = Object.keys(s.claimedMilestones || {}).some(k => k.startsWith('prog_'));
      const hasUpgrades = Object.keys(s.claimedMilestones || {}).some(k => k.startsWith('upg_'));
      const hasMastery = Object.keys(s.claimedMilestones || {}).some(k => k.startsWith('mast_'));
      const hasMuseum = Object.keys(s.claimedMilestones || {}).some(k => k.startsWith('mus_'));
      return (hasProgress && hasUpgrades && hasMastery && hasMuseum) ? 1 : 0;
    }
  }
];

export const TOTAL_MILESTONES_COUNT = ACHIEVEMENT_CHAINS.reduce((acc, c) => acc + c.tiers.length, 0);

export function getClaimedMilestonesCount(claimedMilestones: Record<string, number>): number {
  if (!claimedMilestones) return 0;
  return Object.values(claimedMilestones).reduce((sum, lvl) => sum + (lvl || 0), 0);
}

export function getAchievementMetaMultiplier(claimedMilestones: Record<string, number>): number {
  const count = getClaimedMilestonesCount(claimedMilestones);
  return 1.0 + count * 0.003; // +0.3% per claimed milestone!
}

export const CATEGORY_UNLOCK_TIERS: Record<AchievementCategory, number> = {
  PROGRESS: 2,   // Mine 2 (Compacted Creek Clay)
  UPGRADES: 3,   // Mine 3 (Glacial Till & Granite)
  MASTERY: 4,    // Mine 4 (Cemented Bedrock Bench)
  MUSEUM: 5,     // Mine 5 (Permafrost Quartz Vein)
  SECRETS: 6     // Mine 6 (Abyssal Hypothermal Fissure)
};

export function getMaxUnlockedAchievementTier(claimTier: number): number {
  if (claimTier < 2) return 0; // Completely locked on Mine 1
  if (claimTier === 2) return 2; // Bronze I, II
  if (claimTier === 3) return 4; // up to Silver I
  if (claimTier === 4) return 6; // up to Silver III
  if (claimTier === 5) return 8; // up to Gold II
  if (claimTier === 6) return 10; // up to Diamond I
  return 12; // Mine 7+: all Diamond tiers
}

export function getRequiredMineForTier(tierLevel: number): number {
  if (tierLevel <= 2) return 2;
  if (tierLevel <= 4) return 3;
  if (tierLevel <= 6) return 4;
  if (tierLevel <= 8) return 5;
  if (tierLevel <= 10) return 6;
  return 7;
}

export function isAchievementCategoryUnlocked(category: AchievementCategory, claimTier: number): boolean {
  return claimTier >= CATEGORY_UNLOCK_TIERS[category];
}

export function isMilestoneTierUnlocked(category: AchievementCategory, tierLevel: number, claimTier: number): boolean {
  if (!isAchievementCategoryUnlocked(category, claimTier)) return false;
  return tierLevel <= getMaxUnlockedAchievementTier(claimTier);
}

export const CUMULATIVE_CHAINS = new Set([
  'prog_dirt',
  'prog_cash',
  'prog_taps',
  'prog_upgrades_bought',
  'prog_cash_spent',
  'prog_rebirths',
  'prog_certs_earned',
  'prog_perk_levels',
  'prog_missions_claimed',
  'mast_crits',
  'mast_shatters',
  'mast_flakes',
  'mast_bulk_deliveries',
  'mast_weather_survived',
  'mus_nuggets_found',
  'mus_total_weight',
  'mus_total_carats',
  'mus_certs_from_nuggets'
]);

/**
 * Calculates current progress of an achievement tier.
 * - If the tier is NOT unlocked on the current mine/category: returns 0 (no pre-accumulated completion).
 * - If the tier is unlocked:
 *   - For cumulative lifetime metrics: returns (currentRaw - baselineAtActivation)
 *   - For state/level metrics: returns currentRaw
 */
export function getChainCurrentProgress(
  chain: AchievementChain,
  tier: AchievementTier,
  state: GameState
): number {
  const isUnlocked = isMilestoneTierUnlocked(chain.category, tier.tierLevel, state.claimTier);
  if (!isUnlocked) {
    return 0; // LOCKED: Zero progress until this tier is unlocked on its designated mine!
  }

  const rawValue = chain.getValue(state);

  if (CUMULATIVE_CHAINS.has(chain.id)) {
    const baseline = state.milestoneBaselines?.[chain.id] ?? 0;
    return Math.max(0, rawValue - baseline);
  }

  return rawValue;
}

/**
 * Synchronizes/initializes baselines for all achievement chains when entering a new mine or state.
 * For any newly unlocked active chain that does not have an active baseline, captures the current raw value as baseline.
 */
export function syncMilestoneBaselines(
  state: GameState,
  targetClaimTier?: number
): Record<string, number> {
  const claimTier = targetClaimTier ?? state.claimTier;
  const baselines: Record<string, number> = { ...(state.milestoneBaselines ?? {}) };

  if (claimTier < 2) {
    return {}; // All achievements locked on Mine 1
  }

  for (const chain of ACHIEVEMENT_CHAINS) {
    if (!isAchievementCategoryUnlocked(chain.category, claimTier)) {
      delete baselines[chain.id];
      continue;
    }

    const currentClaimed = state.claimedMilestones?.[chain.id] || 0;
    if (currentClaimed >= chain.tiers.length) {
      delete baselines[chain.id];
      continue;
    }

    const activeTier = chain.tiers[currentClaimed];
    const isTierUnlocked = isMilestoneTierUnlocked(chain.category, activeTier.tierLevel, claimTier);

    if (!isTierUnlocked) {
      delete baselines[chain.id];
    } else {
      if (baselines[chain.id] === undefined && CUMULATIVE_CHAINS.has(chain.id)) {
        baselines[chain.id] = chain.getValue(state);
      }
    }
  }

  return baselines;
}

export function getTierColorClasses(rank: TierRank): {
  border: string;
  badge: string;
  text: string;
  progress: string;
  glow: string;
} {
  switch (rank) {
    case 'Bronze':
      return {
        border: 'border-[#CD7F32]/80',
        badge: 'bg-[#CD7F32]/25 text-[#FDBA74] border-[#CD7F32]/50',
        text: 'text-[#FDBA74]',
        progress: 'bg-gradient-to-r from-[#B45309] to-[#F59E0B]',
        glow: 'shadow-[#CD7F32]/20'
      };
    case 'Silver':
      return {
        border: 'border-[#94A3B8]/80',
        badge: 'bg-[#94A3B8]/25 text-[#F1F5F9] border-[#94A3B8]/50',
        text: 'text-[#E2E8F0]',
        progress: 'bg-gradient-to-r from-[#64748B] to-[#CBD5E1]',
        glow: 'shadow-[#94A3B8]/20'
      };
    case 'Gold':
      return {
        border: 'border-[#E5A93C]',
        badge: 'bg-[#E5A93C]/25 text-[#F6D166] border-[#E5A93C]/60',
        text: 'text-[#F6D166]',
        progress: 'bg-gradient-to-r from-[#D97706] to-[#FBBF24]',
        glow: 'shadow-[#E5A93C]/30'
      };
    case 'Diamond':
      return {
        border: 'border-[#0284C7]',
        badge: 'bg-[#0284C7]/25 text-[#38BDF8] border-[#0284C7]/60',
        text: 'text-[#38BDF8]',
        progress: 'bg-gradient-to-r from-[#0284C7] to-[#38BDF8]',
        glow: 'shadow-[#0284C7]/30'
      };
    case 'Secret':
      return {
        border: 'border-[#9333EA]',
        badge: 'bg-[#9333EA]/25 text-[#C084FC] border-[#9333EA]/60',
        text: 'text-[#C084FC]',
        progress: 'bg-gradient-to-r from-[#7E22CE] to-[#C084FC]',
        glow: 'shadow-[#9333EA]/30'
      };
  }
}
