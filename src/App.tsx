/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Pickaxe,
  Waves,
  Coins,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Code2,
  Smartphone,
  Maximize2,
  RotateCcw,
  Hammer,
  Layers,
  Box,
  Cog,
  ChevronsRight,
  Disc,
  Grid,
  CheckCircle2,
  Settings,
  Award,
  Sliders,
  X,
  ArrowRight,
  Sun,
  CloudRain,
  SunMedium,
  Wind,
  Flame,
  Check,
  RefreshCw,
  Search,
  Zap,
  TrendingUp,
  Radar,
  Radio,
  Truck,
  Scroll,
  ShieldAlert,
  Calendar,
  CalendarDays,
  Clock,
  Languages,
  Lock,
  GraduationCap,
  Target,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  useI18n,
  getUpgradeText,
  getClaimName,
  getPerkText,
  getNuggetText,
  RANK_TRANSLATIONS
} from './i18n';
import { TUTORIAL_STEPS, isTutorialStepCompleted } from './utils/tutorial';
import {
  GameState,
  UpgradeItem,
  UpgradeBranch,
  BuyMode,
  GoldenNugget,
  PrestigePerk,
  ClaimTierInfo,
  FloatingParticle,
  Achievement,
  WeatherEvent,
  DailyMission,
  WeeklyMission,
  WeatherType,
  MissionType,
  AchievementCategory
} from './types';
import { formatNumber, formatCash, formatGrams } from './utils/formatters';
import { sound } from './utils/audio';
import { GoldPanCanvas } from './components/GoldPanCanvas';
import { KotlinCodeViewer } from './components/KotlinCodeViewer';
import { ProceduralNuggetThumbnail } from './components/ProceduralNuggetThumbnail';
import {
  getMilestoneMultiplier,
  getMilestoneProgress,
  getBulkPurchaseInfo,
  getUpgradeActiveDescription,
  getMachineryMaxLevel,
  getNextMachineryMaxLevel
} from './utils/upgradeCalculations';
import {
  ACHIEVEMENT_CHAINS,
  TOTAL_MILESTONES_COUNT,
  getClaimedMilestonesCount,
  getAchievementMetaMultiplier,
  getTierColorClasses,
  CATEGORY_UNLOCK_TIERS,
  getMaxUnlockedAchievementTier,
  getRequiredMineForTier,
  isAchievementCategoryUnlocked,
  isMilestoneTierUnlocked,
  CUMULATIVE_CHAINS,
  getChainCurrentProgress,
  syncMilestoneBaselines
} from './utils/achievementChains';

const DEFAULT_BASE_GRAVEL_PRICE = 0.01;

export const CLAIM_TIERS: ClaimTierInfo[] = [
  { tier: 1, name: 'Riverbank Alluvium', capacityGrams: 500_000, baseHardness: 0.8 },
  { tier: 2, name: 'Compacted Creek Clay', capacityGrams: 8_000_000, baseHardness: 2.0 },
  { tier: 3, name: 'Glacial Till & Granite', capacityGrams: 64_000_000, baseHardness: 3.2 },
  { tier: 4, name: 'Cemented Bedrock Bench', capacityGrams: 512_000_000, baseHardness: 4.8 },
  { tier: 5, name: 'Permafrost Quartz Vein', capacityGrams: 4_096_000_000, baseHardness: 7.0 },
  { tier: 6, name: 'Abyssal Hypothermal Fissure', capacityGrams: 32_768_000_000, baseHardness: 10.0 }
];

export function getTierRichnessMultiplier(tier: number): number {
  if (tier <= 1) return 1.0;
  if (tier === 2) return 2.0;
  if (tier === 3) return 4.0;
  if (tier === 4) return 8.0;
  if (tier === 5) return 18.0;
  if (tier === 6) return 40.0;
  return 40.0 * Math.pow(2.2, tier - 6);
}

export function getClaimTierInfo(tier: number): ClaimTierInfo {
  const index = Math.max(0, tier - 1);
  if (index < CLAIM_TIERS.length) {
    return CLAIM_TIERS[index];
  }
  const cap = 1_000_000 * Math.pow(8, index);
  const hardness = Number((10.0 * Math.pow(1.35, index - 5)).toFixed(1));
  return { tier, name: `Tier ${tier}: Deep Pluton`, capacityGrams: cap, baseHardness: hardness };
}

/**
 * Spawns strictly in the bottom 25% of the claim (between 75% and 95% depth)
 */
export function generateNuggetDepth(capacity: number): number {
  const depthFraction = 0.75 + Math.random() * 0.20;
  return capacity * (1.0 - depthFraction);
}

const DEFAULT_PRESTIGE_PERKS: PrestigePerk[] = [
  {
    id: 'perk_diamond_chisels',
    name: 'Diamond Chisel Bits',
    description: '-10% Rock Hardness per level (up to -50%)',
    level: 0,
    maxLevel: 5,
    baseCost: 25,
    costRatio: 1.8,
    effectValuePerLevel: 0.10,
    iconName: 'chisel'
  },
  {
    id: 'perk_assayer_grade',
    name: "Certified Assayer's Seal",
    description: '+25% Permanent Gravel Price per level',
    level: 0,
    maxLevel: 10,
    baseCost: 30,
    costRatio: 1.7,
    effectValuePerLevel: 0.25,
    iconName: 'seal'
  },
  {
    id: 'perk_grubstake',
    name: 'Frontier Grubstake',
    description: 'Start new claims with +$50.00 cash per level',
    level: 0,
    maxLevel: 10,
    baseCost: 20,
    costRatio: 1.6,
    effectValuePerLevel: 50.0,
    iconName: 'grubstake'
  },
  {
    id: 'perk_master_prospector',
    name: 'Master Prospector',
    description: '+20% Global Manual & Machine Output per level',
    level: 0,
    maxLevel: 10,
    baseCost: 40,
    costRatio: 1.9,
    effectValuePerLevel: 0.20,
    iconName: 'prospector'
  },
  {
    id: 'perk_overburden_strip',
    name: 'Topsoil Steam Shovel',
    description: 'Auto-strips 5% initial barren overburden on every claim',
    level: 0,
    maxLevel: 6,
    baseCost: 50,
    costRatio: 2.0,
    effectValuePerLevel: 0.05,
    iconName: 'shovel'
  }
];

const WEATHER_POOL: WeatherEvent[] = [
  {
    type: 'CLEAR_SKIES',
    name: 'Clear Skies',
    description: 'Temperate mountain conditions across the claim.',
    manualMultiplier: 1.0,
    machineryMultiplier: 1.0,
    gravelPriceMultiplier: 1.0,
    durationSeconds: 60,
    iconName: 'sun',
    effectLabel: 'Normal Yields'
  },
  {
    type: 'HEAVY_RAIN',
    name: 'Heavy Rain',
    description: 'Rushing mountain runoff floods the river flumes! +20% manual speed.',
    manualMultiplier: 1.20,
    machineryMultiplier: 1.0,
    gravelPriceMultiplier: 1.0,
    durationSeconds: 45,
    iconName: 'rain',
    effectLabel: '+20% Manual Speed'
  },
  {
    type: 'DROUGHT',
    name: 'Summer Drought',
    description: 'Low water levels reduce hydraulic sluice pump pressure. -10% machinery efficiency.',
    manualMultiplier: 1.0,
    machineryMultiplier: 0.90,
    gravelPriceMultiplier: 1.0,
    durationSeconds: 40,
    iconName: 'drought',
    effectLabel: '-10% Machine Rate'
  },
  {
    type: 'RIVER_SWELL',
    name: 'River Swell',
    description: 'Powerful river current spins trommels and water wheels! +25% machine auto rate.',
    manualMultiplier: 1.10,
    machineryMultiplier: 1.25,
    gravelPriceMultiplier: 1.0,
    durationSeconds: 45,
    iconName: 'swell',
    effectLabel: '+25% Machine Rate'
  },
  {
    type: 'HEAT_WAVE',
    name: 'Scorching Heat',
    description: 'Regional construction boom spikes gravel and sand demand! +30% gravel sale price.',
    manualMultiplier: 1.0,
    machineryMultiplier: 1.0,
    gravelPriceMultiplier: 1.30,
    durationSeconds: 50,
    iconName: 'heat',
    effectLabel: '+30% Gravel Price'
  }
];

// ============================================================================
// EXPANDED DAILY MISSIONS POOL (SCALED UP FOR 1M+ CLAIM CAPACITIES)
// ============================================================================

export const DAILY_MISSION_POOL: Omit<DailyMission, 'currentProgress' | 'isClaimed'>[] = [
  { id: 'm_sift_100k', title: 'Alluvial Shoveler', description: 'Sift 100,000 g of paydirt today', target: 100_000, rewardCash: 350.0, rewardCertificates: 5, type: 'SIFT_DIRT', unit: 'g' },
  { id: 'm_sift_250k', title: 'Terrace Flume Shoveler', description: 'Sift 250,000 g of paydirt today', target: 250_000, rewardCash: 650.0, rewardCertificates: 8, type: 'SIFT_DIRT', unit: 'g' },
  { id: 'm_sift_350k', title: 'Deep Pit Excavator', description: 'Sift 350,000 g of paydirt today', target: 350_000, rewardCash: 900.0, rewardCertificates: 10, type: 'SIFT_DIRT', unit: 'g' },
  { id: 'm_sift_500k', title: 'Bedrock Channel Cutter', description: 'Sift 500,000 g of paydirt today', target: 500_000, rewardCash: 1_400.0, rewardCertificates: 12, type: 'SIFT_DIRT', unit: 'g' },
  { id: 'm_sift_750k', title: 'Bedrock Stripper', description: 'Sift 750,000 g of paydirt today', target: 750_000, rewardCash: 2_200.0, rewardCertificates: 15, type: 'SIFT_DIRT', unit: 'g' },
  { id: 'm_spend_2500', title: 'Equipment Investor', description: 'Spend $2,500.00 on claim upgrades today', target: 2_500, rewardCash: 600.0, rewardCertificates: 8, type: 'SPEND_CASH', unit: '$' },
  { id: 'm_spend_5000', title: 'Capital Equipment Outfitter', description: 'Spend $5,000.00 on claim upgrades today', target: 5_000, rewardCash: 1_250.0, rewardCertificates: 12, type: 'SPEND_CASH', unit: '$' },
  { id: 'm_spend_10k', title: 'Industrial Magnate', description: 'Spend $10,000.00 on claim upgrades today', target: 10_000, rewardCash: 2_500.0, rewardCertificates: 18, type: 'SPEND_CASH', unit: '$' },
  { id: 'm_buy_15', title: 'Fleet Modernization', description: 'Purchase 15 upgrades today', target: 15, rewardCash: 500.0, rewardCertificates: 6, type: 'BUY_UPGRADES', unit: 'upgrades' },
  { id: 'm_buy_25', title: 'Industrial Modernizer', description: 'Purchase 25 upgrades today', target: 25, rewardCash: 800.0, rewardCertificates: 9, type: 'BUY_UPGRADES', unit: 'upgrades' },
  { id: 'm_buy_35', title: 'Heavy Mechanization', description: 'Purchase 35 upgrades today', target: 35, rewardCash: 1_200.0, rewardCertificates: 12, type: 'BUY_UPGRADES', unit: 'upgrades' },
  { id: 'm_taps_250', title: 'Prospector Swirl', description: 'Manually scoop the gold pan 250 times', target: 250, rewardCash: 400.0, rewardCertificates: 5, type: 'MANUAL_CLICKS', unit: 'taps' },
  { id: 'm_taps_400', title: 'Rhythmic Gold Panner', description: 'Manually scoop the gold pan 400 times', target: 400, rewardCash: 650.0, rewardCertificates: 8, type: 'MANUAL_CLICKS', unit: 'taps' },
  { id: 'm_taps_600', title: 'Swirl Master', description: 'Manually scoop the gold pan 600 times', target: 600, rewardCash: 950.0, rewardCertificates: 12, type: 'MANUAL_CLICKS', unit: 'taps' },
  { id: 'm_earn_1500', title: 'Gravel Merchant', description: 'Earn $1,500.00 from industrial gravel today', target: 1_500, rewardCash: 500.0, rewardCertificates: 7, type: 'EARN_CASH', unit: '$' },
  { id: 'm_earn_3000', title: 'Aggregate Freight Broker', description: 'Earn $3,000.00 from industrial gravel today', target: 3_000, rewardCash: 950.0, rewardCertificates: 10, type: 'EARN_CASH', unit: '$' },
  { id: 'm_earn_5000', title: 'Mineral Supplier', description: 'Earn $5,000.00 from industrial gravel today', target: 5_000, rewardCash: 1_500.0, rewardCertificates: 15, type: 'EARN_CASH', unit: '$' }
];

export function generateDailyMissions(): DailyMission[] {
  const shuffled = [...DAILY_MISSION_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5).map((m) => ({
    ...m,
    currentProgress: 0,
    isClaimed: false
  }));
}

// ============================================================================
// NEW WEEKLY MISSIONS POOL (7-DAY DURATION & HIGH VALUE PRESTIGE REWARDS)
// ============================================================================

export const WEEKLY_MISSION_POOL: Omit<WeeklyMission, 'currentProgress' | 'isClaimed'>[] = [
  { id: 'wm_sift_5m', title: 'Klondike Earthmover', description: 'Sift 5,000,000 g of paydirt this week', target: 5_000_000, rewardCash: 18_000.0, rewardCertificates: 45, type: 'SIFT_DIRT', unit: 'g' },
  { id: 'wm_sift_10m', title: 'High-Bench Terrace Dredger', description: 'Sift 10,000,000 g of paydirt this week', target: 10_000_000, rewardCash: 35_000.0, rewardCertificates: 65, type: 'SIFT_DIRT', unit: 'g' },
  { id: 'wm_sift_25m', title: 'Glacial Basin Dredger', description: 'Sift 25,000,000 g of paydirt this week', target: 25_000_000, rewardCash: 75_000.0, rewardCertificates: 90, type: 'SIFT_DIRT', unit: 'g' },
  { id: 'wm_sift_50m', title: 'Deep Canyon Excavation', description: 'Sift 50,000,000 g of paydirt this week', target: 50_000_000, rewardCash: 120_000.0, rewardCertificates: 130, type: 'SIFT_DIRT', unit: 'g' },
  { id: 'wm_sift_100m', title: 'Glacial Bedrock Core Drill', description: 'Sift 100,000,000 g of paydirt this week', target: 100_000_000, rewardCash: 250_000.0, rewardCertificates: 220, type: 'SIFT_DIRT', unit: 'g' },
  { id: 'wm_spend_50k', title: 'Heavy Iron Procurement', description: 'Spend $50,000.00 on equipment this week', target: 50_000, rewardCash: 22_000.0, rewardCertificates: 40, type: 'SPEND_CASH', unit: '$' },
  { id: 'wm_spend_100k', title: 'Mining Syndicate Capital', description: 'Spend $100,000.00 on equipment this week', target: 100_000, rewardCash: 40_000.0, rewardCertificates: 60, type: 'SPEND_CASH', unit: '$' },
  { id: 'wm_spend_250k', title: 'Syndicate Machinery Fund', description: 'Spend $250,000.00 on equipment this week', target: 250_000, rewardCash: 95_000.0, rewardCertificates: 100, type: 'SPEND_CASH', unit: '$' },
  { id: 'wm_spend_500k', title: 'Mega-Mine Contractor', description: 'Spend $500,000.00 on equipment this week', target: 500_000, rewardCash: 150_000.0, rewardCertificates: 160, type: 'SPEND_CASH', unit: '$' },
  { id: 'wm_buy_50', title: 'Placer Rig Upgrades', description: 'Purchase 50 equipment upgrades this week', target: 50, rewardCash: 15_000.0, rewardCertificates: 35, type: 'BUY_UPGRADES', unit: 'upgrades' },
  { id: 'wm_buy_100', title: 'Factory Line Overhaul', description: 'Purchase 100 equipment upgrades this week', target: 100, rewardCash: 30_000.0, rewardCertificates: 50, type: 'BUY_UPGRADES', unit: 'upgrades' },
  { id: 'wm_buy_175', title: 'Industrial Automation Wave', description: 'Purchase 175 equipment upgrades this week', target: 175, rewardCash: 55_000.0, rewardCertificates: 75, type: 'BUY_UPGRADES', unit: 'upgrades' },
  { id: 'wm_buy_250', title: 'Continental Mechanization', description: 'Purchase 250 equipment upgrades this week', target: 250, rewardCash: 80_000.0, rewardCertificates: 110, type: 'BUY_UPGRADES', unit: 'upgrades' },
  { id: 'wm_taps_1000', title: 'Endurance Pan Prospecting', description: 'Manually scoop the gold pan 1,000 times this week', target: 1_000, rewardCash: 12_000.0, rewardCertificates: 30, type: 'MANUAL_CLICKS', unit: 'taps' },
  { id: 'wm_taps_2500', title: 'Legendary Panner', description: 'Manually scoop the gold pan 2,500 times this week', target: 2_500, rewardCash: 25_000.0, rewardCertificates: 55, type: 'MANUAL_CLICKS', unit: 'taps' },
  { id: 'wm_taps_5000', title: 'Klondike Iron Wrist', description: 'Manually scoop the gold pan 5,000 times this week', target: 5_000, rewardCash: 50_000.0, rewardCertificates: 90, type: 'MANUAL_CLICKS', unit: 'taps' },
  { id: 'wm_earn_50k', title: 'Industrial Aggregate King', description: 'Earn $50,000.00 from gravel sales this week', target: 50_000, rewardCash: 30_000.0, rewardCertificates: 60, type: 'EARN_CASH', unit: '$' },
  { id: 'wm_earn_100k', title: 'Railroad Ballast Supplier', description: 'Earn $100,000.00 from gravel sales this week', target: 100_000, rewardCash: 55_000.0, rewardCertificates: 80, type: 'EARN_CASH', unit: '$' },
  { id: 'wm_earn_250k', title: 'Trans-Continental Exporter', description: 'Earn $250,000.00 from gravel sales this week', target: 250_000, rewardCash: 100_000.0, rewardCertificates: 140, type: 'EARN_CASH', unit: '$' },
  { id: 'wm_rebirth_1', title: 'Bedrock Pioneer', description: 'Advance through at least 1 Claim Rebirth this week', target: 1, rewardCash: 35_000.0, rewardCertificates: 80, type: 'REBIRTH_TIERS', unit: 'rebirths' },
  { id: 'wm_rebirth_2', title: 'Veteran Claim Pioneer', description: 'Advance through 2 Claim Rebirths this week', target: 2, rewardCash: 70_000.0, rewardCertificates: 120, type: 'REBIRTH_TIERS', unit: 'rebirths' }
];

