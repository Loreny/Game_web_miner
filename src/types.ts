export type UpgradeBranch = 'tools' | 'machinery' | 'market' | 'geology';

export type BuyMode = 'x1' | 'x10' | 'max';

export interface UpgradeItem {
  id: string;
  name: string;
  description: string;
  branch: UpgradeBranch;
  baseCost: number;
  powerIncrease: number;
  costRatio: number;
  level: number;
  maxLevel?: number;
  iconName: string;
  unitLabel: string;
}

export interface GoldenNugget {
  id: string;
  name: string;
  weightGrams: number;
  multiplierBonus: number; // e.g. 0.25 = +25%
  claimTier: number;
  lore: string;
  discoveredAtDate: string;
  certificatesAwarded: number;
}

export interface PrestigePerk {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costRatio: number;
  effectValuePerLevel: number;
  iconName: string;
  disabled?: boolean;
}

export interface FloatingParticle {
  id: number;
  text: string;
  subText: string;
  x: number;
  y: number;
  createdAt: number;
  isCrit?: boolean;
  isFlake?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardCash: number;
  unit: string;
  isClaimed: boolean;
}

export type WeatherType = 'CLEAR_SKIES' | 'HEAVY_RAIN' | 'DROUGHT' | 'RIVER_SWELL' | 'HEAT_WAVE';

export interface WeatherEvent {
  type: WeatherType;
  name: string;
  description: string;
  manualMultiplier: number;
  machineryMultiplier: number;
  gravelPriceMultiplier: number;
  durationSeconds: number;
  iconName: string;
  effectLabel?: string;
}

export type MissionType =
  | 'SIFT_DIRT'
  | 'SPEND_CASH'
  | 'BUY_UPGRADES'
  | 'MANUAL_CLICKS'
  | 'EARN_CASH'
  | 'REBIRTH_TIERS';

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  currentProgress: number;
  rewardCash: number;
  rewardCertificates: number;
  type: MissionType;
  unit: string;
  isClaimed: boolean;
}

export interface WeeklyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  currentProgress: number;
  rewardCash: number;
  rewardCertificates: number;
  type: MissionType;
  unit: string;
  isClaimed: boolean;
}

export type AchievementCategory = 'PROGRESS' | 'UPGRADES' | 'MASTERY' | 'MUSEUM' | 'SECRETS';
export type TierRank = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Secret';

export interface AchievementTier {
  tierLevel: number;
  threshold: number;
  titleSuffix: string;
  tierRank: TierRank;
  rewardCash: number;
  rewardCertificates: number;
}

export interface AchievementChain {
  id: string;
  title: string;
  descriptionFormat: string;
  category: AchievementCategory;
  unit: string;
  tiers: AchievementTier[];
  getValue: (state: GameState) => number;
}

export interface ClaimTierInfo {
  tier: number;
  name: string;
  capacityGrams: number;
  baseHardness: number;
}

export interface GameState {
  cash: number;
  remainingDirtGrams: number;
  maxDirtCapacity: number;
  claimTier: number;
  basePricePerGram: number;
  nuggetHiddenAtGrams: number;
  currentHiddenNugget: GoldenNugget;
  discoveredNuggets: GoldenNugget[];
  // Prestige System
  prestigeTokens: number; // Assayer's Certificates
  prestigePerks: PrestigePerk[];
  // 4 Upgrade Branches
  toolsUpgrades: UpgradeItem[];
  machineryUpgrades: UpgradeItem[];
  marketUpgrades: UpgradeItem[];
  geologyUpgrades: UpgradeItem[];
  achievements: Achievement[];
  claimedMilestones: Record<string, number>; // chainId -> claimed tier level count (0..maxTier)
  milestoneBaselines?: Record<string, number>; // chainId -> raw baseline when current active tier unlocked
  totalDirtSifted: number;
  totalCashEarned: number;
  totalCashSpent: number;
  totalUpgradesBought: number;
  totalManualClicks: number;
  totalCrits: number;
  totalShatters: number;
  totalFlakesFound: number;
  totalBulkDeliveries: number;
  totalWeatherCycles: number;
  highestHardnessBeaten: number;
  maxComboReached: number;
  totalRebirths: number;
  totalMissionsClaimed: number;
  pendingNuggetDiscovery: GoldenNugget | null;
  // Weather system
  weatherEnabled: boolean;
  currentWeather: WeatherEvent;
  weatherSecondsRemaining: number;
  // Daily Mission system (Expanded targets & 24h reset)
  dailyMissions: DailyMission[];
  lastDailyResetTimestamp: number;
  todayDirtSifted: number;
  todayCashSpent: number;
  todayUpgradesBought: number;
  todayManualClicks: number;
  todayCashEarned: number;
  // Weekly Mission system (7-day goals & Certificates rewards)
  weeklyMissions: WeeklyMission[];
  lastWeeklyResetTimestamp: number;
  weekDirtSifted: number;
  weekCashSpent: number;
  weekUpgradesBought: number;
  weekManualClicks: number;
  weekCashEarned: number;
  weekNuggetsFound: number;
  // Dynamic Upgrades Active States
  comboMultiplier: number;
  lastTapTimestamp: number;
  bulkDeliverySecondsRemaining: number;
  buyMode: BuyMode;
  // Tutorial System (Mine 1 Onboarding & Speedup)
  tutorialStep: number;
  tutorialCompleted: boolean;
  tutorialDismissed?: boolean;
}
