// src/ui/BasisHUD.tsx

import React, { useEffect, useRef, useState } from 'react';
import { history, redundantLabels } from '../engine';
import { HUD_DIMENSIONS as DIM, getHUDContainerStyle, HUD_THEME as THEME } from './config';
import { parseLabel } from '../core/label';

export const BasisHUD: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isExpanded) return;

    let isMounted = true;
    let animationFrame: number | null = null;

    const draw = () => {
      if (!isMounted) {
        if (animationFrame !== null) {
          cancelAnimationFrame(animationFrame);
        }
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const entries = Array.from(history.entries()).sort((a, b) => {
        const roleOrder = (role: string) => {
          if (role === 'context') return 0;
          if (role === 'store') return 1;
          return 2;
        };
        return roleOrder(a[1].role) - roleOrder(b[1].role);
      });
      const dpr = window.devicePixelRatio || 1;
      const rawWidth = DIM.WINDOW_SIZE * DIM.COL_WIDTH + DIM.LABEL_WIDTH + DIM.PADDING * 2;
      const rawHeight = Math.max(entries.length * DIM.ROW_HEIGHT + DIM.PADDING * 2, 80);

      updateCanvasSize(canvas, rawWidth, rawHeight, dpr);
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rawWidth, rawHeight);

      if (entries.length === 0) renderEmptyState(ctx);
      else renderMatrix(ctx, entries);

      ctx.restore();
      animationFrame = requestAnimationFrame(draw);
    };

    // Kick off the animation loop
    animationFrame = requestAnimationFrame(draw);

    return () => {
      isMounted = false;
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isExpanded]);

  return (
    <div style={getHUDContainerStyle(isExpanded)} onClick={() => setIsExpanded(!isExpanded)}>
      <HUDHeader isExpanded={isExpanded} />
      {isExpanded && (
        <div style={{ padding: '10px 14px 15px 14px' }}>
          <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
      )}
    </div>
  );
};

function updateCanvasSize(canvas: HTMLCanvasElement, w: number, h: number, dpr: number) {
  const targetW = Math.floor(w * dpr);
  const targetH = Math.floor(h * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
}

function renderEmptyState(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = THEME.textDim;
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('Waiting for state transitions...', DIM.PADDING, 30);
}

function renderMatrix(ctx: CanvasRenderingContext2D, entries: [string, any][]) {
  const L = DIM.WINDOW_SIZE;
  const colW = DIM.COL_WIDTH;
  const rowH = DIM.ROW_HEIGHT;
  const pad = DIM.PADDING;
  const cellW = colW - 1.5;
  const cellH = rowH - 4;

  const gridPath = new Path2D();
  const successPath = new Path2D();
  const contextPath = new Path2D();
  const errorPath = new Path2D();

  ctx.font = "11px Inter, Menlo, monospace";

  let rowIndex = 0;
  for (const [label, meta] of entries) {
    const y = rowIndex * rowH + pad;
    const isContext = meta.role === 'context' || meta.role === 'store';
    const isRedundant = !isContext && redundantLabels.has(label);

    const { buffer, head } = meta;
    let uiPos = 0;

    const addToPath = (val: number, xIdx: number) => {
      const x = xIdx * colW + pad;
      if (val === 1) {
        if (isContext) contextPath.rect(x, y, cellW, cellH);
        else if (isRedundant) errorPath.rect(x, y, cellW, cellH);
        else successPath.rect(x, y, cellW, cellH);
      } else {
        gridPath.rect(x, y, cellW, cellH);
      }
    };

    for (let i = head; i < L; i++) addToPath(buffer[i], uiPos++);
    for (let i = 0; i < head; i++) addToPath(buffer[i], uiPos++);

    const stateName = parseLabel(label).name;
    const textX = (L * colW) + pad + 10;

    ctx.fillStyle = isContext ? THEME.header : (isRedundant ? THEME.error : THEME.text);
    const prefix = meta.role === 'store' ? "Σ " : isContext ? "Ω " : isRedundant ? "! " : "";
    ctx.fillText(prefix + stateName, textX, y + 9);

    rowIndex++;
  }

  ctx.fillStyle = THEME.grid; ctx.fill(gridPath);
  ctx.fillStyle = THEME.success; ctx.fill(successPath);
  ctx.fillStyle = THEME.header; ctx.fill(contextPath);
  ctx.fillStyle = THEME.error; ctx.fill(errorPath);
}

const HUDHeader: React.FC<{ isExpanded: boolean }> = ({ isExpanded }) => (
  <div
    style={{
      padding: '10px 14px',
      backgroundColor: isExpanded ? THEME.header : 'transparent',
      color: isExpanded ? 'white' : THEME.header,
      fontWeight: 600,
      fontSize: '11px',
      letterSpacing: '0.05em',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'background 0.3s',
    }}
  >
    <span>{isExpanded ? 'STATE BASIS MATRIX' : '📐 BASIS ACTIVE'}</span>
    {isExpanded && <span style={{ opacity: 0.8, fontSize: '9px' }}>v0.6.x</span>}
  </div>
);