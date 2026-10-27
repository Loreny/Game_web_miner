import { UpgradeItem, BuyMode } from '../types';
import { formatNumber, formatCash } from './formatters';

export function getMilestoneMultiplier(level: number): number {
  const milestoneCount = Math.floor(level / 25);
  return Math.pow(2, milestoneCount);
}

export function getMilestoneProgress(level: number): { current: number; max: number; multiplier: number } {
  const current = level % 25;
  const multiplier = getMilestoneMultiplier(level);
  return {
    current,
    max: 25,
    multiplier
  };
}

/**
 * Progressive maximum level for machinery upgrades based on current mine tier:
 * Mine 1: Lv. 15 (balances early pacing, prevents instant trivialization)
 * Mine 2: Lv. 25 (unlocks first 2x milestone at level 25)
 * Mine 3: Lv. 40
 * Mine 4: Lv. 60 (unlocks 50-level 4x milestone)
 * Mine 5: Lv. 80 (unlocks 75-level 8x milestone)
 * Mine 6: Lv. 100 (unlocks 100-level 16x milestone)
 * Mine 7+: +25 levels per tier
 */
export function getMachineryMaxLevel(claimTier: number): number {
  if (claimTier <= 1) return 15;
  if (claimTier === 2) return 25;
  if (claimTier === 3) return 40;
  if (claimTier === 4) return 60;
  if (claimTier === 5) return 80;
  if (claimTier === 6) return 100;
  return 100 + (claimTier - 6) * 25;
}

export function getNextMachineryMaxLevel(claimTier: number): number {
  return getMachineryMaxLevel(claimTier + 1);
}

/**
 * Geometric series sum: S_k = baseCost * r^level * (r^k - 1) / (r - 1)
 */
export function calculateBulkCost(baseCost: number, costRatio: number, startLevel: number, count: number): number {
  if (count <= 0) return 0;
  if (costRatio === 1) {
    return baseCost * count;
  }
  const rL = Math.pow(costRatio, startLevel);
  const factor = (Math.pow(costRatio, count) - 1) / (costRatio - 1);
  return baseCost * rL * factor;
}

/**
 * Maximum affordable levels with current cash balance
 */
export function calculateMaxLevels(baseCost: number, costRatio: number, startLevel: number, cash: number): number {
  const singleCost = baseCost * Math.pow(costRatio, startLevel);
  if (cash < singleCost) return 0;
  if (costRatio === 1) {
    return Math.max(0, Math.floor(cash / baseCost));
  }
  const rL = Math.pow(costRatio, startLevel);
  const numerator = cash * (costRatio - 1);
  const val = 1 + numerator / (baseCost * rL);
  if (val <= 0) return 1;
  const count = Math.floor(Math.log(val) / Math.log(costRatio));
  return Math.max(1, count);
}

export function getBulkPurchaseInfo(
  item: UpgradeItem,
  mode: BuyMode,
  cash: number
): { count: number; totalCost: number; canAfford: boolean; isMaxed: boolean } {
  const isMaxed = item.maxLevel !== undefined && item.level >= item.maxLevel;
  if (isMaxed) {
    return {
      count: 0,
      totalCost: 0,
      canAfford: false,
      isMaxed: true
    };
  }

  const remainingLevels = item.maxLevel !== undefined ? Math.max(0, item.maxLevel - item.level) : Infinity;
  const singleCost = item.baseCost * Math.pow(item.costRatio, item.level);

  if (mode === 'x1') {
    const count = Math.min(1, remainingLevels);
    return {
      count,
      totalCost: singleCost,
      canAfford: cash >= singleCost,
      isMaxed: false
    };
  }

  if (mode === 'x10') {
    const count = Math.min(10, remainingLevels);
    const cost10 = calculateBulkCost(item.baseCost, item.costRatio, item.level, count);
    return {
      count,
      totalCost: cost10,
      canAfford: cash >= cost10,
      isMaxed: false
    };
  }

  // MAX mode
  const affordableLevels = calculateMaxLevels(item.baseCost, item.costRatio, item.level, cash);
  const count = Math.min(affordableLevels, remainingLevels);
  if (count <= 0) {
    return {
      count: Math.min(1, remainingLevels),
      totalCost: singleCost,
      canAfford: false,
      isMaxed: false
    };
  }
  const totalCost = calculateBulkCost(item.baseCost, item.costRatio, item.level, count);
  return {
    count,
    totalCost,
    canAfford: cash >= totalCost,
    isMaxed: false
  };
}

