"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

/**
 * The signature element: a live interference pattern of two sine waves whose
 * difference IS the therapeutic frequency. It is the product idea rendered as
 * a drawing, and it cycles through real protocol frequencies so the number on
 * screen is never decorative.
 */

const SHOWCASE = [
  { hz: 727, label: "Universal" },
  { hz: 880, label: "Broad Spectrum" },
  { hz: 7.83, label: "Schumann" },
  { hz: 528, label: "Transformation" },
  { hz: 20, label: "Beta" },
  { hz: 2127.5, label: "Rife MOR" },
];

export function ResonanceHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % SHOWCASE.length), 3400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const { width: w, height: h } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, w, h);
      const mid = h / 2;

      // Three stacked waves: left carrier, right carrier, and their beat envelope.
      const layers = [
        { freq: 2.0, amp: h * 0.13, color: "rgba(34, 211, 238, 0.5)", width: 1.4, phase: 0 },
        { freq: 2.28, amp: h * 0.13, color: "rgba(236, 72, 153, 0.42)", width: 1.4, phase: 0.6 },
      ];

      for (const L of layers) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const p = x / w;
          const env = Math.sin(p * Math.PI) ** 0.7;
          const y = mid + Math.sin(p * Math.PI * 2 * L.freq * 3 + t * 1.1 + L.phase) * L.amp * env;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = L.color;
        ctx.lineWidth = L.width;
        ctx.stroke();
      }

      // The beat: the audible difference, drawn bright.
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const p = x / w;
        const env = Math.sin(p * Math.PI) ** 0.7;
        const a = Math.sin(p * Math.PI * 2 * 6 + t * 1.1);
        const b = Math.sin(p * Math.PI * 2 * 6.84 + t * 1.1 + 0.6);
        const y = mid + ((a + b) / 2) * h * 0.3 * env;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "rgba(34, 211, 238, 0)");
      grad.addColorStop(0.2, "rgba(103, 232, 249, 0.95)");
      grad.addColorStop(0.55, "rgba(167, 139, 250, 0.95)");
      grad.addColorStop(0.85, "rgba(236, 72, 153, 0.9)");
      grad.addColorStop(1, "rgba(236, 72, 153, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2;
      ctx.shadowBlur = 16;
      ctx.shadowColor = "rgba(34, 211, 238, 0.6)";
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (!reduce) t += 0.016;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const current = SHOWCASE[i];

  return (
    <div className="relative">
      {/* Expanding resonance rings */}
      <div className="rings h-[280px]">
        <span className="ring" />
        <span className="ring" />
        <span className="ring" />
        <span className="ring" />
      </div>

      <div className="relative flex h-[280px] flex-col items-center justify-center">
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[150px] w-full -translate-y-1/2 opacity-90"
          aria-hidden
        />

        <motion.div
          key={current.hz}
          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="t-freq grad-primary glow-cyan text-[3.5rem] leading-none sm:text-[4.5rem]">
            {current.hz.toLocaleString()}
          </div>
          <div className="t-label mt-1 opacity-80">Hertz · {current.label}</div>
        </motion.div>
      </div>
    </div>
  );
}
