import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Award, Landmark, DollarSign } from 'lucide-react';
import { GoldenNugget } from '../types';
import { formatNumber, formatGrams } from '../utils/formatters';
import { sound } from '../utils/audio';
import { ProceduralNuggetThumbnail } from './ProceduralNuggetThumbnail';

interface NuggetModalProps {
  nugget: GoldenNugget;
  onClaim: () => void;
}

export const NuggetModal: React.FC<NuggetModalProps> = ({ nugget, onClaim }) => {
  useEffect(() => {
    sound.playFanfare();
    // Trigger golden celebratory confetti burst
    const end = Date.now() + 1500;
    const colors = ['#D8B678', '#C79541', '#8E6221', '#F4EBD9', '#2D5A27'];
    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0.2, y: 0.6 },
        colors,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 0.8, y: 0.6 },
        colors,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [nugget]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 font-serif">
      {/* Ceremonial Dark Mahogany & Velvet Inner Plaque */}
      <div className="relative w-full max-w-md bg-[#1C130E] border-2 border-[#8E6221] rounded-2xl p-6 shadow-2xl text-stone-100 flex flex-col items-center ring-1 ring-[#C2AC8A]/40">
        {/* Brass corner rivets */}
        <div className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-[#B8860B] border border-[#8E6221] shadow-sm" />
        <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#B8860B] border border-[#8E6221] shadow-sm" />
        <div className="absolute bottom-2.5 left-2.5 w-2 h-2 rounded-full bg-[#B8860B] border border-[#8E6221] shadow-sm" />
        <div className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full bg-[#B8860B] border border-[#8E6221] shadow-sm" />

        {/* Shiny Procedural Golden Nugget with Glowing Halo */}
        <div className="relative mb-3 flex items-center justify-center">
          <div className="absolute inset-0 bg-radial from-[#D8B678]/30 via-[#C79541]/10 to-transparent blur-xl rounded-full scale-150" />
          <ProceduralNuggetThumbnail nugget={nugget} size={96} className="drop-shadow-2xl animate-bounce relative z-10" />
          <Sparkles className="absolute -top-2 -right-2 w-7 h-7 text-[#D8B678] animate-pulse z-20" />
        </div>

        {/* Header Ribbon */}
        <span className="text-[10px] font-bold tracking-[0.2em] text-[#D8B678] uppercase mb-1 border-b border-[#8E6221]/60 pb-0.5">
          HISTORICAL TREASURE UNEARTHED
        </span>

        {/* Relic Title & Lore */}
        <h2 className="text-2xl font-bold text-center text-[#F4EBD9] mb-1.5 leading-tight tracking-wide">
          {nugget.name}
        </h2>
        <p className="text-xs text-[#D5C7B2] text-center leading-relaxed mb-5 px-3 italic">
          "{nugget.lore}"
        </p>

        {/* Relic Stats Box (Bleached Vellum Plaque) */}
        <div className="w-full bg-[#2A1C12] rounded-xl p-3.5 border border-[#8E6221] grid grid-cols-2 gap-3 mb-4 shadow-inner">
          <div className="flex flex-col items-center text-center">
            <span className="text-[9px] uppercase font-bold tracking-wider text-[#C2AC8A]">
              Specimen Mass
            </span>
            <span className="text-base font-bold text-[#D8B678] tabular-nums">
              {formatGrams(nugget.weightGrams)}
            </span>
            <span className="text-[9px] text-[#A89883]">
              ≈ {(nugget.weightGrams / 31.1035).toFixed(2)} troy oz
            </span>
          </div>
          <div className="flex flex-col items-center text-center border-l border-[#8E6221]/60">
            <span className="text-[9px] uppercase font-bold tracking-wider text-[#C2AC8A]">
              Permanent Multiplier
            </span>
            <span className="text-base font-bold text-[#74C365] tabular-nums">
              +{(nugget.multiplierBonus * 100).toFixed(0)}%
            </span>
            <span className="text-[9px] text-[#A89883]">Assayer's Seal</span>
          </div>
        </div>

        {/* Claim Progression Notice */}
        <div className="w-full bg-[#24170E] rounded-lg p-2.5 mb-5 text-center text-xs text-[#EADBC4] border border-[#8E6221]/50 flex items-center gap-2.5">
          <Award className="w-5 h-5 text-[#D8B678] shrink-0" />
          <span className="text-left text-[11px] leading-snug">
            Advancing claim to <strong>Tier #{nugget.claimTier + 1}</strong> with{' '}
            <strong className="text-[#D8B678]">5x Paydirt Capacity</strong>. All Museum Relics & Perks are preserved permanently.
          </span>
        </div>

        {/* Dual Action Buttons: Donate to Museum vs. Sell to Assayer */}
        <div className="w-full grid grid-cols-2 gap-2.5">
          {/* Primary Action: Historical Forest Green */}
          <button
            onClick={onClaim}
            className="py-3 px-3 bg-gradient-to-b from-[#2D5A27] to-[#1E3F1A] hover:brightness-110 text-[#D8B678] font-bold rounded-lg text-xs tracking-wider border border-[#8E6221] shadow-md active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[48px]"
          >
            <Landmark className="w-4 h-4 shrink-0" />
            <span className="leading-tight">DONATE TO MUSEUM</span>
          </button>

          {/* Accent Action: Burnished Amber Gold */}
          <button
            onClick={onClaim}
            className="py-3 px-3 bg-gradient-to-b from-[#D8B678] to-[#C79541] hover:brightness-105 text-[#3C2D1D] font-bold rounded-lg text-xs tracking-wider border border-[#8E6221] shadow-md active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[48px]"
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            <span className="leading-tight">SELL TO ASSAYER</span>
          </button>
        </div>
      </div>
    </div>
  );
};
