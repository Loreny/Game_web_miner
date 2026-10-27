import { GameState } from '../types';

export interface TutorialStepConfig {
  id: number;
  titleKey: 'tutStep1Title' | 'tutStep2Title' | 'tutStep3Title' | 'tutStep4Title' | 'tutStep5Title' | 'tutStep6Title';
  descKey: 'tutStep1Desc' | 'tutStep2Desc' | 'tutStep3Desc' | 'tutStep4Desc' | 'tutStep5Desc' | 'tutStep6Desc';
  hintKey: 'tutStep1Hint' | 'tutStep2Hint' | 'tutStep3Hint' | 'tutStep4Hint' | 'tutStep5Hint' | 'tutStep6Hint';
  rewardCash: number;
  targetScreen?: 'mining' | 'upgrades';
  targetBranch?: 'tools' | 'machinery';
  icon: 'pan' | 'sieve' | 'sluice' | 'rhythm' | 'radar' | 'nugget';
}

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    id: 0,
    titleKey: 'tutStep1Title',
    descKey: 'tutStep1Desc',
    hintKey: 'tutStep1Hint',
    rewardCash: 10,
    targetScreen: 'mining',
    icon: 'pan'
  },
  {
    id: 1,
    titleKey: 'tutStep2Title',
    descKey: 'tutStep2Desc',
    hintKey: 'tutStep2Hint',
    rewardCash: 25,
    targetScreen: 'upgrades',
    targetBranch: 'tools',
    icon: 'sieve'
  },
  {
    id: 2,
    titleKey: 'tutStep3Title',
    descKey: 'tutStep3Desc',
    hintKey: 'tutStep3Hint',
    rewardCash: 50,
    targetScreen: 'upgrades',
    targetBranch: 'machinery',
    icon: 'sluice'
  },
  {
    id: 3,
    titleKey: 'tutStep4Title',
    descKey: 'tutStep4Desc',
    hintKey: 'tutStep4Hint',
    rewardCash: 100,
    targetScreen: 'mining',
    icon: 'rhythm'
  },
  {
    id: 4,
    titleKey: 'tutStep5Title',
    descKey: 'tutStep5Desc',
    hintKey: 'tutStep5Hint',
    rewardCash: 200,
    targetScreen: 'mining',
    icon: 'radar'
  },
  {
    id: 5,
    titleKey: 'tutStep6Title',
    descKey: 'tutStep6Desc',
    hintKey: 'tutStep6Hint',
    rewardCash: 500,
    targetScreen: 'mining',
    icon: 'nugget'
  }
];

export function isTutorialStepCompleted(step: number, state: GameState): boolean {
  switch (step) {
    case 0:
      return state.totalManualClicks >= 5;
    case 1: {
      const sieve = state.toolsUpgrades.find((u) => u.id === 'tool_sieve');
      return (sieve?.level || 0) >= 1;
    }
    case 2: {
      const sluice = state.machineryUpgrades.find((u) => u.id === 'mach_sluice_box');
      return (sluice?.level || 0) >= 1;
    }
    case 3:
      return state.comboMultiplier >= 1.5 || state.totalManualClicks >= 18;
    case 4: {
      const washed = (state.maxDirtCapacity - state.remainingDirtGrams) / state.maxDirtCapacity;
      return washed >= 0.40;
    }
    case 5:
      return state.pendingNuggetDiscovery !== null || state.discoveredNuggets.length > 0 || state.claimTier > 1;
    default:
      return false;
  }
}
