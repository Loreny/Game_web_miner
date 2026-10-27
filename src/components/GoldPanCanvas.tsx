import React, { useEffect, useRef } from 'react';

interface GoldPanCanvasProps {
  isSifting: boolean;
  autoRate: number;
}

interface GoldFleck {
  angle: number;
  distanceRatio: number;
  size: number;
  speed: number;
  color: string;
}

export const GoldPanCanvas: React.FC<GoldPanCanvasProps> = ({ isSifting, autoRate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flecksRef = useRef<GoldFleck[]>([]);

  useEffect(() => {
    // 24 historical gold flecks & nuggets with amber gold tones
    const colors = ['#D8B678', '#C79541', '#FFE082', '#E5A93C', '#F6D166'];
    flecksRef.current = Array.from({ length: 24 }, () => ({
      angle: Math.random() * Math.PI * 2,
      distanceRatio: 0.15 + Math.random() * 0.65,
      size: 2 + Math.random() * 3.5,
      speed: 0.008 + Math.random() * 0.015,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let baseAngle = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const panRadius = Math.min(centerX, centerY) * 0.88;

      // 1. Subtle drafting grid behind pan
      ctx.strokeStyle = 'rgba(194, 172, 138, 0.25)';
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Outer Riverbank Basin / Sluice Frame
      const riverbedGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        panRadius * 0.7,
        centerX,
        centerY,
        panRadius * 1.08
      );
      riverbedGrad.addColorStop(0, '#423122');
      riverbedGrad.addColorStop(1, '#271D14');
      ctx.fillStyle = riverbedGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, panRadius * 1.06, 0, Math.PI * 2);
      ctx.fill();

      // 3. Pan Outer Metallic Rim (Hammered Bronze & Copper)
      const rimGrad = ctx.createRadialGradient(
        centerX - panRadius * 0.2,
        centerY - panRadius * 0.2,
        panRadius * 0.6,
        centerX,
        centerY,
        panRadius
      );
      rimGrad.addColorStop(0, '#7A583B');
      rimGrad.addColorStop(0.5, '#5A4130');
      rimGrad.addColorStop(0.9, '#382618');
      rimGrad.addColorStop(1, '#8E6221');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, panRadius, 0, Math.PI * 2);
      ctx.fill();

      // Brass outer bevel stroke
      ctx.strokeStyle = '#8E6221';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, panRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Concentric Surveyor Riffle Ridges (Hydraulic riffles)
      const riffleColors = ['#8E6221', '#735338', '#8F6746'];
      const riffleSteps = [0.80, 0.60, 0.40];
      riffleSteps.forEach((stepFrac, idx) => {
        ctx.strokeStyle = riffleColors[idx];
        ctx.lineWidth = 2.5 - idx * 0.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, panRadius * stepFrac, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 5. Water Flow Ripple & Swirl
      const swirlSpeed = isSifting ? 0.06 : autoRate > 0 ? 0.015 : 0.005;
      baseAngle += swirlSpeed;

      const waterGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        panRadius * 0.1,
        centerX,
        centerY,
        panRadius * 0.82
      );
      waterGrad.addColorStop(0, 'rgba(27, 107, 147, 0.28)');
      waterGrad.addColorStop(0.7, 'rgba(20, 60, 85, 0.45)');
      waterGrad.addColorStop(1, 'rgba(10, 35, 55, 0.65)');
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, panRadius * 0.78, 0, Math.PI * 2);
      ctx.fill();

      // 6. Gold Flecks Centrifugal Settling
      flecksRef.current.forEach((fleck) => {
        const curAngle = fleck.angle + baseAngle * fleck.speed * 60;
        const dist = panRadius * fleck.distanceRatio;
        const fx = centerX + Math.cos(curAngle) * dist;
        const fy = centerY + Math.sin(curAngle) * dist;

        // Gold fleck body
        ctx.fillStyle = fleck.color;
        ctx.beginPath();
        ctx.arc(fx, fy, fleck.size, 0, Math.PI * 2);
        ctx.fill();

        // Shimmer glint on active sifting
        if (isSifting || Math.random() < 0.1) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(fx - fleck.size * 1.5, fy);
          ctx.lineTo(fx + fleck.size * 1.5, fy);
          ctx.moveTo(fx, fy - fleck.size * 1.5);
          ctx.lineTo(fx, fy + fleck.size * 1.5);
          ctx.stroke();
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isSifting, autoRate]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={280}
      className="w-full h-full object-contain pointer-events-none"
    />
  );
};
