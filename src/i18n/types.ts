export type Language = 'en' | 'ru';

export interface LanguageMeta {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' }
];

export interface TranslationDictionary {
  // Navigation
  navMining: string;
  navUpgrades: string;
  navMissions: string;
  navMuseum: string;
  navSettings: string;

  // Mining Screen HUD
  cashBalance: string;
  tier: string;
  rockHardness: string;
  remainingPaydirt: string;
  tapScoop: string;
  autoSpeed: string;
  gravelPrice: string;
  tapToScoop: string;
  tapSubtext: string;
  combo: string;
  goldRushFrenzy: string;
  frenzyActive: string;
  jamAlert: string;
  jamCleared: string;
  detectorAlert: string;
  probeLabel: string;
  availableUpgrades: string;
  viewTree: string;
  keepSifting: string;
  buy: string;
  ready: string;

  // Upgrades Screen
  upgradesTitle: string;
  purchaseMode: string;
  tabTools: string;
  tabMachines: string;
  tabMarket: string;
  tabGeology: string;
  milestoneBonus: string;
  activeBoost: string;
  machineryCapBanner: string;
  machineryCapReached: string;
  machineryCapNextMine: string;

  // Missions Screen
  missionsTitle: string;
  tabDaily: string;
  tabWeekly: string;
  tabMilestones: string;
  dailyObjectives: string;
  weeklyContracts: string;
  rerollDaily: string;
  rerollWeekly: string;
  progress: string;
  claimed: string;
  milestoneChains: string;
  completed: string;
  globalBoost: string;
  claimAllReady: string;
  allClaimed: string;
  categoryProgress: string;
  categoryUpgrades: string;
  categoryMastery: string;
  categoryMuseum: string;
  categorySecrets: string;
  maxSeal: string;
  tierCompleted: string;
  milestonesLockedTitle: string;
  milestonesLockedDesc: string;
  milestonesLockedBadge: string;
  categoryLocked: string;
  tierRequiresMine: string;

  // Museum Screen
  museumTitle: string;
  certificates: string;
  tabRelics: string;
  tabTechTree: string;
  noRelicsTitle: string;
  noRelicsDesc: string;
  weight: string;
  permanentPerksTitle: string;
  permanentPerksDesc: string;
  perkMaxed: string;
  upgradePerk: string;
  needMoreCerts: string;
  perkEnabled: string;
  perkDisabled: string;
  testToggleHint: string;
  testModeBanner: string;

  // Settings Screen
  settingsTitle: string;
  languageTitle: string;
  languageDesc: string;
  soundTitle: string;
  soundDescActive: string;
  soundDescMuted: string;
  soundMuted: string;
  soundActive: string;
  weatherTitle: string;
  weatherDesc: string;
  baseGravelPrice: string;
  hardcore: string;
  fastTest: string;
  devInjections: string;
  resetProgress: string;
  resetConfirm: string;
  confirmResetYes: string;
  cancel: string;
  toolsTitle: string;
  kotlinSource: string;
  frameOn: string;
  frameOff: string;

  // Rebirth & Nugget Modal
  legendaryDiscovered: string;
  permanentBonus: string;
  claimRebirth: string;
  rebirthAdvancing: string;
  rebirthTarget: string;
  rebirthHardness: string;
  rebirthResetNote: string;
  rebirthCashBonus: string;
  rebirthPerksKept: string;
  claimAndRebirthBtn: string;

  // Weather Names & Effects
  weatherClear: string;
  weatherClearDesc: string;
  weatherRain: string;
  weatherRainDesc: string;
  weatherDrought: string;
  weatherDroughtDesc: string;
  weatherSwell: string;
  weatherSwellDesc: string;
  weatherHeat: string;
  weatherHeatDesc: string;

  // Tutorial System (Mine 1 Onboarding & Speedup)
  tutorialHeader: string;
  tutorialStepIndicator: string;
  tutorialReward: string;
  tutorialSpeedBadge: string;
  tutorialSpeedDesc: string;
  tutorialGoToGoal: string;
  tutorialTargetBadge: string;
  tutorialSkip: string;
  tutorialHide: string;
  tutorialShow: string;
  tutorialCompleteBanner: string;
  tutStep1Title: string;
  tutStep1Desc: string;
  tutStep1Hint: string;
  tutStep2Title: string;
  tutStep2Desc: string;
  tutStep2Hint: string;
  tutStep3Title: string;
  tutStep3Desc: string;
  tutStep3Hint: string;
  tutStep4Title: string;
  tutStep4Desc: string;
  tutStep4Hint: string;
  tutStep5Title: string;
  tutStep5Desc: string;
  tutStep5Hint: string;
  tutStep6Title: string;
  tutStep6Desc: string;
  tutStep6Hint: string;
}
