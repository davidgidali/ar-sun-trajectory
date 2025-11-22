import type { DeviceOrientation } from './orientation';

export interface OrientationDelta {
  alpha?: number;
  beta?: number;
  gamma?: number;
}

const KEY_DELTA_MAP: Record<string, OrientationDelta> = {
  KeyA: { alpha: -5 },
  KeyD: { alpha: 5 },
  KeyW: { beta: -5 },
  KeyS: { beta: 5 },
  KeyQ: { gamma: -5 },
  KeyE: { gamma: 5 },
  ArrowLeft: { alpha: -1 },
  ArrowRight: { alpha: 1 },
  ArrowUp: { beta: -1 },
  ArrowDown: { beta: 1 },
};

const clampBeta = (value: number) => Math.max(-180, Math.min(180, value));
const clampGamma = (value: number) => Math.max(-90, Math.min(90, value));

const wrapAlpha = (value: number) => {
  let wrapped = value % 360;
  if (wrapped < 0) wrapped += 360;
  return wrapped;
};

export function getOrientationDeltaForKey(code: string): OrientationDelta | null {
  if (code === 'Space') {
    return { alpha: 0, beta: 0, gamma: 0 };
  }
  return KEY_DELTA_MAP[code] ?? null;
}

export function applyOrientationDelta(
  orientation: DeviceOrientation,
  delta: OrientationDelta
): DeviceOrientation {
  // Space resets orientation
  if (delta.alpha === 0 && delta.beta === 0 && delta.gamma === 0) {
    return { alpha: 0, beta: 0, gamma: 0, absolute: orientation.absolute };
  }

  const alpha = wrapAlpha((orientation.alpha ?? 0) + (delta.alpha ?? 0));
  const beta = clampBeta((orientation.beta ?? 0) + (delta.beta ?? 0));
  const gamma = clampGamma((orientation.gamma ?? 0) + (delta.gamma ?? 0));

  return { alpha, beta, gamma, absolute: orientation.absolute };
}