export function generateWeeklyMissions(): WeeklyMission[] {
  const shuffled = [...WEEKLY_MISSION_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 10).map((m) => ({
    ...m,
    currentProgress: 0,
    isClaimed: false
  }));
}

const NUGGET_ARCHETYPES = [
  { name: 'Welcome Stranger of Klondike', lore: 'A fabled solid hunk of native gold uncovered near bedrock.', bonus: 0.25 },
  { name: 'Eureka Crown Jewel', lore: 'Gleams with crystalline quartz inclusions and 24K pure gold veins.', bonus: 0.35 },
  { name: 'Sierra Nevada Boulder', lore: 'Heavy nugget polished by millennia of rushing mountain flumes.', bonus: 0.50 },
  { name: 'Bonanza Creek Heart', lore: 'The legend of Dawson City, dense enough to tip industrial scales.', bonus: 0.65 },
  { name: 'Yukon Colossus', lore: 'Mammoth geological wonder discovered in the deep river bench.', bonus: 0.85 },
  { name: 'El Dorado Solar Relic', lore: 'Radiates an amber glow with unyielding natural splendor.', bonus: 1.10 },
  { name: 'Midas Bedrock Core', lore: 'Pure crystalline gold relic thought to exist only in miner myths.', bonus: 1.50 }
];

function generateRandomNugget(tier: number): GoldenNugget {
  const archetype = NUGGET_ARCHETYPES[(tier - 1) % NUGGET_ARCHETYPES.length];
  const weight = 45.0 * tier * (0.85 + Math.random() * 0.35);
  const bonus = archetype.bonus * Math.pow(1.35, Math.max(0, tier - 1));
  const certs = Math.floor(weight / 2.0) + tier * 25;
  return {
    id: `nugget_t${tier}_${Date.now()}`,
    name: archetype.name,
    weightGrams: weight,
    multiplierBonus: bonus,
    claimTier: tier,
    lore: archetype.lore,
    discoveredAtDate: `Claim #${tier}`,
    certificatesAwarded: certs
  };
}

// Rebalanced Upgrade Trees with Inflation Cost Ratios (1.18 - 1.25)
const DEFAULT_TOOLS_UPGRADES: UpgradeItem[] = [
  {
    id: 'tool_sieve',
    name: 'Calibrated Sieve',
    description: 'Precision wire mesh capturing finer alluvial gold',
    branch: 'tools',
    baseCost: 0.50,
    powerIncrease: 1.0,
    costRatio: 1.22,
    level: 0,
    iconName: 'sieve',
    unitLabel: 'g/tap'
  },
  {
    id: 'tool_magnetic_pan',
    name: 'Magnetic Pan',
    description: 'Polarized rim captures black sands (+5% crit chance for 10x yield, up to 75% max)',
    branch: 'tools',
    baseCost: 5.00,
    powerIncrease: 5.0,
    costRatio: 1.24,
    level: 0,
    maxLevel: 15,
    iconName: 'pan',
    unitLabel: '% crit'
  },
  {
    id: 'tool_prospector_rhythm',
    name: 'Prospector Rhythm',
    description: 'Rhythmic swirling builds active tap combo meter up to 3.0x multiplier max',
    branch: 'tools',
    baseCost: 25.00,
    powerIncrease: 0.25,
    costRatio: 1.25,
    level: 0,
    maxLevel: 8,
    iconName: 'rhythm',
    unitLabel: 'combo cap'
  },
  {
    id: 'tool_diamond_pickaxe',
    name: 'Diamond-Tip Pickaxe',
    description: '+1% chance per level to instantly shatter 500g paydirt vein (up to 25% max)',
    branch: 'tools',
    baseCost: 150.00,
    powerIncrease: 1.0,
    costRatio: 1.27,
    level: 0,
    maxLevel: 25,
    iconName: 'pickaxe',
    unitLabel: 'shatter %'
  },
  {
    id: 'tool_pneumatic_drill',
    name: 'Pneumatic Rock Drill',
    description: 'Compressed-air steel drill fracturing cemented bedrock (+20 g/tap)',
    branch: 'tools',
    baseCost: 750.00,
    powerIncrease: 20.0,
    costRatio: 1.23,
    level: 0,
    iconName: 'drill',
    unitLabel: 'g/tap'
  }
];

const DEFAULT_MACHINERY_UPGRADES: UpgradeItem[] = [
  {
    id: 'mach_sluice_box',
    name: 'Sluice Box',
    description: 'Continuous gravity-fed wooden flume with riffles',
    branch: 'machinery',
    baseCost: 20.00,
    powerIncrease: 2.0,
    costRatio: 1.23,
    level: 0,
    maxLevel: 15,
    iconName: 'sluice',
    unitLabel: 'g/sec'
  },
  {
    id: 'mach_water_monitor',
    name: 'High-Pressure Water Monitor',
    description: 'Hydraulic wash giant blasting river gravel banks continuously',
    branch: 'machinery',
    baseCost: 120.00,
    powerIncrease: 18.0,
    costRatio: 1.24,
    level: 0,
    maxLevel: 15,
    iconName: 'pump',
    unitLabel: 'g/sec'
  },
  {
    id: 'mach_diesel_trommel',
    name: 'Diesel Trommel',
    description: 'Heavy rotating motorized cylinder sorting gravel sizes',
    branch: 'machinery',
    baseCost: 650.00,
    powerIncrease: 90.0,
    costRatio: 1.25,
    level: 0,
    maxLevel: 15,
    iconName: 'trommel',
    unitLabel: 'g/sec'
  },
  {
    id: 'mach_electric_dredge',
    name: 'Electric Dredge',
    description: 'Continuous suction line vacuuming riverbed placer deposits',
    branch: 'machinery',
    baseCost: 3500.00,
    powerIncrease: 500.0,
    costRatio: 1.26,
    level: 0,
    maxLevel: 15,
    iconName: 'dredge',
    unitLabel: 'g/sec'
  },
  {
    id: 'mach_bucket_wheel',
    name: 'Industrial Bucket-Wheel Excavator',
    description: 'Massive tracked excavator slicing continuous high-bench gravel banks',
    branch: 'machinery',
    baseCost: 25000.00,
    powerIncrease: 3000.0,
    costRatio: 1.25,
    level: 0,
    maxLevel: 15,
    iconName: 'excavator',
    unitLabel: 'g/sec'
  },
  {
    id: 'mach_cyclone_washplant',
    name: 'Heavy Placer Wash Plant',
    description: 'High-volume vibrating screens and hydrocyclones processing deep paydirt',
    branch: 'machinery',
    baseCost: 160000.00,
    powerIncrease: 18000.0,
    costRatio: 1.25,
    level: 0,
    maxLevel: 15,
    iconName: 'washplant',
    unitLabel: 'g/sec'
  },
  {
    id: 'mach_bearing_grease',
    name: 'Synergy Bearing Grease',
    description: '+1% Machinery output per 10 total tool levels purchased (up to +200% max)',
    branch: 'machinery',
    baseCost: 15000.00,
    powerIncrease: 1.0,
    costRatio: 1.28,
    level: 0,
    maxLevel: 15,
    iconName: 'grease',
    unitLabel: '% sync'
  }
];

const DEFAULT_MARKET_UPGRADES: UpgradeItem[] = [
  {
    id: 'market_gravel_crusher',
    name: 'Road Gravel Crusher',
    description: 'Permanently raises base gravel price by +$0.005/g per level',
    branch: 'market',
    baseCost: 50.00,
    powerIncrease: 0.005,
    costRatio: 1.28,
    level: 0,
    iconName: 'crusher',
    unitLabel: '$/g'
  },
  {
    id: 'market_gold_concentrator',
    name: 'Centrifugal Gold Concentrator',
    description: '+2%/s chance per level to find raw gold flakes with instant rewards (up to 50% max)',
    branch: 'market',
    baseCost: 300.00,
    powerIncrease: 2.0,
    costRatio: 1.26,
    level: 0,
    maxLevel: 25,
    iconName: 'concentrator',
    unitLabel: '%/sec'
  },
  {
    id: 'market_bulk_contract',
    name: 'Bulk Delivery Contract',
    description: 'Auto-sells sieved gravel every 30s with +25% bonus margin per level (up to +500% max)',
    branch: 'market',
    baseCost: 2000.00,
    powerIncrease: 25.0,
    costRatio: 1.28,
    level: 0,
    maxLevel: 20,
    iconName: 'contract',
    unitLabel: '% margin'
  }
];

const DEFAULT_GEOLOGY_UPGRADES: UpgradeItem[] = [
  {
    id: 'geo_probe',
    name: 'Geological Probe',
    description: 'Reveals nugget depth range on HUD with up to ±2% pinpoint precision (4 levels max)',
    branch: 'geology',
    baseCost: 100.00,
    powerIncrease: 1.0,
    costRatio: 1.34,
    level: 0,
    maxLevel: 4,
    iconName: 'probe',
    unitLabel: 'sensor'
  },
  {
    id: 'geo_pulse_detector',
    name: 'Pulse Metal Detector',
    description: 'Screen border begins glowing gold when remaining dirt is within 15% of the nugget (1 level max)',
    branch: 'geology',
    baseCost: 800.00,
    powerIncrease: 1.0,
    costRatio: 1.38,
    level: 0,
    maxLevel: 1,
    iconName: 'detector',
    unitLabel: 'beacon'
  },
  {
    id: 'geo_radar',
    name: 'Ground Penetrating Radar',
    description: 'Auto-strips 10% barren topsoil per level upon starting any new claim (up to 30% max)',
    branch: 'geology',
    baseCost: 5000.00,
    powerIncrease: 10.0,
    costRatio: 1.44,
    level: 0,
    maxLevel: 3,
    iconName: 'radar',
    unitLabel: '% topsoil'
  }
];

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'sift_1k', title: 'First Paydirt', description: 'Sift 1,000 grams of river gravel', target: 1000, rewardCash: 5.0, unit: 'g', isClaimed: false },
  { id: 'sift_50k', title: 'Seasoned Prospector', description: 'Sift 50,000 grams of gravel', target: 50000, rewardCash: 25.0, unit: 'g', isClaimed: false },
  { id: 'sift_1m', title: 'Klondike Legend', description: 'Sift 1,000,000 grams of dirt', target: 1000000, rewardCash: 150.0, unit: 'g', isClaimed: false },
  { id: 'cash_100', title: 'Gold In Pocket', description: 'Accumulate $100.00 total earnings', target: 100, rewardCash: 15.0, unit: '$', isClaimed: false },
  { id: 'cash_2500', title: 'Commercial Mine', description: 'Accumulate $2,500.00 total earnings', target: 2500, rewardCash: 100.0, unit: '$', isClaimed: false },
  { id: 'clicks_100', title: 'Blistered Hands', description: 'Manually scoop the pan 100 times', target: 100, rewardCash: 10.0, unit: 'taps', isClaimed: false },
  { id: 'nuggets_1', title: 'Strike It Rich!', description: 'Discover your first legendary nugget', target: 1, rewardCash: 50.0, unit: 'relics', isClaimed: false },
  { id: 'nuggets_3', title: 'Museum Curator', description: 'Collect 3 legendary nuggets in the museum', target: 3, rewardCash: 250.0, unit: 'relics', isClaimed: false },
];

function getInitialGameState(ignoreStorage: boolean = false): GameState {
  const initialCapacity = 500_000.0;
  const hiddenAt = generateNuggetDepth(initialCapacity);

  if (!ignoreStorage) {
    try {
      const saved = localStorage.getItem('gold_rush_state_v6');
      if (saved) {
        const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.cash === 'number' && parsed.toolsUpgrades) {
        const claimTier = parsed.claimTier || 1;
        const currentTierInfo = getClaimTierInfo(claimTier);
        let maxDirtCapacity = parsed.maxDirtCapacity || currentTierInfo.capacityGrams;
        let remainingDirtGrams = parsed.remainingDirtGrams ?? currentTierInfo.capacityGrams;
        let nuggetHiddenAtGrams = parsed.nuggetHiddenAtGrams ?? generateNuggetDepth(maxDirtCapacity);

        if (maxDirtCapacity !== currentTierInfo.capacityGrams) {
          const ratio = currentTierInfo.capacityGrams / maxDirtCapacity;
          maxDirtCapacity = currentTierInfo.capacityGrams;
          remainingDirtGrams = Math.min(maxDirtCapacity, Math.max(0, Math.round(remainingDirtGrams * ratio)));
          nuggetHiddenAtGrams = Math.round(nuggetHiddenAtGrams * ratio);
        }

        return {
          ...parsed,
          maxDirtCapacity,
          remainingDirtGrams,
          nuggetHiddenAtGrams,
          tutorialStep: parsed.tutorialStep ?? 0,
          tutorialCompleted: (parsed.claimTier || 1) > 1 ? true : (parsed.tutorialCompleted ?? false),
          tutorialDismissed: parsed.tutorialDismissed ?? false,
          prestigeTokens: parsed.prestigeTokens ?? 0,
          prestigePerks: parsed.prestigePerks || DEFAULT_PRESTIGE_PERKS,
          weatherEnabled: parsed.weatherEnabled ?? true,
          currentWeather: parsed.currentWeather ?? WEATHER_POOL[0],
          weatherSecondsRemaining: parsed.weatherSecondsRemaining ?? 50,
          dailyMissions: parsed.dailyMissions?.length >= 5 ? parsed.dailyMissions : generateDailyMissions(),
          todayDirtSifted: parsed.todayDirtSifted ?? 0,
          todayCashSpent: parsed.todayCashSpent ?? 0,
          todayUpgradesBought: parsed.todayUpgradesBought ?? 0,
          todayManualClicks: parsed.todayManualClicks ?? 0,
          todayCashEarned: parsed.todayCashEarned ?? 0,
          lastDailyResetTimestamp: parsed.lastDailyResetTimestamp ?? Date.now(),
          weeklyMissions: parsed.weeklyMissions?.length >= 10 ? parsed.weeklyMissions : generateWeeklyMissions(),
          weekDirtSifted: parsed.weekDirtSifted ?? 0,
          weekCashSpent: parsed.weekCashSpent ?? 0,
          weekUpgradesBought: parsed.weekUpgradesBought ?? 0,
          weekManualClicks: parsed.weekManualClicks ?? 0,
          weekCashEarned: parsed.weekCashEarned ?? 0,
          weekNuggetsFound: parsed.weekNuggetsFound ?? 0,
          lastWeeklyResetTimestamp: parsed.lastWeeklyResetTimestamp ?? Date.now(),
          comboMultiplier: parsed.comboMultiplier ?? 1.0,
          lastTapTimestamp: parsed.lastTapTimestamp ?? 0,
          bulkDeliverySecondsRemaining: parsed.bulkDeliverySecondsRemaining ?? 30,
          buyMode: parsed.buyMode ?? 'x1',
          claimedMilestones: parsed.claimedMilestones ?? {},
          milestoneBaselines: parsed.milestoneBaselines ?? syncMilestoneBaselines({ ...parsed, claimTier }, claimTier),
          totalCashSpent: parsed.totalCashSpent ?? 0,
          totalUpgradesBought: parsed.totalUpgradesBought ?? 0,
          totalCrits: parsed.totalCrits ?? 0,
          totalShatters: parsed.totalShatters ?? 0,
          totalFlakesFound: parsed.totalFlakesFound ?? 0,
          totalBulkDeliveries: parsed.totalBulkDeliveries ?? 0,
          totalWeatherCycles: parsed.totalWeatherCycles ?? 0,
          highestHardnessBeaten: parsed.highestHardnessBeaten ?? 1.0,
          maxComboReached: parsed.maxComboReached ?? 1.0,
          totalRebirths: parsed.totalRebirths ?? 0,
          totalMissionsClaimed: parsed.totalMissionsClaimed ?? 0,
          toolsUpgrades: DEFAULT_TOOLS_UPGRADES.map((def) => {
            const s = parsed.toolsUpgrades?.find((u: UpgradeItem) => u.id === def.id);
            return s ? { ...def, level: def.maxLevel !== undefined ? Math.min(s.level, def.maxLevel) : s.level } : def;
          }),
          machineryUpgrades: DEFAULT_MACHINERY_UPGRADES.map((def) => {
            const s = parsed.machineryUpgrades?.find((u: UpgradeItem) => u.id === def.id);
            const mMax = getMachineryMaxLevel(parsed.claimTier ?? 1);
            return s ? { ...def, maxLevel: mMax, level: Math.min(s.level, mMax) } : { ...def, maxLevel: mMax };
          }),
          marketUpgrades: DEFAULT_MARKET_UPGRADES.map((def) => {
            const s = parsed.marketUpgrades?.find((u: UpgradeItem) => u.id === def.id);
            return s ? { ...def, level: def.maxLevel !== undefined ? Math.min(s.level, def.maxLevel) : s.level } : def;
          }),
          geologyUpgrades: DEFAULT_GEOLOGY_UPGRADES.map((def) => {
            const s = parsed.geologyUpgrades?.find((u: UpgradeItem) => u.id === def.id);
            return s ? { ...def, level: def.maxLevel !== undefined ? Math.min(s.level, def.maxLevel) : s.level } : def;
          }),
        };
      }
    }
  } catch {}
}

  return {
    cash: 0.0,
    remainingDirtGrams: initialCapacity,
    maxDirtCapacity: initialCapacity,
    claimTier: 1,
    basePricePerGram: DEFAULT_BASE_GRAVEL_PRICE,
    nuggetHiddenAtGrams: hiddenAt,
    currentHiddenNugget: generateRandomNugget(1),
    discoveredNuggets: [],
    prestigeTokens: 0,
    prestigePerks: DEFAULT_PRESTIGE_PERKS,
    toolsUpgrades: DEFAULT_TOOLS_UPGRADES,
    machineryUpgrades: DEFAULT_MACHINERY_UPGRADES,
    marketUpgrades: DEFAULT_MARKET_UPGRADES,
    geologyUpgrades: DEFAULT_GEOLOGY_UPGRADES,
    achievements: DEFAULT_ACHIEVEMENTS,
    claimedMilestones: {},
    milestoneBaselines: {},
    totalDirtSifted: 0.0,
    totalCashEarned: 0.0,
    totalCashSpent: 0.0,
    totalUpgradesBought: 0,
    totalManualClicks: 0,
    totalCrits: 0,
    totalShatters: 0,
    totalFlakesFound: 0,
    totalBulkDeliveries: 0,
    totalWeatherCycles: 0,
    highestHardnessBeaten: 1.0,
    maxComboReached: 1.0,
    totalRebirths: 0,
    totalMissionsClaimed: 0,
    pendingNuggetDiscovery: null,
    weatherEnabled: true,
    currentWeather: WEATHER_POOL[0],
    weatherSecondsRemaining: 50,
    dailyMissions: generateDailyMissions(),
    lastDailyResetTimestamp: Date.now(),
    todayDirtSifted: 0,
    todayCashSpent: 0,
    todayUpgradesBought: 0,
    todayManualClicks: 0,
    todayCashEarned: 0,
    weeklyMissions: generateWeeklyMissions(),
    lastWeeklyResetTimestamp: Date.now(),
    weekDirtSifted: 0,
    weekCashSpent: 0,
    weekUpgradesBought: 0,
    weekManualClicks: 0,
    weekCashEarned: 0,
    weekNuggetsFound: 0,
    comboMultiplier: 1.0,
    lastTapTimestamp: 0,
    bulkDeliverySecondsRemaining: 30,
    buyMode: 'x1',
    tutorialStep: 0,
    tutorialCompleted: false,
    tutorialDismissed: false
  };
}



