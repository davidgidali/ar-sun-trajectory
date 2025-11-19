'use client';

import type { DeviceOrientation } from '@/lib/orientation';

interface AROverlayProps {
  orientation: DeviceOrientation | null;
  initialAlpha?: number | null;
}

export default function AROverlay({ orientation, initialAlpha }: AROverlayProps) {
  // Extract orientation values with null checks
  const alpha = orientation?.alpha ?? null;
  const beta = orientation?.beta ?? null;
  const gamma = orientation?.gamma ?? null;

  // Calculate pitch relative to 90 degrees
  const pitch = beta !== null ? (beta - 90).toFixed(1) : '--';
  const pitchValue = beta !== null ? beta - 90 : 0;

  // Calculate compass heading with north offset applied
  const compass = alpha !== null && initialAlpha !== null
    ? (((alpha - initialAlpha) + 360) % 360).toFixed(0)
    : (alpha?.toFixed(0) ?? '--');

  // Counter-rotation for crosshair (opposite of device roll)
  const crosshairRotation = gamma !== null ? -gamma : 0;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
      {/* Crosshair - Centered */}
      <div
        className="absolute"
        style={{
          transform: `rotate(${crosshairRotation}deg)`,
        }}
      >
        <div className="relative w-8 h-8">
          {/* Horizontal line */}
          <div className="absolute top-1/2 left-0 w-8 h-px bg-white/80 -translate-y-1/2" />
          {/* Vertical line */}
          <div className="absolute left-1/2 top-0 w-px h-8 bg-white/80 -translate-x-1/2" />
        </div>
      </div>

      {/* Orientation Readouts - Positioned to the right of crosshair */}
      <div className="absolute left-1/2 top-1/2 ml-16 -translate-y-1/2 space-y-2">
        {/* Pitch Readout */}
        <div className="rounded-md border border-white/30 bg-black/80 px-3 py-1.5 text-sm text-white backdrop-blur">
          <div className="text-xs text-white/60 mb-0.5">Pitch</div>
          <div className="font-mono font-semibold">
            {pitchValue >= 0 ? '+' : ''}
            {pitch}°
          </div>
        </div>

        {/* Compass Readout */}
        <div className="rounded-md border border-white/30 bg-black/80 px-3 py-1.5 text-sm text-white backdrop-blur">
          <div className="text-xs text-white/60 mb-0.5">Compass</div>
          <div className="font-mono font-semibold">{compass}°</div>
        </div>
      </div>
    </div>
  );
}