export function getUpgradeActiveDescription(item: UpgradeItem, totalToolsLevel: number = 0): string {
  const milestone = getMilestoneMultiplier(item.level);
  const isMaxed = item.maxLevel !== undefined && item.level >= item.maxLevel;

  switch (item.id) {
    case 'tool_sieve':
    case 'tool_pneumatic_drill': {
      const active = item.level * item.powerIncrease * milestone;
      return `+${formatNumber(active)} g/tap (${milestone}x milestone)`;
    }
    case 'tool_magnetic_pan': {
      const critChance = Math.min(75, item.level * item.powerIncrease);
      return item.level > 0
        ? `${critChance.toFixed(1)}% Critical Strike (10x tap yield)${isMaxed ? ' [MAX]' : ''}`
        : `+5% Crit Chance for 10x tap yield (Max 75%)`;
    }
    case 'tool_prospector_rhythm': {
      const maxCombo = item.level > 0 ? Math.min(3.0, 1.0 + item.level * item.powerIncrease).toFixed(2) : '3.00';
      return item.level > 0
        ? `Active Tap Combo: Up to ${maxCombo}x Multiplier${isMaxed ? ' [MAX]' : ''}`
        : `Unlocks active tap combo meter up to 3.0x`;
    }
    case 'tool_diamond_pickaxe': {
      const shatterChance = Math.min(25, item.level * item.powerIncrease);
      const shatterGrams = 500 * milestone;
      return item.level > 0
        ? `${shatterChance.toFixed(0)}% chance to shatter ${formatNumber(shatterGrams)}g paydirt${isMaxed ? ' [MAX]' : ''}`
        : `+1% chance per level to shatter 500g (Max 25%)`;
    }
    case 'mach_sluice_box':
    case 'mach_water_monitor':
    case 'mach_diesel_trommel':
    case 'mach_electric_dredge':
    case 'mach_bucket_wheel':
    case 'mach_cyclone_washplant': {
      const active = item.level * item.powerIncrease * milestone;
      return `+${formatNumber(active)} g/sec (${milestone}x milestone)`;
    }
    case 'mach_bearing_grease': {
      const setsOf10 = Math.floor(totalToolsLevel / 10);
      const bonusPct = Math.min(200, item.level * setsOf10 * 1.0 * milestone);
      return item.level > 0
        ? `+${bonusPct.toFixed(0)}% Machinery Output (${setsOf10}x 10-Tool sets)${isMaxed ? ' [MAX]' : ''}`
        : `+1% Machinery per 10 tool levels purchased (Max +200%)`;
    }
    case 'market_gravel_crusher': {
      const bonusPrice = item.level * item.powerIncrease * milestone;
      return item.level > 0
        ? `+${formatCash(bonusPrice)}/g Base Gravel Price`
        : `+$0.005/g Base Gravel Price per level`;
    }
    case 'market_gold_concentrator': {
      const flakeChance = Math.min(50, item.level * item.powerIncrease);
      return item.level > 0
        ? `${flakeChance.toFixed(1)}%/s chance for raw gold flakes ($10-$100)${isMaxed ? ' [MAX]' : ''}`
        : `+2%/s chance to find raw gold flakes (Max 50%)`;
    }
    case 'market_bulk_contract': {
      const margin = Math.min(500, item.level * item.powerIncrease);
      return item.level > 0
        ? `Auto-sells every 30s with +${margin.toFixed(0)}% bonus margin${isMaxed ? ' [MAX]' : ''}`
        : `Auto-sells every 30s with +25% bonus margin (Max +500%)`;
    }
    case 'geo_probe': {
      const prec = item.level === 1 ? '±15%' : item.level === 2 ? '±10%' : item.level === 3 ? '±5%' : '±2% Pinpoint';
      return item.level > 0
        ? `Probe Active: Depth range ${prec} on HUD (Lv. ${item.level})${isMaxed ? ' [MAX]' : ''}`
        : `Reveals approximate nugget depth range on HUD (Max Lv. 4)`;
    }
    case 'geo_pulse_detector': {
      return item.level > 0
        ? `Detector Active: Gold border pulses within 15% of nugget [MAX]`
        : `Perimeter glows gold when within 15% of nugget (Max Lv. 1)`;
    }
    case 'geo_radar': {
      const stripPct = Math.min(30, item.level * item.powerIncrease);
      return item.level > 0
        ? `Radar Active: Strips ${stripPct}% topsoil on new claims${isMaxed ? ' [MAX]' : ''}`
        : `Auto-strips 10% barren topsoil on new claims (Max 30%)`;
    }
    default:
      return item.description;
  }
}