export default function App() {
  const { language, setLanguage, t, supportedLanguages } = useI18n();
  const [gameState, setGameState] = useState<GameState>(getInitialGameState);
  const [currentScreen, setCurrentScreen] = useState<'mining' | 'upgrades' | 'missions' | 'museum' | 'settings'>('mining');
  const [upgradeBranchTab, setUpgradeBranchTab] = useState<UpgradeBranch>('tools');
  const [missionTab, setMissionTab] = useState<'daily' | 'weekly' | 'milestones'>('daily');
  const [milestoneCategory, setMilestoneCategory] = useState<AchievementCategory>('PROGRESS');
  const [museumSubTab, setMuseumSubTab] = useState<'relics' | 'techTree'>('relics');
  const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);
  const [isPressingPan, setIsPressingPan] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.muted);
  const [showKotlinModal, setShowKotlinModal] = useState(false);
  const [deviceFrameMode, setDeviceFrameMode] = useState(true);
  const [confirmResetting, setConfirmResetting] = useState(false);
  const [isTutorialMinimized, setIsTutorialMinimized] = useState(false);

  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  useEffect(() => {
    try {
      localStorage.setItem('gold_rush_state_v6', JSON.stringify(gameState));
    } catch {}
  }, [gameState]);

  const claimInfo = useMemo(() => getClaimTierInfo(gameState.claimTier), [gameState.claimTier]);
  const localizedClaimName = useMemo(() => getClaimName(language, claimInfo.tier, claimInfo.name), [language, claimInfo]);

  const nextTierInfo = useMemo(() => getClaimTierInfo(gameState.claimTier + 1), [gameState.claimTier]);
  const localizedNextClaimName = useMemo(() => getClaimName(language, nextTierInfo.tier, nextTierInfo.name), [language, nextTierInfo]);

  // Auto-sync active state if capacity differs from tier definition
  useEffect(() => {
    if (gameState.maxDirtCapacity !== claimInfo.capacityGrams) {
      setGameState((prev) => {
        const ratio = claimInfo.capacityGrams / prev.maxDirtCapacity;
        return {
          ...prev,
          maxDirtCapacity: claimInfo.capacityGrams,
          remainingDirtGrams: Math.min(claimInfo.capacityGrams, Math.max(0, Math.round(prev.remainingDirtGrams * ratio))),
          nuggetHiddenAtGrams: Math.round(prev.nuggetHiddenAtGrams * ratio)
        };
      });
    }
  }, [claimInfo.capacityGrams, gameState.maxDirtCapacity]);

  // Permanent Tech Tree Bonuses (Supports disabling for balance testing)
  const hardnessReductionBonus = useMemo(() => {
    const perk = gameState.prestigePerks.find((p) => p.id === 'perk_diamond_chisels');
    if (!perk || perk.disabled) return 0;
    return (perk.level || 0) * 0.10;
  }, [gameState.prestigePerks]);

  const effectiveHardness = useMemo(() => {
    return Math.max(0.25, claimInfo.baseHardness * (1.0 - hardnessReductionBonus));
  }, [claimInfo.baseHardness, hardnessReductionBonus]);

  const permanentPriceMult = useMemo(() => {
    const perk = gameState.prestigePerks.find((p) => p.id === 'perk_assayer_grade');
    if (!perk || perk.disabled) return 1.0;
    return 1.0 + (perk.level || 0) * 0.25;
  }, [gameState.prestigePerks]);

  const masterProspectorMult = useMemo(() => {
    const perk = gameState.prestigePerks.find((p) => p.id === 'perk_master_prospector');
    if (!perk || perk.disabled) return 1.0;
    return 1.0 + (perk.level || 0) * 0.20;
  }, [gameState.prestigePerks]);

  const startingCashBonus = useMemo(() => {
    const perk = gameState.prestigePerks.find((p) => p.id === 'perk_grubstake');
    if (!perk || perk.disabled) return 0;
    return (perk.level || 0) * 50.0;
  }, [gameState.prestigePerks]);

  const steamShovelStripPct = useMemo(() => {
    const perk = gameState.prestigePerks.find((p) => p.id === 'perk_overburden_strip');
    if (!perk || perk.disabled) return 0;
    return (perk.level || 0) * 0.05;
  }, [gameState.prestigePerks]);

  const totalToolLevels = useMemo(() => {
    return gameState.toolsUpgrades.reduce((acc, u) => acc + u.level, 0);
  }, [gameState.toolsUpgrades]);

  const relicMultiplier = useMemo(() => {
    const sum = gameState.discoveredNuggets.reduce((acc, n) => acc + n.multiplierBonus, 0);
    return 1.0 + sum;
  }, [gameState.discoveredNuggets]);

  // Global Meta Multiplier from completed Tier Milestones (+0.3% per claimed milestone)
  const totalMilestonesClaimedCount = useMemo(() => {
    return getClaimedMilestonesCount(gameState.claimedMilestones);
  }, [gameState.claimedMilestones]);

  const achievementMetaMult = useMemo(() => {
    return getAchievementMetaMultiplier(gameState.claimedMilestones);
  }, [gameState.claimedMilestones]);

  const weatherManualMult = gameState.weatherEnabled ? gameState.currentWeather.manualMultiplier : 1.0;
  const weatherMachineryMult = gameState.weatherEnabled ? gameState.currentWeather.machineryMultiplier : 1.0;
  const weatherPriceMult = gameState.weatherEnabled ? gameState.currentWeather.gravelPriceMultiplier : 1.0;

  const gravelCrusherBonus = useMemo(() => {
    const crusher = gameState.marketUpgrades.find((u) => u.id === 'market_gravel_crusher');
    if (!crusher || crusher.level <= 0) return 0;
    return crusher.level * crusher.powerIncrease * getMilestoneMultiplier(crusher.level);
  }, [gameState.marketUpgrades]);

  const tierRichnessMultiplier = useMemo(() => {
    return getTierRichnessMultiplier(gameState.claimTier);
  }, [gameState.claimTier]);

  const starterPriceBonus = gameState.claimTier === 1 ? 0.01 : 0.0;
  const effectivePricePerGram = (gameState.basePricePerGram + starterPriceBonus + gravelCrusherBonus) * weatherPriceMult * permanentPriceMult * tierRichnessMultiplier;

  const synergyBearingMultiplier = useMemo(() => {
    const grease = gameState.machineryUpgrades.find((u) => u.id === 'mach_bearing_grease');
    if (!grease || grease.level <= 0) return 1.0;
    const setsOf10 = Math.floor(totalToolLevels / 10);
    // +1% per 10 tool levels per grease level, capped at +200% (max 3.0x multiplier)
    const bonus = Math.min(2.0, grease.level * setsOf10 * 0.01 * getMilestoneMultiplier(grease.level));
    return 1.0 + bonus;
  }, [gameState.machineryUpgrades, totalToolLevels]);

  // Raw click power
  const rawClickPower = useMemo(() => {
    const sieve = gameState.toolsUpgrades.find((u) => u.id === 'tool_sieve');
    const sieveOutput = sieve ? sieve.level * sieve.powerIncrease * getMilestoneMultiplier(sieve.level) : 0;
    const drill = gameState.toolsUpgrades.find((u) => u.id === 'tool_pneumatic_drill');
    const drillOutput = drill ? drill.level * drill.powerIncrease * getMilestoneMultiplier(drill.level) : 0;
    const starterMine1Bonus = gameState.claimTier === 1 ? 4.0 : 0.0;
    const starterSpeedMult = gameState.claimTier === 1 ? 2.0 : 1.0;
    const baseManual = (1.0 + starterMine1Bonus + sieveOutput + drillOutput) * starterSpeedMult;
    return baseManual * relicMultiplier * weatherManualMult * gameState.comboMultiplier * masterProspectorMult * achievementMetaMult;
  }, [gameState.toolsUpgrades, gameState.claimTier, relicMultiplier, weatherManualMult, gameState.comboMultiplier, masterProspectorMult, achievementMetaMult]);

  // Effective click power divided by claim hardness
  const effectiveClickPower = useMemo(() => {
    return Math.max(0.1, rawClickPower / effectiveHardness);
  }, [rawClickPower, effectiveHardness]);

  // Raw auto rate
  const rawAutoRate = useMemo(() => {
    const baseAuto = gameState.machineryUpgrades
      .filter((u) => u.id !== 'mach_bearing_grease')
      .reduce((acc, u) => acc + u.level * u.powerIncrease * getMilestoneMultiplier(u.level), 0);
    const starterAutoMult = gameState.claimTier === 1 ? 2.0 : 1.0;
    return baseAuto * relicMultiplier * weatherMachineryMult * synergyBearingMultiplier * masterProspectorMult * achievementMetaMult * starterAutoMult;
  }, [gameState.machineryUpgrades, gameState.claimTier, relicMultiplier, weatherMachineryMult, synergyBearingMultiplier, masterProspectorMult, achievementMetaMult]);

  // Wear-and-tear damping & divided by hardness
  const wearMultiplier = useMemo(() => {
    return Math.max(0.80, 1.0 / (1.0 + Math.pow(rawAutoRate / 300000.0, 0.35)));
  }, [rawAutoRate]);

  const autoRatePerSec = useMemo(() => {
    return Math.max(0, (rawAutoRate * wearMultiplier) / effectiveHardness);
  }, [rawAutoRate, wearMultiplier, effectiveHardness]);

  const progressFraction = Math.max(
    0,
    Math.min(1, (gameState.maxDirtCapacity - gameState.remainingDirtGrams) / gameState.maxDirtCapacity)
  );

  const isDetectorActive = useMemo(() => {
    const detector = gameState.geologyUpgrades.find((u) => u.id === 'geo_pulse_detector');
    if (!detector || detector.level <= 0) return false;
    const distance = Math.abs(gameState.remainingDirtGrams - gameState.nuggetHiddenAtGrams);
    return distance <= gameState.maxDirtCapacity * 0.15;
  }, [gameState.geologyUpgrades, gameState.remainingDirtGrams, gameState.nuggetHiddenAtGrams, gameState.maxDirtCapacity]);

  const probeDepthRange = useMemo(() => {
    const probe = gameState.geologyUpgrades.find((u) => u.id === 'geo_probe');
    if (!probe || probe.level <= 0) return null;
    const factor = probe.level === 1 ? 0.15 : probe.level === 2 ? 0.10 : probe.level === 3 ? 0.05 : 0.02;
    const minD = Math.max(0, gameState.nuggetHiddenAtGrams * (1.0 - factor));
    const maxD = Math.min(gameState.maxDirtCapacity, gameState.nuggetHiddenAtGrams * (1.0 + factor));
    return { minD, maxD };
  }, [gameState.geologyUpgrades, gameState.nuggetHiddenAtGrams, gameState.maxDirtCapacity]);

  const currentMachineryMaxLevel = useMemo(() => {
    return getMachineryMaxLevel(gameState.claimTier);
  }, [gameState.claimTier]);

  const effectiveMachineryUpgrades = useMemo(() => {
    return gameState.machineryUpgrades.map((u) => ({
      ...u,
      maxLevel: currentMachineryMaxLevel
    }));
  }, [gameState.machineryUpgrades, currentMachineryMaxLevel]);

  const allUpgrades = useMemo(() => {
    return [
      ...gameState.toolsUpgrades,
      ...effectiveMachineryUpgrades,
      ...gameState.marketUpgrades,
      ...gameState.geologyUpgrades
    ];
  }, [gameState.toolsUpgrades, effectiveMachineryUpgrades, gameState.marketUpgrades, gameState.geologyUpgrades]);

  const affordableUpgrades = useMemo(() => {
    return allUpgrades.filter(
      (u) => (u.maxLevel === undefined || u.level < u.maxLevel) && gameState.cash >= u.baseCost * Math.pow(u.costRatio, u.level)
    );
  }, [allUpgrades, gameState.cash]);

  const affordableCount = affordableUpgrades.length;

  const claimableDailyCount = useMemo(() => {
    return gameState.dailyMissions.filter((m) => {
      if (m.isClaimed) return false;
      const progress = getDailyMissionProgress(m, gameState);
      return progress >= m.target;
    }).length;
  }, [gameState]);

  const claimableWeeklyCount = useMemo(() => {
    return gameState.weeklyMissions.filter((m) => {
      if (m.isClaimed) return false;
      const progress = getWeeklyMissionProgress(m, gameState);
      return progress >= m.target;
    }).length;
  }, [gameState]);

  const claimableMilestonesCount = useMemo(() => {
    if (gameState.claimTier < 2) return 0;
    const maxTier = getMaxUnlockedAchievementTier(gameState.claimTier);
    let count = 0;
    for (const chain of ACHIEVEMENT_CHAINS) {
      if (!isAchievementCategoryUnlocked(chain.category, gameState.claimTier)) continue;
      const claimedLevel = gameState.claimedMilestones?.[chain.id] || 0;
      if (claimedLevel < chain.tiers.length) {
        const nextTier = chain.tiers[claimedLevel];
        if (nextTier.tierLevel <= maxTier) {
          const curVal = getChainCurrentProgress(chain, nextTier, gameState);
          if (curVal >= nextTier.threshold) {
            count++;
          }
        }
      }
    }
    return count;
  }, [gameState]);

  const claimableMilestonesByCategory = useMemo(() => {
    const map: Record<AchievementCategory, number> = {
      PROGRESS: 0,
      UPGRADES: 0,
      MASTERY: 0,
      MUSEUM: 0,
      SECRETS: 0
    };
    if (gameState.claimTier < 2) return map;
    const maxTier = getMaxUnlockedAchievementTier(gameState.claimTier);
    for (const chain of ACHIEVEMENT_CHAINS) {
      if (!isAchievementCategoryUnlocked(chain.category, gameState.claimTier)) continue;
      const claimedLevel = gameState.claimedMilestones?.[chain.id] || 0;
      if (claimedLevel < chain.tiers.length) {
        const nextTier = chain.tiers[claimedLevel];
        if (nextTier.tierLevel <= maxTier) {
          const curVal = getChainCurrentProgress(chain, nextTier, gameState);
          if (curVal >= nextTier.threshold) {
            map[chain.category] = (map[chain.category] || 0) + 1;
          }
        }
      }
    }
    return map;
  }, [gameState]);

  const claimableMissionsCount = claimableDailyCount + claimableWeeklyCount + claimableMilestonesCount;

  function getDailyMissionProgress(mission: DailyMission, state: GameState): number {
    switch (mission.type) {
      case 'SIFT_DIRT':
        return state.todayDirtSifted;
      case 'SPEND_CASH':
        return state.todayCashSpent;
      case 'BUY_UPGRADES':
        return state.todayUpgradesBought;
      case 'MANUAL_CLICKS':
        return state.todayManualClicks;
      case 'EARN_CASH':
        return state.todayCashEarned;
      default:
        return 0;
    }
  }

  function getWeeklyMissionProgress(mission: WeeklyMission, state: GameState): number {
    switch (mission.type) {
      case 'SIFT_DIRT':
        return state.weekDirtSifted;
      case 'SPEND_CASH':
        return state.weekCashSpent;
      case 'BUY_UPGRADES':
        return state.weekUpgradesBought;
      case 'MANUAL_CLICKS':
        return state.weekManualClicks;
      case 'EARN_CASH':
        return state.weekCashEarned;
      case 'REBIRTH_TIERS':
        return state.weekNuggetsFound;
      default:
        return 0;
    }
  }

  function getAchievementProgress(ach: Achievement, state: GameState): number {
    switch (ach.id) {
      case 'sift_1k':
      case 'sift_50k':
      case 'sift_1m':
        return state.totalDirtSifted;
      case 'cash_100':
      case 'cash_2500':
        return state.totalCashEarned;
      case 'clicks_100':
        return state.totalManualClicks;
      case 'nuggets_1':
      case 'nuggets_3':
        return state.discoveredNuggets.length;
      default:
        return 0;
    }
  }

  // Tutorial progression callback
  const advanceTutorial = useCallback((stepIndex: number) => {
    setGameState((prev) => {
      if (prev.tutorialCompleted || prev.tutorialStep !== stepIndex) return prev;
      const stepCfg = TUTORIAL_STEPS[stepIndex];
      if (!stepCfg) return prev;

      sound.playChime();
      const nextStep = stepIndex + 1;
      const isDone = nextStep >= TUTORIAL_STEPS.length;

      setFloatingParticles((fp) => [
        ...fp,
        {
          id: Date.now(),
          text: `+$${stepCfg.rewardCash} 🎓`,
          subText: 'Tutorial Reward!',
          x: typeof window !== 'undefined' ? window.innerWidth / 2 : 200,
          y: typeof window !== 'undefined' ? window.innerHeight * 0.35 : 300,
          createdAt: Date.now(),
          isFlake: true
        }
      ]);

      return {
        ...prev,
        cash: prev.cash + stepCfg.rewardCash,
        totalCashEarned: prev.totalCashEarned + stepCfg.rewardCash,
        tutorialStep: nextStep,
        tutorialCompleted: isDone
      };
    });
  }, []);

  // Tutorial reactive auto-progression
  useEffect(() => {
    if (gameState.claimTier > 1 || gameState.tutorialCompleted || gameState.tutorialDismissed) return;
    const currentStep = gameState.tutorialStep;
    if (currentStep < TUTORIAL_STEPS.length && isTutorialStepCompleted(currentStep, gameState)) {
      advanceTutorial(currentStep);
    }
  }, [
    gameState.claimTier,
    gameState.tutorialCompleted,
    gameState.tutorialDismissed,
    gameState.tutorialStep,
    gameState.totalManualClicks,
    gameState.toolsUpgrades,
    gameState.machineryUpgrades,
    gameState.comboMultiplier,
    gameState.remainingDirtGrams,
    gameState.maxDirtCapacity,
    gameState.pendingNuggetDiscovery,
    gameState.discoveredNuggets,
    advanceTutorial
  ]);

  // 1-second interval loop
  useEffect(() => {
    const timer = setInterval(() => {
      setGameState((prev) => {
        const now = Date.now();
        let newCombo = prev.comboMultiplier;
        if (now - prev.lastTapTimestamp > 2000 && newCombo > 1.0) {
          newCombo = Math.max(1.0, newCombo - 0.25);
        }

        // 24-hour Daily Missions auto-reset check
        const oneDayMs = 24 * 60 * 60 * 1000;
        const shouldResetDaily = now - prev.lastDailyResetTimestamp >= oneDayMs;
        const newDailyMissions = shouldResetDaily ? generateDailyMissions() : prev.dailyMissions;
        const newDailyResetTs = shouldResetDaily ? now : prev.lastDailyResetTimestamp;
        const dailyDirt = shouldResetDaily ? 0 : prev.todayDirtSifted;
        const dailyCashSpent = shouldResetDaily ? 0 : prev.todayCashSpent;
        const dailyUpgrades = shouldResetDaily ? 0 : prev.todayUpgradesBought;
        const dailyClicks = shouldResetDaily ? 0 : prev.todayManualClicks;
        const dailyEarned = shouldResetDaily ? 0 : prev.todayCashEarned;

        // 7-day Weekly Missions auto-reset check
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const shouldResetWeekly = now - prev.lastWeeklyResetTimestamp >= sevenDaysMs;
        const newWeeklyMissions = shouldResetWeekly ? generateWeeklyMissions() : prev.weeklyMissions;
        const newWeeklyResetTs = shouldResetWeekly ? now : prev.lastWeeklyResetTimestamp;
        const weeklyDirt = shouldResetWeekly ? 0 : prev.weekDirtSifted;
        const weeklyCashSpent = shouldResetWeekly ? 0 : prev.weekCashSpent;
        const weeklyUpgrades = shouldResetWeekly ? 0 : prev.weekUpgradesBought;
        const weeklyClicks = shouldResetWeekly ? 0 : prev.weekManualClicks;
        const weeklyEarned = shouldResetWeekly ? 0 : prev.weekCashEarned;
        const weeklyNuggets = shouldResetWeekly ? 0 : prev.weekNuggetsFound;

        let nextWeather = prev.currentWeather;
        let nextSeconds = prev.weatherSecondsRemaining;
        let weatherCycleIncrement = 0;
        if (prev.weatherEnabled) {
          nextSeconds -= 1;
          if (nextSeconds <= 0) {
            const pool = WEATHER_POOL.filter((w) => w.type !== prev.currentWeather.type);
            nextWeather = pool[Math.floor(Math.random() * pool.length)];
            nextSeconds = nextWeather.durationSeconds;
            weatherCycleIncrement = 1;
          }
        }

        let extraCash = 0;
        let flakeIncrement = 0;
        const tierRichness = getTierRichnessMultiplier(prev.claimTier);
        const concentrator = prev.marketUpgrades.find((u) => u.id === 'market_gold_concentrator');
        if (concentrator && concentrator.level > 0) {
          const chance = Math.min(50.0, concentrator.level * concentrator.powerIncrease);
          if (Math.random() * 100 < chance) {
            const flakeDrop = (15 + Math.random() * 85) * prev.claimTier * tierRichness;
            extraCash += flakeDrop;
            flakeIncrement = 1;
            sound.playChime();
            setFloatingParticles((p) => [
              ...p,
              {
                id: Date.now() + Math.random(),
                text: '✨ GOLD FLAKE FOUND!',
                subText: `+${formatCash(flakeDrop)}`,
                x: 150 + Math.random() * 60,
                y: 120,
                createdAt: Date.now(),
                isFlake: true
              }
            ]);
          }
        }

        let bulkTimer = prev.bulkDeliverySecondsRemaining - 1;
        let bulkIncrement = 0;
        const contract = prev.marketUpgrades.find((u) => u.id === 'market_bulk_contract');
        if (contract && contract.level > 0 && bulkTimer <= 0) {
          bulkTimer = 30;
          bulkIncrement = 1;
          const margin = contract.level * 25.0 * getMilestoneMultiplier(contract.level);
          const payout = Math.max(
            35 * prev.claimTier * tierRichness,
            autoRatePerSec * 15 * effectivePricePerGram * (1 + margin / 100)
          );
          extraCash += payout;
          sound.playChime();
          setFloatingParticles((p) => [
            ...p,
            {
              id: Date.now() + Math.random(),
              text: '🚚 BULK DELIVERY SHIPPED!',
              subText: `+${formatCash(payout)} (+${margin.toFixed(0)}%)`,
              x: 140,
              y: 80,
              createdAt: Date.now(),
              isFlake: true
            }
          ]);
        }

        return {
          ...prev,
          cash: prev.cash + extraCash,
          totalCashEarned: prev.totalCashEarned + extraCash,
          totalFlakesFound: prev.totalFlakesFound + flakeIncrement,
          totalBulkDeliveries: prev.totalBulkDeliveries + bulkIncrement,
          totalWeatherCycles: prev.totalWeatherCycles + weatherCycleIncrement,
          todayCashEarned: dailyEarned + extraCash,
          todayDirtSifted: dailyDirt,
          todayCashSpent: dailyCashSpent,
          todayUpgradesBought: dailyUpgrades,
          todayManualClicks: dailyClicks,
          lastDailyResetTimestamp: newDailyResetTs,
          dailyMissions: newDailyMissions,
          weekCashEarned: weeklyEarned + extraCash,
          weekDirtSifted: weeklyDirt,
          weekCashSpent: weeklyCashSpent,
          weekUpgradesBought: weeklyUpgrades,
          weekManualClicks: weeklyClicks,
          weekNuggetsFound: weeklyNuggets,
          lastWeeklyResetTimestamp: newWeeklyResetTs,
          weeklyMissions: newWeeklyMissions,
          comboMultiplier: newCombo,
          currentWeather: nextWeather,
          weatherSecondsRemaining: nextSeconds,
          bulkDeliverySecondsRemaining: bulkTimer <= 0 ? 30 : bulkTimer
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRatePerSec, effectivePricePerGram]);

  // Idle machinery loop
  useEffect(() => {
    const loopInterval = 100;
    const interval = setInterval(() => {
      const current = stateRef.current;
      if (current.remainingDirtGrams <= 0 || autoRatePerSec <= 0) return;

      const dtSeconds = loopInterval / 1000.0;
      const desiredSift = autoRatePerSec * dtSeconds;
      const actualSift = Math.min(desiredSift, current.remainingDirtGrams);
      const cashEarned = actualSift * effectivePricePerGram;
      const newRemaining = Math.max(0, current.remainingDirtGrams - actualSift);

      let pendingNugget: GoldenNugget | null = current.pendingNuggetDiscovery;
      if (!pendingNugget && newRemaining <= current.nuggetHiddenAtGrams) {
        pendingNugget = current.currentHiddenNugget;
        sound.playNuggetFound();
      }

      setGameState((prev) => ({
        ...prev,
        cash: prev.cash + cashEarned,
        remainingDirtGrams: newRemaining,
        totalDirtSifted: prev.totalDirtSifted + actualSift,
        totalCashEarned: prev.totalCashEarned + cashEarned,
        todayDirtSifted: prev.todayDirtSifted + actualSift,
        todayCashEarned: prev.todayCashEarned + cashEarned,
        weekDirtSifted: prev.weekDirtSifted + actualSift,
        weekCashEarned: prev.weekCashEarned + cashEarned,
        pendingNuggetDiscovery: pendingNugget
      }));
    }, loopInterval);

    return () => clearInterval(interval);
  }, [autoRatePerSec, effectivePricePerGram]);

  // Clean up floating particles
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setFloatingParticles((prev) => prev.filter((p) => now - p.createdAt < 1200));
    }, 300);
    return () => clearInterval(timer);
  }, []);

  // Manual sifting tap handler
  const handleManualSift = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      const current = stateRef.current;
      if (current.remainingDirtGrams <= 0) return;

      sound.playScoop();

      const rect = e.currentTarget.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const rhythm = current.toolsUpgrades.find((u) => u.id === 'tool_prospector_rhythm');
      let newCombo = current.comboMultiplier;
      if (rhythm && rhythm.level > 0) {
        const maxCombo = Math.min(3.0, 1.0 + rhythm.level * rhythm.powerIncrease);
        newCombo = Math.min(maxCombo, current.comboMultiplier + 0.15);
      } else if (current.claimTier === 1) {
        // Mine 1 training combo: lets new players experience the combo rhythm mechanic up to 1.5x!
        newCombo = Math.min(1.5, current.comboMultiplier + 0.10);
      }

      const magPan = current.toolsUpgrades.find((u) => u.id === 'tool_magnetic_pan');
      let isCrit = false;
      let tapMult = 1.0;
      if (magPan && magPan.level > 0) {
        const critChance = Math.min(75.0, magPan.level * magPan.powerIncrease);
        if (Math.random() * 100 < critChance) {
          isCrit = true;
          tapMult = 10.0;
          sound.playChime();
        }
      }

      const pickaxe = current.toolsUpgrades.find((u) => u.id === 'tool_diamond_pickaxe');
      let isShatter = false;
      let shatterGrams = 0;
      if (pickaxe && pickaxe.level > 0) {
        const shatterChance = Math.min(25.0, pickaxe.level * pickaxe.powerIncrease);
        if (Math.random() * 100 < shatterChance) {
          isShatter = true;
          shatterGrams = (500 * getMilestoneMultiplier(pickaxe.level)) / effectiveHardness;
          sound.playChime();
        }
      }

      const rawSift = (effectiveClickPower * tapMult) + shatterGrams;
      const actualSift = Math.min(rawSift, current.remainingDirtGrams);
      const cashEarned = actualSift * effectivePricePerGram;
      const newRemaining = Math.max(0, current.remainingDirtGrams - actualSift);

      let pendingNugget: GoldenNugget | null = current.pendingNuggetDiscovery;
      if (!pendingNugget && newRemaining <= current.nuggetHiddenAtGrams) {
        pendingNugget = current.currentHiddenNugget;
        sound.playNuggetFound();
      }

      setGameState((prev) => ({
        ...prev,
        cash: prev.cash + cashEarned,
        remainingDirtGrams: newRemaining,
        totalDirtSifted: prev.totalDirtSifted + actualSift,
        totalCashEarned: prev.totalCashEarned + cashEarned,
        totalManualClicks: prev.totalManualClicks + 1,
        totalCrits: prev.totalCrits + (isCrit ? 1 : 0),
        totalShatters: prev.totalShatters + (isShatter ? 1 : 0),
        maxComboReached: Math.max(prev.maxComboReached, newCombo),
        todayDirtSifted: prev.todayDirtSifted + actualSift,
        todayManualClicks: prev.todayManualClicks + 1,
        todayCashEarned: prev.todayCashEarned + cashEarned,
        weekDirtSifted: prev.weekDirtSifted + actualSift,
        weekManualClicks: prev.weekManualClicks + 1,
        weekCashEarned: prev.weekCashEarned + cashEarned,
        comboMultiplier: newCombo,
        lastTapTimestamp: Date.now(),
        pendingNuggetDiscovery: pendingNugget
      }));

      const particleLabel = isCrit
        ? `CRIT 10x! +${formatGrams(actualSift)}`
        : isShatter
        ? `SHATTER! +${formatGrams(actualSift)}`
        : `+${formatGrams(actualSift)}`;

      const newParticle: FloatingParticle = {
        id: Date.now() + Math.random(),
        text: particleLabel,
        subText: `+${formatCash(cashEarned)}`,
        x: x || rect.width / 2,
        y: y || rect.height / 2,
        createdAt: Date.now(),
        isCrit
      };
      setFloatingParticles((prev) => [...prev, newParticle]);

      setIsPressingPan(true);
      setTimeout(() => setIsPressingPan(false), 120);
    },
    [effectiveClickPower, effectivePricePerGram, effectiveHardness]
  );

  const handleBuyUpgrade = (upgradeId: string) => {
    setGameState((prev) => {
      let branch: UpgradeBranch | null = null;
      let item: UpgradeItem | undefined;

      if (prev.toolsUpgrades.some((u) => u.id === upgradeId)) {
        branch = 'tools';
        item = prev.toolsUpgrades.find((u) => u.id === upgradeId);
      } else if (prev.machineryUpgrades.some((u) => u.id === upgradeId)) {
        branch = 'machinery';
        const raw = prev.machineryUpgrades.find((u) => u.id === upgradeId);
        const maxLvl = getMachineryMaxLevel(prev.claimTier);
        item = raw ? { ...raw, maxLevel: maxLvl } : undefined;
      } else if (prev.marketUpgrades.some((u) => u.id === upgradeId)) {
        branch = 'market';
        item = prev.marketUpgrades.find((u) => u.id === upgradeId);
      } else if (prev.geologyUpgrades.some((u) => u.id === upgradeId)) {
        branch = 'geology';
        item = prev.geologyUpgrades.find((u) => u.id === upgradeId);
      }

      if (!branch || !item) return prev;

      const purchase = getBulkPurchaseInfo(item, prev.buyMode, prev.cash);
      if (purchase.isMaxed || !purchase.canAfford || purchase.count <= 0) return prev;

      sound.playUpgrade();

      const updateList = (list: UpgradeItem[]) =>
        list.map((u) => {
          if (u.id !== upgradeId) return u;
          const maxLvl = branch === 'machinery' ? getMachineryMaxLevel(prev.claimTier) : u.maxLevel;
          const nextLevel = maxLvl !== undefined ? Math.min(maxLvl, u.level + purchase.count) : u.level + purchase.count;
          return { ...u, level: nextLevel, maxLevel: maxLvl };
        });

      return {
        ...prev,
        cash: prev.cash - purchase.totalCost,
        totalCashSpent: prev.totalCashSpent + purchase.totalCost,
        totalUpgradesBought: prev.totalUpgradesBought + purchase.count,
        todayCashSpent: prev.todayCashSpent + purchase.totalCost,
        todayUpgradesBought: prev.todayUpgradesBought + purchase.count,
        weekCashSpent: prev.weekCashSpent + purchase.totalCost,
        weekUpgradesBought: prev.weekUpgradesBought + purchase.count,
        toolsUpgrades: branch === 'tools' ? updateList(prev.toolsUpgrades) : prev.toolsUpgrades,
        machineryUpgrades: branch === 'machinery' ? updateList(prev.machineryUpgrades) : prev.machineryUpgrades,
        marketUpgrades: branch === 'market' ? updateList(prev.marketUpgrades) : prev.marketUpgrades,
        geologyUpgrades: branch === 'geology' ? updateList(prev.geologyUpgrades) : prev.geologyUpgrades,
      };
    });
  };

  /**
   * PRESTIGE CLAIM REBIRTH:
   * - Resets cash and tools/machinery levels back to baseline
   * - Retains all discovered nuggets in Museum
   * - Awards Assayer's Certificates based on nugget weight & tier
   * - Advances to Tier N+1 with 8x capacity and increased hardness
   * - Grants starting cash from Frontier Grubstake perk
   */
  const handleClaimNuggetAndRebirth = () => {
    setGameState((prev) => {
      if (!prev.pendingNuggetDiscovery) return prev;
      const nugget = prev.pendingNuggetDiscovery;
      const discovered = [...prev.discoveredNuggets, nugget];
      const nextTier = prev.claimTier + 1;
      const nextTierInfo = getClaimTierInfo(nextTier);
      const nextCapacity = nextTierInfo.capacityGrams;
      const nextHiddenAt = generateNuggetDepth(nextCapacity);

      const radar = prev.geologyUpgrades.find((u) => u.id === 'geo_radar');
      const radarStrip = radar && radar.level > 0 ? Math.min(0.30, radar.level * 0.10) : 0;
      const totalStripPct = Math.min(0.50, steamShovelStripPct + radarStrip);
      const strippedGrams = nextCapacity * totalStripPct;
      const startingDirt = nextCapacity - strippedGrams;

      const certsEarned = nugget.certificatesAwarded;

      sound.playFanfare();

      return {
        ...prev,
        claimTier: nextTier,
        cash: startingCashBonus,
        maxDirtCapacity: nextCapacity,
        remainingDirtGrams: startingDirt,
        nuggetHiddenAtGrams: nextHiddenAt,
        currentHiddenNugget: generateRandomNugget(nextTier),
        discoveredNuggets: discovered,
        prestigeTokens: prev.prestigeTokens + certsEarned,
        totalRebirths: prev.totalRebirths + 1,
        highestHardnessBeaten: Math.max(prev.highestHardnessBeaten, effectiveHardness),
        toolsUpgrades: DEFAULT_TOOLS_UPGRADES,
        machineryUpgrades: DEFAULT_MACHINERY_UPGRADES.map((u) => ({ ...u, maxLevel: getMachineryMaxLevel(nextTier) })),
        marketUpgrades: DEFAULT_MARKET_UPGRADES,
        geologyUpgrades: DEFAULT_GEOLOGY_UPGRADES,
        totalDirtSifted: prev.totalDirtSifted + strippedGrams,
        weekDirtSifted: prev.weekDirtSifted + strippedGrams,
        weekNuggetsFound: prev.weekNuggetsFound + 1,
        pendingNuggetDiscovery: null,
        comboMultiplier: 1.0,
        tutorialStep: Math.max(prev.tutorialStep, 6),
        tutorialCompleted: true,
        milestoneBaselines: syncMilestoneBaselines(
          {
            ...prev,
            claimTier: nextTier,
            totalDirtSifted: prev.totalDirtSifted + strippedGrams,
            totalRebirths: prev.totalRebirths + 1,
            discoveredNuggets: discovered,
            prestigeTokens: prev.prestigeTokens + certsEarned
          },
          nextTier
        )
      };
    });
  };

  const handleBuyPrestigePerk = (perkId: string) => {
    setGameState((prev) => {
      const perk = prev.prestigePerks.find((p) => p.id === perkId);
      if (!perk || perk.level >= perk.maxLevel) return prev;
      const cost = Math.floor(perk.baseCost * Math.pow(perk.costRatio, perk.level));
      if (prev.prestigeTokens < cost) return prev;

      sound.playUpgrade();
      return {
        ...prev,
        prestigeTokens: prev.prestigeTokens - cost,
        prestigePerks: prev.prestigePerks.map((p) =>
          p.id === perkId ? { ...p, level: p.level + 1 } : p
        )
      };
    });
  };

  const handleTogglePrestigePerk = (perkId: string) => {
    sound.playChime();
    setGameState((prev) => ({
      ...prev,
      prestigePerks: prev.prestigePerks.map((p) =>
        p.id === perkId ? { ...p, disabled: !p.disabled } : p
      )
    }));
  };

  const handleClaimDailyMission = (missionId: string) => {
    setGameState((prev) => {
      const mission = prev.dailyMissions.find((m) => m.id === missionId);
      if (!mission || mission.isClaimed) return prev;

      const progress = getDailyMissionProgress(mission, prev);
      if (progress < mission.target) return prev;

      sound.playChime();
      return {
        ...prev,
        cash: prev.cash + mission.rewardCash,
        prestigeTokens: prev.prestigeTokens + (mission.rewardCertificates || 0),
        totalMissionsClaimed: prev.totalMissionsClaimed + 1,
        dailyMissions: prev.dailyMissions.map((m) =>
          m.id === missionId ? { ...m, isClaimed: true } : m
        )
      };
    });
  };

  const handleClaimWeeklyMission = (missionId: string) => {
    setGameState((prev) => {
      const mission = prev.weeklyMissions.find((m) => m.id === missionId);
      if (!mission || mission.isClaimed) return prev;

      const progress = getWeeklyMissionProgress(mission, prev);
      if (progress < mission.target) return prev;

      sound.playChime();
      return {
        ...prev,
        cash: prev.cash + mission.rewardCash,
        prestigeTokens: prev.prestigeTokens + (mission.rewardCertificates || 0),
        totalMissionsClaimed: prev.totalMissionsClaimed + 1,
        weeklyMissions: prev.weeklyMissions.map((m) =>
          m.id === missionId ? { ...m, isClaimed: true } : m
        )
      };
    });
  };

  const handleRerollDailyMissions = () => {
    setGameState((prev) => ({
      ...prev,
      dailyMissions: generateDailyMissions(),
      todayDirtSifted: 0,
      todayCashSpent: 0,
      todayUpgradesBought: 0,
      todayManualClicks: 0,
      todayCashEarned: 0,
      lastDailyResetTimestamp: Date.now()
    }));
  };

  const handleRerollWeeklyMissions = () => {
    setGameState((prev) => ({
      ...prev,
      weeklyMissions: generateWeeklyMissions(),
      weekDirtSifted: 0,
      weekCashSpent: 0,
      weekUpgradesBought: 0,
      weekManualClicks: 0,
      weekCashEarned: 0,
      weekNuggetsFound: 0,
      lastWeeklyResetTimestamp: Date.now()
    }));
  };

  // Tiered Milestone Chain claim handler
  const handleClaimMilestone = (chainId: string) => {
    setGameState((prev) => {
      if (prev.claimTier < 2) return prev;
      const chain = ACHIEVEMENT_CHAINS.find((c) => c.id === chainId);
      if (!chain) return prev;

      const currentClaimed = prev.claimedMilestones?.[chainId] || 0;
      if (currentClaimed >= chain.tiers.length) return prev;

      const tier = chain.tiers[currentClaimed];
      if (!isMilestoneTierUnlocked(chain.category, tier.tierLevel, prev.claimTier)) return prev;

      const val = getChainCurrentProgress(chain, tier, prev);
      if (val < tier.threshold) return prev;

      sound.playChime();
      setFloatingParticles((p) => [
        ...p,
        {
          id: Date.now() + Math.random(),
          text: `🏆 ${chain.title}!`,
          subText: `${tier.titleSuffix} • +${formatCash(tier.rewardCash)}${tier.rewardCertificates > 0 ? ` +${tier.rewardCertificates} 📜` : ''}`,
          x: 160,
          y: 110,
          createdAt: Date.now(),
          isFlake: true
        }
      ]);

      const nextClaimed = {
        ...(prev.claimedMilestones || {}),
        [chainId]: currentClaimed + 1
      };

      const nextBaselines = { ...(prev.milestoneBaselines || {}) };
      const nextTierIdx = currentClaimed + 1;
      if (nextTierIdx < chain.tiers.length) {
        const nextTier = chain.tiers[nextTierIdx];
        const isNextUnlocked = isMilestoneTierUnlocked(chain.category, nextTier.tierLevel, prev.claimTier);
        if (isNextUnlocked && CUMULATIVE_CHAINS.has(chainId)) {
          // Immediately start execution for the next unlocked tier starting from current raw value!
          nextBaselines[chainId] = chain.getValue(prev);
        } else {
          // Next tier requires a future mine -> locked, no baseline
          delete nextBaselines[chainId];
        }
      } else {
        delete nextBaselines[chainId];
      }

      return {
        ...prev,
        cash: prev.cash + tier.rewardCash,
        prestigeTokens: prev.prestigeTokens + (tier.rewardCertificates || 0),
        claimedMilestones: nextClaimed,
        milestoneBaselines: nextBaselines
      };
    });
  };

  // Bulk claim all ready milestones across all chains
  const handleClaimAllReadyMilestones = () => {
    setGameState((prev) => {
      if (prev.claimTier < 2) return prev;
      let totalCashReward = 0;
      let totalCertsReward = 0;
      let claimedCount = 0;
      const updatedClaimed = { ...(prev.claimedMilestones || {}) };
      const updatedBaselines = { ...(prev.milestoneBaselines || {}) };

      for (const chain of ACHIEVEMENT_CHAINS) {
        const currentClaimed = updatedClaimed[chain.id] || 0;
        if (currentClaimed < chain.tiers.length) {
          const tier = chain.tiers[currentClaimed];
          if (!isMilestoneTierUnlocked(chain.category, tier.tierLevel, prev.claimTier)) {
            continue;
          }
          const val = getChainCurrentProgress(chain, tier, prev);
          if (val >= tier.threshold) {
            const nextTierIdx = currentClaimed + 1;
            updatedClaimed[chain.id] = nextTierIdx;
            totalCashReward += tier.rewardCash;
            totalCertsReward += tier.rewardCertificates;
            claimedCount++;

            if (nextTierIdx < chain.tiers.length) {
              const nextTier = chain.tiers[nextTierIdx];
              const isNextUnlocked = isMilestoneTierUnlocked(chain.category, nextTier.tierLevel, prev.claimTier);
              if (isNextUnlocked && CUMULATIVE_CHAINS.has(chain.id)) {
                updatedBaselines[chain.id] = chain.getValue(prev);
              } else {
                delete updatedBaselines[chain.id];
              }
            } else {
              delete updatedBaselines[chain.id];
            }
          }
        }
      }

      if (claimedCount === 0) return prev;

      sound.playNuggetFound();
      setFloatingParticles((p) => [
        ...p,
        {
          id: Date.now() + Math.random(),
          text: `🌟 CLAIMED ${claimedCount} MILESTONES!`,
          subText: `+${formatCash(totalCashReward)}${totalCertsReward > 0 ? ` +${totalCertsReward} 📜` : ''}`,
          x: 150,
          y: 90,
          createdAt: Date.now(),
          isFlake: true
        }
      ]);

      return {
        ...prev,
        cash: prev.cash + totalCashReward,
        prestigeTokens: prev.prestigeTokens + totalCertsReward,
        claimedMilestones: updatedClaimed,
        milestoneBaselines: updatedBaselines
      };
    });
  };

  const handleClaimAchievement = (achId: string) => {
    setGameState((prev) => {
      const ach = prev.achievements.find((a) => a.id === achId);
      if (!ach || ach.isClaimed) return prev;

      const progress = getAchievementProgress(ach, prev);
      if (progress < ach.target) return prev;

      sound.playChime();
      return {
        ...prev,
        cash: prev.cash + ach.rewardCash,
        achievements: prev.achievements.map((a) =>
          a.id === achId ? { ...a, isClaimed: true } : a
        )
      };
    });
  };

  const handleToggleMute = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleTriggerResetSave = () => {
    sound.playChime();
    setConfirmResetting(true);
  };

  const executeResetSave = () => {
    sound.playChime();
    try {
      localStorage.removeItem('gold_rush_state_v6');
    } catch {}
    const freshState = getInitialGameState(true);
    setGameState(freshState);
    try {
      localStorage.setItem('gold_rush_state_v6', JSON.stringify(freshState));
    } catch {}
    setConfirmResetting(false);
    setCurrentScreen('mining');
  };

  const getWeatherInfo = (weather: WeatherEvent) => {
    switch (weather.type) {
      case 'CLEAR_SKIES':
        return { name: t('weatherClear'), desc: t('weatherClearDesc') };
      case 'HEAVY_RAIN':
        return { name: t('weatherRain'), desc: t('weatherRainDesc') };
      case 'DROUGHT':
        return { name: t('weatherDrought'), desc: t('weatherDroughtDesc') };
      case 'RIVER_SWELL':
        return { name: t('weatherSwell'), desc: t('weatherSwellDesc') };
      case 'HEAT_WAVE':
        return { name: t('weatherHeat'), desc: t('weatherHeatDesc') };
      default:
        return { name: weather.name, desc: weather.description };
    }
  };

  const renderWeatherIcon = (type: WeatherType) => {
    switch (type) {
      case 'CLEAR_SKIES':
        return <Sun className="w-4 h-4 text-amber-400" />;
      case 'HEAVY_RAIN':
        return <CloudRain className="w-4 h-4 text-sky-400" />;
      case 'DROUGHT':
        return <SunMedium className="w-4 h-4 text-orange-400" />;
      case 'RIVER_SWELL':
        return <Wind className="w-4 h-4 text-cyan-400" />;
      case 'HEAT_WAVE':
        return <Flame className="w-4 h-4 text-rose-400" />;
    }
  };

  const renderUpgradeIcon = (id: string, branch: UpgradeBranch) => {
    switch (id) {
      case 'tool_sieve':
        return <Search className="w-5 h-5 text-amber-400" />;
      case 'tool_magnetic_pan':
        return <Sparkles className="w-5 h-5 text-amber-300" />;
      case 'tool_prospector_rhythm':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'tool_diamond_pickaxe':
        return <Pickaxe className="w-5 h-5 text-amber-200" />;
      case 'tool_pneumatic_drill':
        return <Hammer className="w-5 h-5 text-amber-400" />;
      case 'mach_sluice_box':
        return <Waves className="w-5 h-5 text-orange-400" />;
      case 'mach_water_monitor':
        return <Zap className="w-5 h-5 text-sky-400" />;
      case 'mach_diesel_trommel':
        return <Cog className="w-5 h-5 text-orange-500" />;
      case 'mach_electric_dredge':
        return <Layers className="w-5 h-5 text-amber-400" />;
      case 'mach_bucket_wheel':
        return <Disc className="w-5 h-5 text-yellow-500" />;
      case 'mach_cyclone_washplant':
        return <Layers className="w-5 h-5 text-emerald-400" />;
      case 'mach_bearing_grease':
        return <Sparkles className="w-5 h-5 text-yellow-400" />;
      case 'market_gravel_crusher':
        return <Coins className="w-5 h-5 text-emerald-400" />;
      case 'market_gold_concentrator':
        return <TrendingUp className="w-5 h-5 text-emerald-300" />;
      case 'market_bulk_contract':
        return <Truck className="w-5 h-5 text-emerald-400" />;
      case 'geo_probe':
        return <Radio className="w-5 h-5 text-sky-400" />;
      case 'geo_pulse_detector':
        return <Radar className="w-5 h-5 text-cyan-400" />;
      case 'geo_radar':
        return <Layers className="w-5 h-5 text-blue-400" />;
      default:
        return <Hammer className="w-5 h-5 text-[#503E2C]" />;
    }
  };

  const getBranchList = (branch: UpgradeBranch): UpgradeItem[] => {
    switch (branch) {
      case 'tools':
        return gameState.toolsUpgrades;
      case 'machinery':
        return effectiveMachineryUpgrades;
      case 'market':
        return gameState.marketUpgrades;
      case 'geology':
        return gameState.geologyUpgrades;
    }
  };

  const sortedBranchUpgrades = useMemo(() => {
    const list = getBranchList(upgradeBranchTab);
    return [...list].sort((a, b) => {
      const aMax = a.maxLevel !== undefined && a.level >= a.maxLevel;
      const bMax = b.maxLevel !== undefined && b.level >= b.maxLevel;
      if (aMax !== bMax) return aMax ? 1 : -1;
      return 0;
    });
  }, [upgradeBranchTab, gameState.toolsUpgrades, effectiveMachineryUpgrades, gameState.marketUpgrades, gameState.geologyUpgrades]);

  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] w-full bg-[#F4EBD9] text-[#3C2D1D] flex flex-col items-center justify-center font-serif select-none antialiased overflow-hidden p-0 md:p-2">
      {/* Main Viewport */}
      <main
        className={`w-full max-w-lg flex-1 min-h-0 bg-[#F4EBD9] border-2 border-[#8E6221] shadow-2xl flex flex-col overflow-hidden relative ${
          deviceFrameMode
            ? 'max-h-[860px] md:rounded-[36px] md:border-4 md:border-[#8E6221]/60'
            : 'rounded-none md:rounded-2xl md:border'
        }`}
      >
        {/* ACTIVE SCREEN CONTENT */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {/* SCREEN 1: MINING (HOME) */}
          {currentScreen === 'mining' && (
            <div className="flex-1 min-h-0 flex flex-col p-3 overflow-y-auto space-y-2 pb-6">
              {/* TOP STATS CARD */}
              <div className="bg-[#EADBC4] rounded-2xl p-3 border border-[#8E6221]/60 shadow-lg shrink-0">
                {/* Mine Name at the very top */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#C2AC8A]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-[#3C2D1D] tracking-wide uppercase">
                      {t('tier')} #{gameState.claimTier}: {localizedClaimName}
                    </span>
                    {gameState.claimTier === 1 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 font-bold text-[9px] border border-amber-400/40 flex items-center gap-1 shadow-sm">
                        <span>⚡</span>
                        <span>{t('tutorialSpeedBadge')}</span>
                      </span>
                    )}
                  </div>
                  <div className="px-2 py-0.5 rounded bg-[#DFCFB8] text-orange-800 font-bold text-[9px] border border-[#8E6221]/40">
                    {t('rockHardness')}: x{effectiveHardness.toFixed(1)}
                  </div>
                </div>

                {/* Cash display (only the amount, no text label) */}
                <div className="flex justify-between items-center mb-2">
                  <div className="text-2xl font-black text-[#1E5B22] tracking-tight">
                    {formatCash(gameState.cash)}
                  </div>
                </div>

                {/* Dirt Capacity Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span style={{ color: '#3c2d1d' }} className="text-[#3C2D1D] text-[10px] uppercase tracking-wider">
                      {t('remainingPaydirt')}
                    </span>
                    <span style={{ color: '#3c2d1d' }} className="text-[#3C2D1D] text-[11px] font-mono">
                      {formatGrams(gameState.remainingDirtGrams)} / {formatGrams(gameState.maxDirtCapacity)}
                    </span>
                  </div>
                  <div className="w-full bg-[#F4EBD9] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#8E6221]/50">
                    <div
                      className="h-full bg-gradient-to-r from-[#C78214] via-[#E5A93C] to-[#F6D166] rounded-full transition-all duration-200"
                      style={{ width: `${(1 - progressFraction) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* PROSPECTOR TUTORIAL BANNER (MINE 1 ONBOARDING) */}
              {gameState.claimTier === 1 && !gameState.tutorialCompleted && !gameState.tutorialDismissed && gameState.tutorialStep < TUTORIAL_STEPS.length && (
                <div
                  style={{ backgroundColor: '#eadbc4' }}
                  className="bg-[#EADBC4] rounded-2xl p-3 border border-[#8E6221]/60 shadow-md shrink-0 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#DFCFB8] border border-[#8E6221]/40 flex items-center justify-center text-[#8E6221]">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-[#3C2D1D]">
                            {t('tutorialHeader')}
                          </span>
                          <span className="text-[9px] font-bold text-[#3C2D1D] bg-[#DFCFB8] px-1.5 py-0.5 rounded border border-[#8E6221]/40">
                            {t('tutorialStepIndicator', { step: gameState.tutorialStep + 1, total: TUTORIAL_STEPS.length })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-[#1E5B22] bg-[#DFCFB8] px-2 py-0.5 rounded-md border border-[#8E6221]/40">
                        +{formatCash(TUTORIAL_STEPS[gameState.tutorialStep]?.rewardCash || 0)}
                      </span>
                      <button
                        onClick={() => setIsTutorialMinimized(!isTutorialMinimized)}
                        className="p-1 rounded-lg bg-[#DFCFB8] hover:bg-[#DAC6AB] text-[#3C2D1D] transition cursor-pointer border border-[#8E6221]/30"
                        title={isTutorialMinimized ? t('tutorialShow') : t('tutorialHide')}
                      >
                        {isTutorialMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {!isTutorialMinimized ? (
                    <>
                      <div>
                        <h4 className="text-xs font-black text-[#3C2D1D] flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-[#8E6221] shrink-0" />
                          <span>{t(TUTORIAL_STEPS[gameState.tutorialStep].titleKey)}</span>
                        </h4>
                        <p className="text-[11px] text-[#6D5A46] mt-0.5 leading-snug">
                          {t(TUTORIAL_STEPS[gameState.tutorialStep].descKey)}
                        </p>
                      </div>

                      <div className="bg-[#DFCFB8] rounded-xl px-2.5 py-1.5 border border-[#8E6221]/40 text-[10px] text-[#3C2D1D] flex items-start gap-1.5">
                        <span className="text-[#8E6221] font-bold shrink-0">💡</span>
                        <span>{t(TUTORIAL_STEPS[gameState.tutorialStep].hintKey)}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {TUTORIAL_STEPS[gameState.tutorialStep].targetScreen === 'upgrades' ? (
                          <button
                            onClick={() => {
                              setCurrentScreen('upgrades');
                              if (TUTORIAL_STEPS[gameState.tutorialStep].targetBranch) {
                                setUpgradeBranchTab(TUTORIAL_STEPS[gameState.tutorialStep].targetBranch!);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-stone-950 font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition border border-[#8E6221]/40"
                          >
                            <span style={{ color: '#3c2d1d' }}>{t('tutorialGoToGoal')}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#3c2d1d]" />
                          </button>
                        ) : (
                          <div className="text-[10px] font-bold text-[#1E5B22] flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#1E5B22] animate-ping inline-block" />
                            <span>{t('tutorialReward', { cash: formatCash(TUTORIAL_STEPS[gameState.tutorialStep].rewardCash) })}</span>
                          </div>
                        )}

                        <button
                          onClick={() => setGameState((prev) => ({ ...prev, tutorialDismissed: true }))}
                          className="text-[10px] text-[#6D5A46] hover:text-[#3C2D1D] underline cursor-pointer"
                        >
                          <span style={{ color: '#3c2d1d' }}>{t('tutorialSkip')}</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-[#6D5A46] flex justify-between items-center pt-0.5">
                      <span className="truncate max-w-[220px] text-[#503E2C] font-medium">
                        {t(TUTORIAL_STEPS[gameState.tutorialStep].titleKey)}
                      </span>
                      <button
                        onClick={() => setIsTutorialMinimized(false)}
                        className="text-[#3C2D1D] text-[10px] font-bold hover:underline cursor-pointer"
                      >
                        <span style={{ color: '#3c2d1d' }}>{t('tutorialShow')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TUTORIAL COMPLETED CELEBRATION CHIP ON MINE 1 */}
              {gameState.claimTier === 1 && gameState.tutorialCompleted && (
                <div className="bg-emerald-950/40 rounded-xl px-3 py-1.5 border border-emerald-500/30 flex items-center justify-between shrink-0 shadow-sm text-xs">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <span>🎉</span>
                    <span>{t('tutorialCompleteBanner')}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    Mine #1 Active
                  </span>
                </div>
              )}

              {/* WEATHER LIVE BANNER */}
              {gameState.weatherEnabled && (
                <div className="bg-[#EADBC4] rounded-xl px-3 py-1.5 border border-[#8E6221]/60 flex items-center justify-between shrink-0 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#DFCFB8] flex items-center justify-center border border-[#8E6221]/50">
                      {renderWeatherIcon(gameState.currentWeather.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#3C2D1D]">
                          {getWeatherInfo(gameState.currentWeather).name}
                        </span>
                        <span
                          style={{ color: '#3c2d1d' }}
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                            gameState.currentWeather.manualMultiplier >= 1.0 &&
                            gameState.currentWeather.machineryMultiplier >= 1.0
                              ? 'bg-emerald-500/20'
                              : 'bg-rose-500/20'
                          }`}
                        >
                          {gameState.currentWeather.effectLabel}
                        </span>
                      </div>
                      <p className="text-[9px] text-[#6D5A46] truncate max-w-[200px]">
                        {getWeatherInfo(gameState.currentWeather).desc}
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-[#E5A93C] bg-[#DFCFB8] px-2 py-1 rounded-lg border border-[#8E6221]/50">
                    {gameState.weatherSecondsRemaining}s
                  </div>
                </div>
              )}

              {/* GEOLOGICAL PROBE HUD (Bottom 25%) */}
              {probeDepthRange && (
                <div className="bg-[#DFCFB8] rounded-xl px-3 py-1 border border-sky-500/40 flex items-center justify-between shrink-0 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[#3C2D1D] text-[10px] font-bold">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-[#3C2D1D]" />
                    <span style={{ color: '#3c2d1d' }}>
                      {t('probeLabel')} ({formatGrams(probeDepthRange.minD)} – {formatGrams(probeDepthRange.maxD)})
                    </span>
                  </div>
                </div>
              )}

              {/* CENTER SIFTING AREA */}
              <div
                className={`flex-1 min-h-[220px] rounded-3xl bg-[#EADBC4] relative flex items-center justify-center cursor-pointer transition-transform duration-100 select-none overflow-hidden ${
                  isDetectorActive
                    ? 'ring-4 ring-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.65)] animate-pulse border-2 border-amber-300'
                    : gameState.claimTier === 1 && !gameState.tutorialCompleted && !gameState.tutorialDismissed && gameState.tutorialStep === 0
                    ? 'ring-4 ring-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.45)] border-2 border-amber-400'
                    : 'border border-[#8E6221]/50 shadow-xl'
                } ${isPressingPan ? 'scale-95' : 'hover:scale-[1.01]'}`}
                onClick={handleManualSift}
              >
                <GoldPanCanvas isSifting={isPressingPan} autoRate={autoRatePerSec} />

                {floatingParticles.map((particle) => (
                  <div
                    key={particle.id}
                    className={`absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 font-black transition-all duration-1000 ${
                      particle.isCrit ? 'text-amber-300 scale-125' : particle.isFlake ? 'text-sky-300' : 'text-[#F6D166]'
                    }`}
                    style={{
                      left: particle.x,
                      top: particle.y - 35,
                      opacity: 0.95
                    }}
                  >
                    <div className="text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-bounce">
                      {particle.text}
                    </div>
                    <div className="text-[10px] text-emerald-400 text-center font-bold">
                      {particle.subText}
                    </div>
                  </div>
                ))}

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-radial from-transparent via-[#18130E]/30 to-[#18130E]/70 p-4">
                  {gameState.claimTier === 1 && !gameState.tutorialCompleted && !gameState.tutorialDismissed && gameState.tutorialStep === 0 && (
                    <div className="mb-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 font-black text-xs shadow-xl animate-bounce flex items-center gap-1.5 border border-amber-200">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>{t('tutStep1Title')}: {gameState.totalManualClicks}/5</span>
                    </div>
                  )}

                  {gameState.comboMultiplier > 1.05 && (
                    <div className="mb-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 text-stone-950 font-black text-xs shadow-lg animate-pulse flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-yellow-200" />
                      <span>{t('combo')} x{gameState.comboMultiplier.toFixed(2)}</span>
                    </div>
                  )}

                  {isDetectorActive && (
                    <div className="mb-1.5 px-3 py-1 rounded-full bg-amber-400 text-stone-950 font-black text-xs shadow-lg animate-bounce flex items-center gap-1">
                      <Radar className="w-3.5 h-3.5" />
                      <span>{t('detectorAlert')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* DYNAMIC REACTIVE QUICK-BUY STRIP */}
              <div className="bg-[#EADBC4] rounded-2xl p-2.5 border border-[#8E6221]/50 shadow-md shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Hammer className="w-3.5 h-3.5 text-[#3C2D1D]" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#3C2D1D]">
                      {t('availableUpgrades')} ({affordableUpgrades.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentScreen('upgrades')}
                    className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition"
                  >
                    {t('viewTree')}
                  </button>
                </div>

                {affordableUpgrades.length === 0 ? (
                  <div className="py-2.5 px-3 rounded-xl bg-[#DFCFB8] border border-[#8E6221]/60 text-center">
                    <span className="text-[10px] text-[#6D5A46] font-medium">
                      {t('keepSifting')}
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {affordableUpgrades.slice(0, 6).map((item) => {
                      const cost = item.baseCost * Math.pow(item.costRatio, item.level);
                      const uText = getUpgradeText(language, item.id, item.name, item.description);
                      return (
                        <div
                          key={item.id}
                          className="min-w-[155px] bg-[#DFCFB8] rounded-xl p-2 border border-[#8E6221]/50 flex flex-col justify-between shadow-sm shrink-0"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-6 h-6 rounded-lg bg-[#DAC6AB] flex items-center justify-center shrink-0">
                              {renderUpgradeIcon(item.id, item.branch)}
                            </div>
                            <div className="truncate">
                              <div className="text-[10px] font-bold text-[#6D5A46] truncate">
                                {uText.name}
                              </div>
                              <div className="text-[8px] text-[#6D5A46]">
                                Lv. {item.level}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleBuyUpgrade(item.id)}
                            className="w-full py-1 rounded-lg bg-[#E5A93C] hover:bg-[#9C2A2A] text-white border border-[#D8B678] font-black text-[10px] transition shadow-sm active:scale-95"
                          >
                            {t('buy')} {formatCash(cost)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SCREEN 2: UPGRADES */}
          {currentScreen === 'upgrades' && (
            <div className="flex-1 min-h-0 flex flex-col bg-[#F4EBD9] overflow-hidden">
              <div className="px-4 py-3 bg-[#EADBC4] border-b border-[#8E6221]/50 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentScreen('mining')}
                      className="p-1.5 rounded-lg bg-[#DAC6AB] hover:bg-[#5A4130] text-[#503E2C] transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-black text-[#6D5A46] uppercase tracking-wider">
                      {t('upgradesTitle')}
                    </span>
                  </div>

                  <div className="text-xs font-black text-[#1E5B22] bg-[#DFCFB8] px-2.5 py-1 rounded-lg border border-[#8E6221]/50">
                    {formatCash(gameState.cash)}
                  </div>
                </div>

                {/* Rates & Prices Strip (Adjusted for Hardness) */}
                <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-[#C2AC8A]">
                  <div className="bg-[#DFCFB8] rounded-lg p-1.5 border border-[#8E6221]/50 flex flex-col items-center">
                    <span className="text-[9px] uppercase tracking-wider text-[#6D5A46] font-bold">
                      {t('tapScoop')}
                    </span>
                    <span className="text-[11px] font-black text-[#3C2D1D]">
                      +{formatGrams(effectiveClickPower)}
                    </span>
                  </div>
                  <div className="bg-[#DFCFB8] rounded-lg p-1.5 border border-[#8E6221]/50 flex flex-col items-center">
                    <span className="text-[9px] uppercase tracking-wider text-[#6D5A46] font-bold">
                      {t('autoSpeed')}
                    </span>
                    <span className="text-[11px] font-black text-[#3C2D1D]">
                      {formatNumber(autoRatePerSec)} g/s
                    </span>
                  </div>
                  <div className="bg-[#DFCFB8] rounded-lg p-1.5 border border-[#8E6221]/50 flex flex-col items-center">
                    <span className="text-[9px] uppercase tracking-wider text-[#6D5A46] font-bold">
                      {t('gravelPrice')}
                    </span>
                    <span className="text-[11px] font-black text-[#3C2D1D]">
                      {formatCash(effectivePricePerGram)}/g
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#C2AC8A]">
                  <span className="text-[10px] uppercase font-bold text-[#6D5A46]">
                    {t('purchaseMode')}:
                  </span>
                  <div className="flex bg-[#DFCFB8] rounded-lg p-0.5 border border-[#8E6221]/50">
                    {(['x1', 'x10', 'max'] as BuyMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setGameState((prev) => ({ ...prev, buyMode: mode }))}
                        className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition ${
                          gameState.buyMode === mode
                            ? 'bg-[#E5A93C] text-stone-950 shadow-sm'
                            : 'text-[#6D5A46] hover:text-stone-200'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex bg-[#dfcfb8] border-b border-[#8E6221]/50 shrink-0">
                {(['tools', 'machinery', 'market', 'geology'] as UpgradeBranch[]).map((branch) => {
                  const list = getBranchList(branch);
                  const ready = list.filter(
                    (u) => (u.maxLevel === undefined || u.level < u.maxLevel) && gameState.cash >= u.baseCost * Math.pow(u.costRatio, u.level)
                  ).length;
                  const label =
                    branch === 'tools'
                      ? t('tabTools')
                      : branch === 'machinery'
                      ? t('tabMachines')
                      : branch === 'market'
                      ? t('tabMarket')
                      : t('tabGeology');

                  return (
                    <button
                      key={branch}
                      onClick={() => setUpgradeBranchTab(branch)}
                      className={`flex-1 py-2 text-[11px] font-bold flex flex-col items-center justify-center border-b-2 transition ${
                        upgradeBranchTab === branch
                          ? 'border-[#E5A93C] text-[#3c2d1d] bg-[#DAC6AB]/40'
                          : 'border-transparent text-[#6D5A46] hover:text-stone-200'
                      }`}
                    >
                      <span>{label}</span>
                      {ready > 0 && (
                        <span className="text-[9px] text-[#1E5B22] font-black">
                          ({ready} {t('ready')})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 pb-6">
                {upgradeBranchTab === 'machinery' && (
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#291F14] to-[#1C1610] border border-amber-500/30 flex items-center justify-between text-xs shadow-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <Cog className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-black text-white truncate">
                          {t('machineryCapBanner', {
                            tier: gameState.claimTier,
                            max: currentMachineryMaxLevel,
                            nextTier: gameState.claimTier + 1,
                            nextMax: getNextMachineryMaxLevel(gameState.claimTier)
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {sortedBranchUpgrades.map((item) => {
                  const purchase = getBulkPurchaseInfo(item, gameState.buyMode, gameState.cash);
                  const isMaxed = purchase.isMaxed || (item.maxLevel !== undefined && item.level >= item.maxLevel);
                  const milestone = getMilestoneProgress(item.level);
                  const activeDesc = getUpgradeActiveDescription(item, totalToolLevels);
                  const uText = getUpgradeText(language, item.id, item.name, item.description);
                  const isTutorialGoal =
                    gameState.claimTier === 1 &&
                    !gameState.tutorialCompleted &&
                    !gameState.tutorialDismissed &&
                    ((gameState.tutorialStep === 1 && item.id === 'tool_sieve') ||
                     (gameState.tutorialStep === 2 && item.id === 'mach_sluice_box'));

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border transition-all shadow-sm ${
                        isTutorialGoal
                          ? 'ring-2 ring-amber-400 border-amber-400 bg-[#DAC6AB] shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                          : isMaxed
                          ? 'bg-[#1D1711] border-amber-500/30'
                          : purchase.canAfford
                          ? 'bg-[#EADBC4] border-[#E5A93C]/60'
                          : 'bg-[#DFCFB8]/90 border-[#8E6221]/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                              isTutorialGoal
                                ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                                : isMaxed
                                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                                : purchase.canAfford
                                ? 'bg-[#DAC6AB] border-[#E5A93C]/40 text-[#F6D166]'
                                : 'bg-[#2A1C12] border-[#8E6221]/50 text-[#8C7B68]'
                            }`}
                          >
                            {renderUpgradeIcon(item.id, item.branch)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3
                                className={`text-xs font-bold ${
                                  isTutorialGoal ? 'text-[#6D5A46]' : isMaxed ? 'text-[#6D5A46]' : purchase.canAfford ? 'text-[#6D5A46]' : 'text-[#6D5A46]'
                                }`}
                              >
                                {uText.name}
                              </h3>
                              {isTutorialGoal && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 flex items-center gap-1 shadow-md animate-bounce">
                                  <GraduationCap className="w-3 h-3" />
                                  <span>{t('tutorialTargetBadge')}</span>
                                </span>
                              )}
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  isMaxed
                                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                    : 'bg-[#DAC6AB] text-[#E5A93C]'
                                }`}
                              >
                                {isMaxed
                                  ? `${item.level}/${item.maxLevel} • ${item.branch === 'machinery' ? t('machineryCapReached', { tier: gameState.claimTier }) : t('maxSeal')}`
                                  : item.maxLevel
                                  ? `Lv. ${item.level}/${item.maxLevel}`
                                  : `Lv. ${item.level}`}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#6D5A46] leading-tight mt-0.5">
                              {uText.description}
                            </p>
                            <div className="text-[10px] font-semibold text-sky-400 mt-1">
                              {activeDesc}
                            </div>
                          </div>
                        </div>

                        {isMaxed ? (
                          <div className="flex flex-col items-end shrink-0">
                            <span className="px-3 py-1.5 rounded-xl bg-[#292015] text-amber-300 font-black text-xs flex items-center justify-center border border-amber-400/40 shadow-sm">
                              {item.branch === 'machinery' ? t('machineryCapReached', { tier: gameState.claimTier }) : t('maxSeal')}
                            </span>
                            {item.branch === 'machinery' && (
                              <span className="text-[8px] font-bold text-[#6D5A46] mt-0.5 text-right">
                                {language === 'ru'
                                  ? `Рудник #${gameState.claimTier + 1} → Lv. ${getNextMachineryMaxLevel(gameState.claimTier)}`
                                  : `Mine #${gameState.claimTier + 1} → Lv. ${getNextMachineryMaxLevel(gameState.claimTier)}`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleBuyUpgrade(item.id)}
                            disabled={!purchase.canAfford}
                            className={`px-3 py-1.5 rounded-xl font-black text-xs shrink-0 transition shadow active:scale-95 flex flex-col items-center ${
                              purchase.canAfford
                                ? 'bg-gradient-to-b from-[#2D5A27] to-[#1E3F1A] border-2 border-[#8E6221] text-[#D8B678] shadow-lg hover:brightness-110 hover:brightness-110'
                                : 'bg-stone-800 text-[#8C7B68] cursor-not-allowed'
                            }`}
                          >
                            <span className="text-[9px] uppercase">
                              {purchase.count > 1 ? `${t('buy')} +${purchase.count}` : t('buy')}
                            </span>
                            <span>{formatCash(purchase.totalCost)}</span>
                          </button>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-[#C2AC8A]">
                        <div className="flex justify-between items-center text-[9px] font-bold mb-1">
                          <span className="text-[#6D5A46]">
                            {isMaxed ? t('maxSeal') : t('milestoneBonus', { current: milestone.current })}
                          </span>
                          {milestone.multiplier > 1 && (
                            <span className="text-[#F6D166]">
                              {t('activeBoost', { mult: milestone.multiplier })}
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-[#F4EBD9] h-1.5 rounded-full overflow-hidden border border-[#8E6221]/50">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isMaxed
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-300'
                                : 'bg-[#E5A93C]'
                            }`}
                            style={{ width: `${isMaxed ? 100 : (milestone.current / 25) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SCREEN 3: MISSIONS */}
          {/* SCREEN 3: MISSIONS & CONTRACTS (DAILY & WEEKLY) */}
          {currentScreen === 'missions' && (
            <div className="flex-1 min-h-0 flex flex-col bg-[#F4EBD9] overflow-hidden">
              <div className="px-4 py-3 bg-[#EADBC4] border-b border-[#8E6221]/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentScreen('mining')}
                    className="p-1.5 rounded-lg bg-[#DAC6AB] hover:bg-[#5A4130] text-[#503E2C] transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-black text-[#6D5A46] uppercase tracking-wider">
                    {t('missionsTitle')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded-lg bg-[#DAC6AB] border border-[#8E6221]/50 text-[10px] font-bold text-emerald-400">
                    {formatCash(gameState.cash)}
                  </div>
                  <div className="px-2 py-0.5 rounded-lg bg-[#332A15] border border-amber-400 text-[10px] font-bold text-amber-300 flex items-center gap-1">
                    <Scroll className="w-3 h-3" />
                    <span>{gameState.prestigeTokens} 📜</span>
                  </div>
                </div>
              </div>

              {/* 3 TABS: Daily (24h) | Weekly (7d) | Milestones */}
              <div className="flex bg-[#2A1C12] border-b border-[#8E6221]/50 shrink-0">
                <button
                  onClick={() => setMissionTab('daily')}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${
                    missionTab === 'daily'
                      ? 'border-emerald-400 text-emerald-400 bg-[#DAC6AB]/40'
                      : 'border-transparent text-[#6D5A46] hover:text-stone-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{t('tabDaily')} ({gameState.dailyMissions.filter((m) => m.isClaimed).length}/{gameState.dailyMissions.length})</span>
                  {claimableDailyCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </button>
                <button
                  onClick={() => setMissionTab('weekly')}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${
                    missionTab === 'weekly'
                      ? 'border-amber-400 text-amber-300 bg-[#DAC6AB]/40'
                      : 'border-transparent text-[#6D5A46] hover:text-stone-200'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>{t('tabWeekly')} ({gameState.weeklyMissions.filter((m) => m.isClaimed).length}/{gameState.weeklyMissions.length})</span>
                  {claimableWeeklyCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
                <button
                  onClick={() => setMissionTab('milestones')}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${
                    missionTab === 'milestones'
                      ? 'border-[#E5A93C] text-[#F6D166] bg-[#DAC6AB]/40'
                      : 'border-transparent text-[#6D5A46] hover:text-stone-200'
                  }`}
                >
                  {gameState.claimTier < 2 ? (
                    <Lock className="w-3.5 h-3.5 text-amber-500/80" />
                  ) : (
                    <Trophy className="w-3.5 h-3.5" />
                  )}
                  <span>{t('tabMilestones')}</span>
                  {gameState.claimTier < 2 ? (
                    <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {t('milestonesLockedBadge')}
                    </span>
                  ) : (
                    claimableMilestonesCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    )
                  )}
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4 pb-6">
                {missionTab === 'daily' && (
                  <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                          {t('dailyObjectives')}
                        </span>
                      </div>
                      <button
                        onClick={handleRerollDailyMissions}
                        className="flex items-center gap-1 text-[10px] font-bold text-sky-400 hover:text-sky-300 transition"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{t('rerollDaily')}</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {[...gameState.dailyMissions]
                        .sort((a, b) => (a.isClaimed === b.isClaimed ? 0 : a.isClaimed ? 1 : -1))
                        .map((m) => {
                        const progress = getDailyMissionProgress(m, gameState);
                        const fraction = Math.min(1, progress / m.target);
                        const isComplete = progress >= m.target;

                        return (
                          <div
                            key={m.id}
                            className={`p-3 rounded-2xl border transition-all ${
                              m.isClaimed
                                ? 'bg-[#F4EBD9] border-stone-900 opacity-60'
                                : isComplete
                                ? 'bg-[#1E281F] border-emerald-500/60 shadow-md'
                                : 'bg-[#EADBC4] border-[#8E6221]/50'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1.5">
                              <div>
                                <div className="text-xs font-bold text-[#6D5A46] flex items-center gap-1.5">
                                  {m.title}
                                  {m.isClaimed && (
                                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                      {t('claimed')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-[#6D5A46] mt-0.5">
                                  {m.description}
                                </p>
                              </div>

                              {!m.isClaimed && (
                                <button
                                  onClick={() => handleClaimDailyMission(m.id)}
                                  disabled={!isComplete}
                                  className={`px-3 py-1 rounded-xl text-xs font-black transition flex flex-col items-center ${
                                    isComplete
                                      ? 'bg-emerald-500 hover:bg-[#9C2A2A] text-white border border-[#D8B678] shadow-md animate-bounce'
                                      : 'bg-stone-800 text-[#8C7B68] cursor-not-allowed'
                                  }`}
                                >
                                  <span>+{formatCash(m.rewardCash)}</span>
                                  {m.rewardCertificates > 0 && (
                                    <span className="text-[9px] font-black text-amber-900">
                                      +{m.rewardCertificates} 📜
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-mono text-[#6D5A46]">
                                <span>{t('progress')}</span>
                                <span>
                                  {formatNumber(progress)} / {formatNumber(m.target)} {m.unit}
                                </span>
                              </div>
                              <div className="w-full bg-[#F4EBD9] h-1.5 rounded-full overflow-hidden border border-[#8E6221]/50">
                                <div
                                  className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                                  style={{ width: `${fraction * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {missionTab === 'weekly' && (
                  <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                          {t('weeklyContracts')}
                        </span>
                      </div>
                      <button
                        onClick={handleRerollWeeklyMissions}
                        className="flex items-center gap-1 text-[10px] font-bold text-sky-400 hover:text-sky-300 transition"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{t('rerollWeekly')}</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {[...gameState.weeklyMissions]
                        .sort((a, b) => (a.isClaimed === b.isClaimed ? 0 : a.isClaimed ? 1 : -1))
                        .map((m) => {
                        const progress = getWeeklyMissionProgress(m, gameState);
                        const fraction = Math.min(1, progress / m.target);
                        const isComplete = progress >= m.target;

                        return (
                          <div
                            key={m.id}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              m.isClaimed
                                ? 'bg-[#F4EBD9] border-stone-900 opacity-60'
                                : isComplete
                                ? 'bg-[#291F14] border-amber-400 shadow-lg'
                                : 'bg-[#221A13] border-amber-800/40'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="text-xs font-black text-[#6D5A46] flex items-center gap-1.5">
                                  {m.title}
                                  {m.isClaimed && (
                                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                                      {t('claimed')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-[#503E2C] mt-0.5">
                                  {m.description}
                                </p>
                              </div>

                              {!m.isClaimed && (
                                <button
                                  onClick={() => handleClaimWeeklyMission(m.id)}
                                  disabled={!isComplete}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex flex-col items-center shrink-0 ${
                                    isComplete
                                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 hover:brightness-110 text-stone-950 shadow-md animate-pulse'
                                      : 'bg-stone-800 text-[#8C7B68] cursor-not-allowed'
                                  }`}
                                >
                                  <span>+{formatCash(m.rewardCash)}</span>
                                  <span className="text-[9px] font-black text-stone-900">
                                    +{m.rewardCertificates} 📜
                                  </span>
                                </button>
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-mono text-[#6D5A46]">
                                <span className="text-amber-200/70">{t('progress')}</span>
                                <span className="text-amber-300 font-bold">
                                  {formatNumber(progress)} / {formatNumber(m.target)} {m.unit}
                                </span>
                              </div>
                              <div className="w-full bg-[#F4EBD9] h-2 rounded-full overflow-hidden border border-amber-900/60">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-300"
                                  style={{ width: `${fraction * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {missionTab === 'milestones' && (
                  gameState.claimTier < 2 ? (
                    <div className="p-6 rounded-3xl bg-gradient-to-b from-[#241C15] to-[#18130E] border border-amber-600/30 text-center space-y-4 my-auto shadow-2xl">
                      <div className="w-16 h-16 rounded-2xl bg-[#DAC6AB] border border-amber-500/40 flex items-center justify-center mx-auto shadow-inner">
                        <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
                      </div>
                      <div>
                        <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider mb-2">
                          🔒 {t('milestonesLockedBadge')}
                        </div>
                        <h3 className="text-base font-black text-white">
                          {t('milestonesLockedTitle')}
                        </h3>
                        <p className="text-xs text-[#503E2C] mt-2 leading-relaxed max-w-sm mx-auto">
                          {t('milestonesLockedDesc')}
                        </p>
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => setCurrentScreen('mining')}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition inline-flex items-center gap-2"
                        >
                          <Pickaxe className="w-4 h-4" />
                          <span>{t('navMining')}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3.5 min-w-0">
                      {/* Screen Header: Global Completion & Bulk Collection */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#241C15] to-[#1A140F] border border-[#E5A93C]/40 shadow-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-[#6D5A46]">
                              {t('milestoneChains')}
                            </div>
                            <div className="text-sm font-black text-white flex items-center gap-1.5">
                              <span>{t('completed')}:</span>
                              <span className="text-[#F6D166]">{totalMilestonesClaimedCount}</span>
                              <span className="text-[#6D5A46]">/ {TOTAL_MILESTONES_COUNT}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1 justify-end">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>{t('globalBoost')}</span>
                            </div>
                            <div className="text-sm font-black text-amber-400">
                              +{((achievementMetaMult - 1.0) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        <div className="w-full bg-[#F4EBD9] h-2 rounded-full overflow-hidden border border-amber-900/50">
                          <div
                            className="h-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-300 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (totalMilestonesClaimedCount / TOTAL_MILESTONES_COUNT) * 100)}%`
                            }}
                          />
                        </div>

                        <div className="flex justify-between items-center pt-0.5">
                          <span className="text-[10px] text-[#6D5A46] font-medium">
                            {t('globalBoost')}: +0.3% / tier
                          </span>
                          <button
                            onClick={handleClaimAllReadyMilestones}
                            disabled={claimableMilestonesCount === 0}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 ${
                              claimableMilestonesCount > 0
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 shadow-lg shadow-amber-500/20 animate-pulse hover:brightness-110 active:scale-95'
                                : 'bg-stone-800 text-[#8C7B68] cursor-not-allowed opacity-60'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('claimAllReady')} {claimableMilestonesCount > 0 ? `(${claimableMilestonesCount})` : ''}</span>
                          </button>
                        </div>
                      </div>

                      {/* Category Selector Bar (Scrollable Tabs) */}
                      <div className="relative w-full min-w-0">
                        <div
                          className="w-full min-w-0 overflow-x-auto touch-pan-x overscroll-x-contain flex gap-1.5 pb-2 pt-0.5 shrink-0"
                          style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}
                          onWheel={(e) => {
                            if (e.deltaY !== 0) {
                              e.currentTarget.scrollLeft += e.deltaY;
                            }
                          }}
                        >
                          {[
                            { id: 'PROGRESS' as AchievementCategory, label: t('categoryProgress'), icon: '🏆' },
                            { id: 'UPGRADES' as AchievementCategory, label: t('categoryUpgrades'), icon: '⚙️' },
                            { id: 'MASTERY' as AchievementCategory, label: t('categoryMastery'), icon: '⚡' },
                            { id: 'MUSEUM' as AchievementCategory, label: t('categoryMuseum'), icon: '💎' },
                            { id: 'SECRETS' as AchievementCategory, label: t('categorySecrets'), icon: '❓' }
                          ].map((cat) => {
                            const isSelected = milestoneCategory === cat.id;
                            const isUnlocked = isAchievementCategoryUnlocked(cat.id, gameState.claimTier);
                            const reqMine = CATEGORY_UNLOCK_TIERS[cat.id];
                            const readyCount = claimableMilestonesByCategory[cat.id] || 0;
                            return (
                              <button
                                key={cat.id}
                                onClick={(e) => {
                                  setMilestoneCategory(cat.id);
                                  e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap border select-none ${
                                  isSelected
                                    ? 'bg-[#DAC6AB] border-[#E5A93C] text-[#F6D166] shadow-sm ring-1 ring-[#E5A93C]/40'
                                    : isUnlocked
                                    ? 'bg-[#1C1610] border-[#8E6221]/50 text-[#6D5A46] hover:text-stone-200 hover:bg-[#251e16]'
                                    : 'bg-[#15110D] border-[#C2AC8A] text-[#8C7B68] hover:text-[#503E2C]'
                                }`}
                              >
                                <span className="text-sm shrink-0">{cat.icon}</span>
                                <span className="shrink-0">{cat.label}</span>
                                {!isUnlocked ? (
                                  <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-stone-800 text-[#6D5A46] border border-[#8E6221]/70">
                                    🔒 Р.{reqMine}
                                  </span>
                                ) : readyCount > 0 ? (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-400 text-stone-950 shadow-sm animate-bounce">
                                    {readyCount}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active Tier Cards or Category Lock Message */}
                      {!isAchievementCategoryUnlocked(milestoneCategory, gameState.claimTier) ? (
                        <div className="p-6 rounded-2xl bg-[#EADBC4] border border-amber-900/40 text-center space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-[#2A1C12] border border-amber-700/40 flex items-center justify-center mx-auto">
                            <Lock className="w-6 h-6 text-amber-500" />
                          </div>
                          <div className="text-sm font-black text-amber-300">
                            {t('categoryLocked', { tier: CATEGORY_UNLOCK_TIERS[milestoneCategory] })}
                          </div>
                          <p className="text-xs text-[#6D5A46] max-w-xs mx-auto">
                            {language === 'ru'
                              ? `Цепочки достижений этой категории откроются после перехода на Рудник #${CATEGORY_UNLOCK_TIERS[milestoneCategory]}.`
                              : `Milestone chains in this category will unlock upon reaching Mine #${CATEGORY_UNLOCK_TIERS[milestoneCategory]}.`}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {ACHIEVEMENT_CHAINS.filter((c) => c.category === milestoneCategory)
                            .sort((a, b) => {
                              const aMax = (gameState.claimedMilestones?.[a.id] || 0) >= a.tiers.length;
                              const bMax = (gameState.claimedMilestones?.[b.id] || 0) >= b.tiers.length;
                              if (aMax !== bMax) return aMax ? 1 : -1;
                              return 0;
                            })
                            .map((chain) => {
                            const currentClaimed = gameState.claimedMilestones?.[chain.id] || 0;
                            const isMaxed = currentClaimed >= chain.tiers.length;
                            const activeTier = isMaxed ? chain.tiers[chain.tiers.length - 1] : chain.tiers[currentClaimed];
                            const isTierUnlocked = isMilestoneTierUnlocked(chain.category, activeTier.tierLevel, gameState.claimTier);
                            const requiredMineForThisTier = getRequiredMineForTier(activeTier.tierLevel);
                            const currentValue = getChainCurrentProgress(chain, activeTier, gameState);
                            const threshold = activeTier.threshold;
                            const fraction = isMaxed ? 1.0 : !isTierUnlocked ? 0 : Math.min(1.0, Math.max(0, currentValue / threshold));
                            const isReady = !isMaxed && isTierUnlocked && currentValue >= threshold;
                            const colors = getTierColorClasses(activeTier.tierRank);

                            const formattedThreshold = chain.unit === '$'
                              ? formatCash(threshold)
                              : chain.unit === 'g'
                              ? formatGrams(threshold)
                              : `${formatNumber(threshold)}${chain.unit !== 'Tier' && chain.unit !== 'x' && chain.unit !== 'x Hardness' && chain.unit !== '% bonus' && chain.unit !== 'easter egg' ? ' ' + chain.unit : ''}`;
                            const dynamicDesc = chain.descriptionFormat.replace('{threshold}', formattedThreshold);

                            return (
                              <div
                                key={chain.id}
                                className={`p-3 rounded-2xl border transition-all ${colors.border} ${
                                  isMaxed
                                    ? 'bg-[#EADBC4]/80 opacity-90'
                                    : isReady
                                    ? 'bg-[#261E16] shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/30'
                                    : 'bg-[#1E1812]'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2 mb-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-black text-[#6D5A46] truncate">{chain.title}</span>
                                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${colors.badge}`}>
                                        {isMaxed ? t('maxSeal') : `Tier ${activeTier.tierLevel}/${chain.tiers.length} • ${RANK_TRANSLATIONS[language]?.[activeTier.tierRank] || activeTier.titleSuffix}`}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-[#503E2C] mt-0.5 leading-snug">
                                      {dynamicDesc}
                                    </p>
                                  </div>

                                  <div className="shrink-0 flex items-center">
                                    {isMaxed ? (
                                      <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                                        <span>👑</span>
                                        <span>{t('maxSeal')}</span>
                                      </span>
                                    ) : !isTierUnlocked ? (
                                      <span className="px-2.5 py-1.5 rounded-xl bg-stone-900 border border-[#8E6221]/50 text-[10px] font-bold text-[#6D5A46] flex items-center gap-1">
                                        <Lock className="w-3 h-3 text-amber-500/80" />
                                        <span>{t('tierRequiresMine', { tier: requiredMineForThisTier })}</span>
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleClaimMilestone(chain.id)}
                                        disabled={!isReady}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex flex-col items-center min-w-[70px] ${
                                          isReady
                                            ? 'bg-gradient-to-r from-amber-400 to-yellow-300 hover:brightness-110 text-stone-950 shadow-md animate-bounce'
                                            : 'bg-stone-800 text-[#8C7B68] cursor-not-allowed opacity-50'
                                        }`}
                                      >
                                        <span>+{formatCash(activeTier.rewardCash)}</span>
                                        {activeTier.rewardCertificates > 0 && (
                                          <span className="text-[9px] font-bold text-stone-900">
                                            +{activeTier.rewardCertificates} 📜
                                          </span>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-[9px] font-mono text-[#6D5A46]">
                                    <span>{t('progress')}</span>
                                    <span className={isReady ? 'text-amber-300 font-bold' : isMaxed ? 'text-amber-400 font-bold' : !isTierUnlocked ? 'text-[#6D5A46] font-medium' : 'text-[#503E2C]'}>
                                      {isMaxed
                                        ? t('tierCompleted', { count: chain.tiers.length })
                                        : !isTierUnlocked
                                        ? `${t('tierRequiresMine', { tier: requiredMineForThisTier })} • 0 / ${formatNumber(threshold)} ${chain.unit}`
                                        : `${formatNumber(currentValue)} / ${formatNumber(threshold)} ${chain.unit} • ${(fraction * 100).toFixed(0)}%`}
                                    </span>
                                  </div>
                                  <div className="w-full bg-[#F4EBD9] h-1.5 rounded-full overflow-hidden border border-[#8E6221]/60">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${colors.progress}`}
                                      style={{ width: `${fraction * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* SCREEN 4: MUSEUM & PERMANENT ASSAYER'S TECH TREE */}
          {currentScreen === 'museum' && (
            <div className="flex-1 min-h-0 flex flex-col bg-[#F4EBD9] overflow-hidden">
              <div className="px-4 py-3 bg-[#EADBC4] border-b border-[#8E6221]/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentScreen('mining')}
                    className="p-1.5 rounded-lg bg-[#DAC6AB] hover:bg-[#5A4130] text-[#503E2C] transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-black text-[#6D5A46] uppercase tracking-wider">
                    {t('museumTitle')}
                  </span>
                </div>
                <div className="text-xs font-black text-amber-300 bg-[#332A15] px-2.5 py-1 rounded-lg border border-amber-400 flex items-center gap-1 shadow-sm">
                  <Scroll className="w-3.5 h-3.5" />
                  <span>{gameState.prestigeTokens} {t('certificates')}</span>
                </div>
              </div>

              {/* Sub-tabs: Relic Gallery vs Permanent Tech Tree */}
              <div className="flex bg-[#2A1C12] border-b border-[#8E6221]/50 shrink-0">
                <button
                  onClick={() => setMuseumSubTab('relics')}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${
                    museumSubTab === 'relics'
                      ? 'border-[#E5A93C] text-[#F6D166] bg-[#DAC6AB]/40'
                      : 'border-transparent text-[#6D5A46] hover:text-stone-200'
                  }`}
                >
                  🏆 {t('tabRelics')} ({gameState.discoveredNuggets.length})
                </button>
                <button
                  onClick={() => setMuseumSubTab('techTree')}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${
                    museumSubTab === 'techTree'
                      ? 'border-amber-400 text-amber-300 bg-[#DAC6AB]/40'
                      : 'border-transparent text-[#6D5A46] hover:text-stone-200'
                  }`}
                >
                  📜 {t('tabTechTree')} ({gameState.prestigePerks.reduce((a, p) => a + p.level, 0)})
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 pb-6">
                {museumSubTab === 'relics' ? (
                  gameState.discoveredNuggets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                      <Trophy className="w-12 h-12 text-stone-600 mb-3" />
                      <h3 className="text-sm font-bold text-white mb-1">
                        {t('noRelicsTitle')}
                      </h3>
                      <p className="text-xs text-[#6D5A46] max-w-xs">
                        {t('noRelicsDesc')}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {gameState.discoveredNuggets.map((nugget, nIdx) => {
                        const nuggetText = getNuggetText(language, nIdx, nugget.name, nugget.lore);
                        return (
                          <div
                            key={nugget.id}
                            className="p-3 rounded-2xl bg-[#EADBC4] border border-[#E5A93C]/40 flex items-center gap-3 shadow-md"
                          >
                            <div className="w-16 h-16 rounded-xl bg-[#DFCFB8] border border-[#8E6221]/50 flex items-center justify-center shrink-0">
                              <ProceduralNuggetThumbnail nugget={nugget} size={54} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-[#F6D166] truncate">
                                  {nuggetText.name}
                                </h4>
                                <span className="text-[10px] font-black text-amber-300">
                                  +{nugget.certificatesAwarded} 📜
                                </span>
                              </div>
                              <div className="text-[10px] text-[#503E2C] font-mono mt-0.5">
                                {t('weight')}: {formatGrams(nugget.weightGrams)} • {nugget.discoveredAtDate}
                              </div>
                              <p className="text-[9px] text-[#6D5A46] italic mt-1 line-clamp-2">
                                "{nuggetText.lore}"
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-[#DFCFB8] border border-amber-400/40">
                      <div className="text-xs font-black text-[#6D5A46] flex items-center gap-1.5">
                        <Scroll className="w-4 h-4" />
                        <span>{t('permanentPerksTitle')}</span>
                      </div>
                      <p className="text-[10px] text-[#503E2C] mt-1">
                        {t('permanentPerksDesc')}
                      </p>
                    </div>

                    {/* Test Mode Banner */}
                    <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
                      <p className="text-[10px] text-amber-200/90 leading-tight">
                        {t('testModeBanner')}
                      </p>
                    </div>

                    {gameState.prestigePerks.map((perk) => {
                      const cost = Math.floor(perk.baseCost * Math.pow(perk.costRatio, perk.level));
                      const isMaxed = perk.level >= perk.maxLevel;
                      const canAfford = !isMaxed && gameState.prestigeTokens >= cost;
                      const perkText = getPerkText(language, perk.id, perk.name, perk.description);
                      const isPurchased = perk.level > 0;
                      const isEnabled = !perk.disabled;

                      return (
                        <div
                          key={perk.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            !isEnabled && isPurchased
                              ? 'bg-[#15100B] border-[#8E6221]/50/70 opacity-75'
                              : canAfford
                              ? 'bg-[#EADBC4] border-amber-400/60 shadow-md'
                              : 'bg-[#DFCFB8] border-[#8E6221]/60'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4
                                className={`text-xs font-bold truncate ${
                                  !isEnabled && isPurchased ? 'text-[#6D5A46] line-through' : 'text-white'
                                }`}
                              >
                                {perkText.name}
                              </h4>
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300">
                                {isMaxed ? t('perkMaxed') : `Lv. ${perk.level}/${perk.maxLevel}`}
                              </span>

                              {/* Test Toggle Switch for Researched Technologies */}
                              {isPurchased && (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePrestigePerk(perk.id)}
                                  title={t('testToggleHint')}
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black transition-all flex items-center gap-1 border shadow-sm ${
                                    isEnabled
                                      ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60'
                                      : 'bg-stone-900/90 border-rose-500/60 text-rose-300 hover:bg-stone-800'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                                    }`}
                                  />
                                  <span>{isEnabled ? t('perkEnabled') : t('perkDisabled')}</span>
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-[#6D5A46] mt-0.5">
                              {perkText.description}
                            </p>
                            {!isEnabled && isPurchased && (
                              <div className="text-[9px] font-semibold text-rose-400 mt-0.5 italic">
                                ⚠️ {t('perkDisabled')}
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {isMaxed ? (
                              <span className="px-3 py-1.5 rounded-xl bg-stone-800 text-[#8C7B68] font-black text-xs">
                                {t('perkMaxed')}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleBuyPrestigePerk(perk.id)}
                                disabled={!canAfford}
                                className={`px-3 py-1.5 rounded-xl font-black text-xs transition flex flex-col items-center shrink-0 ${
                                  canAfford
                                    ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 shadow active:scale-95'
                                    : 'bg-stone-800 text-[#8C7B68] cursor-not-allowed'
                                }`}
                              >
                                <span className="text-[8px] uppercase">{t('upgradePerk')}</span>
                                <span>{cost} 📜</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SCREEN 5: SETTINGS */}
          {currentScreen === 'settings' && (
            <div className="flex-1 min-h-0 flex flex-col bg-[#F4EBD9] overflow-hidden">
              <div className="px-4 py-3 bg-[#EADBC4] border-b border-[#8E6221]/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentScreen('mining')}
                    className="p-1.5 rounded-lg bg-[#DAC6AB] hover:bg-[#5A4130] text-[#503E2C] transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-black text-[#6D5A46] uppercase tracking-wider">
                    {t('settingsTitle')}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 pb-6">
                {/* Language Selector */}
                <div className="p-3.5 rounded-2xl bg-[#EADBC4] border border-[#E5A93C]/40 shadow-md space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-[#F6D166] border border-amber-500/20">
                      <Languages className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {t('languageTitle')}
                      </span>
                      <span className="text-[10px] text-[#6D5A46]">
                        {t('languageDesc')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {supportedLanguages.map((lang) => {
                      const isActive = language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          onClick={() => setLanguage(lang.code)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between border cursor-pointer ${
                            isActive
                              ? 'bg-[#DAC6AB] border-[#E5A93C] text-[#F6D166] shadow-sm ring-1 ring-[#E5A93C]/40'
                              : 'bg-[#DFCFB8] border-[#8E6221]/50 text-[#503E2C] hover:border-[#8E6221]/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{lang.flag}</span>
                            <div className="text-left">
                              <span className="block leading-none">{lang.nativeName}</span>
                              <span className="text-[9px] text-[#6D5A46] font-normal">{lang.name}</span>
                            </div>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-[#F6D166]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Audio SFX Settings */}
                <div className="p-3.5 rounded-2xl bg-[#EADBC4] border border-[#8E6221]/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          isMuted ? 'bg-red-950/60 text-red-400 border-red-800/60' : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                        } border`}
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {t('soundTitle')}
                        </span>
                        <span className="text-[10px] text-[#6D5A46]">
                          {isMuted ? t('soundDescMuted') : t('soundDescActive')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleMute}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                        isMuted
                          ? 'bg-[#DAC6AB] hover:bg-[#5A4130] text-[#503E2C] border border-[#8E6221]/70'
                          : 'bg-emerald-500 hover:bg-[#9C2A2A] text-white border border-[#D8B678] shadow-md'
                      }`}
                    >
                      <span>{isMuted ? t('soundMuted') : t('soundActive')}</span>
                    </button>
                  </div>
                </div>

                {/* Source Code & Display Tools */}
                <div className="p-3.5 rounded-2xl bg-[#EADBC4] border border-[#8E6221]/50 space-y-2.5">
                  <span className="text-xs font-bold text-white block">
                    {t('toolsTitle')}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowKotlinModal(true)}
                      className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#DAC6AB] hover:bg-[#5A4130] text-xs font-bold text-[#F6D166] border border-[#E5A93C]/30 transition"
                      title="Inspect Kotlin Jetpack Compose Single-File Source"
                    >
                      <Code2 className="w-4 h-4" />
                      <span>{t('kotlinSource')}</span>
                    </button>
                    <button
                      onClick={() => setDeviceFrameMode(!deviceFrameMode)}
                      className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#DAC6AB] hover:bg-[#5A4130] text-xs font-bold text-[#503E2C] border border-[#8E6221]/50 transition"
                      title="Toggle Android Device Frame Simulation"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>{deviceFrameMode ? t('frameOn') : t('frameOff')}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#EADBC4] border border-[#8E6221]/50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {t('weatherTitle')}
                      </span>
                      <span className="text-[10px] text-[#6D5A46]">
                        {t('weatherDesc')}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setGameState((prev) => ({ ...prev, weatherEnabled: !prev.weatherEnabled }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        gameState.weatherEnabled ? 'bg-emerald-500' : 'bg-stone-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          gameState.weatherEnabled ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#EADBC4] border border-[#8E6221]/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">
                      {t('baseGravelPrice')}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {formatCash(gameState.basePricePerGram)}/g
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.005"
                    max="0.20"
                    step="0.005"
                    value={gameState.basePricePerGram}
                    onChange={(e) =>
                      setGameState((prev) => ({
                        ...prev,
                        basePricePerGram: parseFloat(e.target.value)
                      }))
                    }
                    className="w-full accent-[#E5A93C] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#6D5A46] font-mono">
                    <span>{t('hardcore')}</span>
                    <span>$0.05</span>
                    <span>{t('fastTest')}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#EADBC4] border border-[#8E6221]/50 space-y-2">
                  <span className="text-xs font-bold text-white block">
                    {t('devInjections')}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setGameState((prev) => ({ ...prev, cash: prev.cash + 100 }))}
                      className="py-1.5 rounded-xl bg-[#DAC6AB] hover:bg-[#5A4130] text-xs font-bold text-emerald-400 border border-[#8E6221]/50 transition"
                    >
                      +$100
                    </button>
                    <button
                      onClick={() => setGameState((prev) => ({ ...prev, cash: prev.cash + 5000 }))}
                      className="py-1.5 rounded-xl bg-[#DAC6AB] hover:bg-[#5A4130] text-xs font-bold text-emerald-400 border border-[#8E6221]/50 transition"
                    >
                      +$5,000
                    </button>
                    <button
                      onClick={() => setGameState((prev) => ({ ...prev, prestigeTokens: prev.prestigeTokens + 50 }))}
                      className="py-1.5 rounded-xl bg-[#DAC6AB] hover:bg-[#5A4130] text-xs font-bold text-amber-300 border border-[#8E6221]/50 transition"
                    >
                      +50 📜
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  {!confirmResetting ? (
                    <button
                      onClick={handleTriggerResetSave}
                      className="w-full py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4 text-red-400" />
                      <span>{t('resetProgress')}</span>
                    </button>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-red-950/80 border-2 border-red-600 space-y-2.5 shadow-xl animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 text-xs font-black text-red-100">
                        <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{t('resetProgress')}</span>
                      </div>
                      <p className="text-[10px] text-red-200 leading-snug">
                        {t('resetConfirm')}
                      </p>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={executeResetSave}
                          className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t('confirmResetYes')}</span>
                        </button>
                        <button
                          onClick={() => setConfirmResetting(false)}
                          className="flex-1 py-2 rounded-xl bg-[#DAC6AB] hover:bg-[#5A4130] text-[#503E2C] font-bold text-xs border border-[#8E6221]/70 transition cursor-pointer"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5-SLOT BOTTOM NAVIGATION BAR - RIGIDLY DOCKED AT BOTTOM */}
        <nav className="w-full bg-[#2A1C12] border-t-2 border-[#8E6221] px-2 pt-1.5 shadow-[0_-4px_20px_rgba(42,28,18,0.7)] font-serif pb-[max(0.375rem,env(safe-area-inset-bottom))] flex justify-between items-center shrink-0 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.6)]">
          <button
            onClick={() => setCurrentScreen('upgrades')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer relative ${
              currentScreen === 'upgrades' ? 'text-[#F6D166]' : 'text-[#6D5A46] hover:text-stone-200'
            }`}
          >
            <div className="relative">
              <div
                className={`p-1.5 rounded-full transition ${
                  currentScreen === 'upgrades'
                    ? 'bg-[#F6D166]/20'
                    : gameState.claimTier === 1 && !gameState.tutorialCompleted && !gameState.tutorialDismissed && (gameState.tutorialStep === 1 || gameState.tutorialStep === 2)
                    ? 'bg-amber-400/20 ring-2 ring-amber-400 animate-pulse text-amber-300'
                    : 'bg-transparent'
                }`}
              >
                <Hammer className="w-5 h-5" />
              </div>
              {gameState.claimTier === 1 && !gameState.tutorialCompleted && !gameState.tutorialDismissed && (gameState.tutorialStep === 1 || gameState.tutorialStep === 2) && (
                <span className="absolute -top-1.5 -right-2 px-1 py-0.2 text-[8px] font-black rounded-full bg-amber-400 text-stone-950 flex items-center justify-center shadow-md animate-bounce">
                  🎓
                </span>
              )}
              {affordableCount > 0 && !(gameState.claimTier === 1 && !gameState.tutorialCompleted && !gameState.tutorialDismissed && (gameState.tutorialStep === 1 || gameState.tutorialStep === 2)) && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[17px] text-[9px] font-black rounded-full bg-[#9C2A2A] text-white border border-[#D8B678] flex items-center justify-center shadow-md animate-pulse">
                  {affordableCount > 99 ? '99+' : affordableCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold mt-0.5">{t('navUpgrades')}</span>
          </button>

          <button
            onClick={() => setCurrentScreen('missions')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer relative ${
              currentScreen === 'missions' ? 'text-emerald-400' : 'text-[#6D5A46] hover:text-stone-200'
            }`}
          >
            <div className="relative">
              <div
                className={`p-1.5 rounded-full transition ${
                  currentScreen === 'missions' ? 'bg-emerald-500/20' : 'bg-transparent'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              {claimableMissionsCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[17px] text-[9px] font-black rounded-full bg-[#9C2A2A] text-white border border-[#D8B678] flex items-center justify-center shadow-md animate-bounce">
                  {claimableMissionsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold mt-0.5">{t('navMissions')}</span>
          </button>

          <div className="flex-1 flex flex-col items-center justify-center -mt-6">
            <button
              onClick={() => setCurrentScreen('mining')}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition transform active:scale-95 cursor-pointer border-2 ${
                currentScreen === 'mining'
                  ? 'bg-gradient-to-tr from-[#C78214] via-[#E5A93C] to-[#F6D166] text-stone-950 border-white ring-4 ring-[#E5A93C]/30 scale-105'
                  : 'bg-[#382F24] hover:bg-[#4D3F30] text-[#E5A93C] border-[#E5A93C]/70'
              }`}
              title="Return to Main Mining Screen"
            >
              <Pickaxe className="w-7 h-7" />
            </button>
            <span
              className={`text-[9px] font-black tracking-wider uppercase mt-1 ${
                currentScreen === 'mining' ? 'text-[#E5A93C]' : 'text-[#6D5A46]'
              }`}
            >
              {t('navMining')}
            </span>
          </div>

          <button
            onClick={() => setCurrentScreen('museum')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
              currentScreen === 'museum' ? 'text-[#F6D166]' : 'text-[#6D5A46] hover:text-stone-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-full transition ${
                currentScreen === 'museum' ? 'bg-[#F6D166]/20' : 'bg-transparent'
              }`}
            >
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold mt-0.5">{t('navMuseum')}</span>
          </button>

          <button
            onClick={() => setCurrentScreen('settings')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
              currentScreen === 'settings' ? 'text-sky-400' : 'text-[#6D5A46] hover:text-stone-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-full transition ${
                currentScreen === 'settings' ? 'bg-sky-500/20' : 'bg-transparent'
              }`}
            >
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold mt-0.5">{t('navSettings')}</span>
          </button>
        </nav>

        {deviceFrameMode && (
          <div className="w-full bg-[#2A1C12] py-1.5 flex justify-center shrink-0">
            <div className="w-32 h-1 bg-stone-500/40 rounded-full" />
          </div>
        )}
      </main>

      {/* Nugget Discovered & Claim Rebirth Dialog */}
      {gameState.pendingNuggetDiscovery && (() => {
        const pendingNuggetText = getNuggetText(
          language,
          gameState.discoveredNuggets.length,
          gameState.pendingNuggetDiscovery.name,
          gameState.pendingNuggetDiscovery.lore
        );
        const nextClaimName = getClaimName(language, nextTierInfo.tier, nextTierInfo.name);

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#EADBC4] border-2 border-[#F6D166] rounded-3xl max-w-sm w-full p-5 text-center shadow-2xl space-y-3">
              <div className="text-xs font-black uppercase tracking-widest text-[#6D5A46]">
                🌟 {t('legendaryDiscovered')} 🌟
              </div>

              <div className="w-24 h-24 mx-auto rounded-2xl bg-[#DFCFB8] border border-[#8E6221]/50 flex items-center justify-center shadow-inner">
                <ProceduralNuggetThumbnail nugget={gameState.pendingNuggetDiscovery} size={84} />
              </div>

              <div>
                <h2 className="text-base font-black text-white">
                  {pendingNuggetText.name}
                </h2>
                <p className="text-xs font-mono text-[#E5A93C]">
                  {t('weight')}: {formatGrams(gameState.pendingNuggetDiscovery.weightGrams)}
                </p>
              </div>

              <div className="bg-[#DFCFB8] rounded-xl p-2.5 border border-amber-400/40 text-center">
                <div className="text-xs font-black text-amber-300">
                  +{gameState.pendingNuggetDiscovery.certificatesAwarded} {t('certificates')} 📜
                </div>
                <div className="text-[10px] text-[#503E2C] font-bold">
                  +{Math.round(gameState.pendingNuggetDiscovery.multiplierBonus * 100)}% {t('permanentBonus')}
                </div>
              </div>

              <div className="bg-[#24170E] rounded-xl p-2.5 border border-orange-700/60 text-left text-[10px] text-[#503E2C] space-y-1">
                <div className="font-black text-orange-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{t('rebirthAdvancing', { tier: nextTierInfo.tier })}</span>
                </div>
                <p className="text-[#503E2C] leading-tight">
                  • {t('rebirthTarget')}: <strong>{nextClaimName}</strong> ({formatGrams(nextTierInfo.capacityGrams)})<br />
                  • {t('rebirthHardness')}: <strong>x{nextTierInfo.baseHardness.toFixed(1)}</strong><br />
                  • {t('rebirthResetNote')}<br />
                  • {t('rebirthCashBonus', { bonus: formatCash(startingCashBonus) })}<br />
                  • <strong>{t('rebirthPerksKept')}</strong>
                </p>
              </div>

              <button
                onClick={handleClaimNuggetAndRebirth}
                className="w-full py-2.5 rounded-xl bg-gradient-to-b from-[#2D5A27] to-[#1E3F1A] border-2 border-[#8E6221] text-[#D8B678] shadow-lg hover:brightness-110 font-black text-xs uppercase shadow-lg hover:brightness-110 active:scale-95 transition"
              >
                {t('claimAndRebirthBtn', { tier: nextTierInfo.tier })}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Full Kotlin Source Code Modal */}
      {showKotlinModal && (
        <KotlinCodeViewer onClose={() => setShowKotlinModal(false)} />
      )}
    </div>
  );
}
