import React, { useEffect, useRef } from 'react';
import { GoldenNugget } from '../types';

interface ProceduralNuggetThumbnailProps {
  nugget: GoldenNugget;
  size?: number; // size in px
  className?: string;
}

// Pseudo-random number generator with seed
function createPseudoRandom(seed: number) {
  let s = Math.abs(seed);
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export const ProceduralNuggetThumbnail: React.FC<ProceduralNuggetThumbnailProps> = ({
  nugget,
  size = 56,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // String hash code to seed random geometry
    let hash = 0;
    for (let i = 0; i < nugget.id.length; i++) {
      hash = (hash << 5) - hash + nugget.id.charCodeAt(i);
      hash |= 0;
    }
    const rand = createPseudoRandom(hash);

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const baseRadius = Math.min(centerX, centerY) * 0.78;

    // Pick metallic tone based on tier
    const tierMod = ((nugget.claimTier || 1) - 1) % 3;
    let colorStops: [string, string, string];
    if (tierMod === 0) {
      colorStops = ['#FFF1A8', '#E5A93C', '#785434']; // 24K Classic Gold
    } else if (tierMod === 1) {
      colorStops = ['#FFE0D0', '#D49B80', '#5E3D2F']; // Rose Gold
    } else {
      colorStops = ['#FFDF73', '#B8860B', '#3E2723']; // Antique Bronze Gold
    }

    // Generate irregular polygon vertices
    const pointCount = 9;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < pointCount; i++) {
      const angle = i * ((Math.PI * 2) / pointCount);
      const jitter = 0.68 + rand() * 0.42;
      const r = baseRadius * jitter;
      points.push({
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
      });
    }

    // Draw organic smooth path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length; i++) {
      const curr = points[i];
      const next = points[(i + 1) % points.length];
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;
      ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
    }
    ctx.closePath();

    // Metallic radial gradient
    const grad = ctx.createRadialGradient(
      centerX - baseRadius * 0.28,
      centerY - baseRadius * 0.28,
      baseRadius * 0.1,
      centerX,
      centerY,
      baseRadius * 1.2
    );
    grad.addColorStop(0, colorStops[0]);
    grad.addColorStop(0.5, colorStops[1]);
    grad.addColorStop(1, colorStops[2]);

    ctx.fillStyle = grad;
    ctx.fill();

    // Mineral contour outline
    ctx.strokeStyle = 'rgba(62, 39, 35, 0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Natural vein accents
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(centerX - baseRadius * 0.25, centerY - baseRadius * 0.2, baseRadius * 0.35, 0, Math.PI * 0.8);
    ctx.stroke();

    // Specular highlight gleam
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.arc(
      centerX - baseRadius * 0.28,
      centerY - baseRadius * 0.28,
      baseRadius * 0.16,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }, [nugget, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size * 2}
      height={size * 2}
      style={{ width: size, height: size }}
      className={`rounded-xl object-contain drop-shadow-md select-none ${className}`}
    />
  );
};
