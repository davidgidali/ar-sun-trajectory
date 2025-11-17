export interface DeviceOrientation {
  alpha: number | null; // Z-axis rotation (yaw) 0-360
  beta: number | null; // X-axis rotation (pitch) -180 to 180
  gamma: number | null; // Y-axis rotation (roll) -90 to 90
}

export interface OrientationState {
  orientation: DeviceOrientation | null;
  permissionGranted: boolean;
  permissionRequested: boolean;
  error: string | null;
}

/**
 * Request device motion permission (required on iOS 13+)
 */
export async function requestDeviceMotionPermission(): Promise<boolean> {
  if (typeof DeviceMotionEvent === 'undefined') {
    // Not iOS 13+, permission not needed
    return true;
  }

  // Type assertion for iOS-specific API
  const DeviceMotionEventWithPermission = DeviceMotionEvent as typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<PermissionState>;
  };

  if (!DeviceMotionEventWithPermission.requestPermission) {
    // Permission not needed on this device
    return true;
  }

  try {
    const permission = await DeviceMotionEventWithPermission.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting device motion permission:', error);
    return false;
  }
}

/**
 * Check if device orientation is supported
 */
export function isDeviceOrientationSupported(): boolean {
  return 'DeviceOrientationEvent' in window;
}

/**
 * Create a hook-like function to handle device orientation
 * Returns a function to start listening and a function to stop
 */
export function createOrientationListener(
  onOrientation: (orientation: DeviceOrientation) => void,
  onError?: (error: string) => void
): {
  start: () => Promise<void>;
  stop: () => void;
} {
  let isListening = false;
  let orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;

  const start = async () => {
    if (isListening) return;

    // Request permission on iOS
    const hasPermission = await requestDeviceMotionPermission();
    if (!hasPermission) {
      onError?.('Device motion permission denied');
      return;
    }

    if (!isDeviceOrientationSupported()) {
      onError?.('Device orientation not supported');
      return;
    }

    orientationHandler = (event: DeviceOrientationEvent) => {
      const orientation: DeviceOrientation = {
        alpha: event.alpha ?? null,
        beta: event.beta ?? null,
        gamma: event.gamma ?? null,
      };
      onOrientation(orientation);
    };

    window.addEventListener('deviceorientation', orientationHandler);
    isListening = true;
  };

  const stop = () => {
    if (!isListening || !orientationHandler) return;
    window.removeEventListener('deviceorientation', orientationHandler);
    orientationHandler = null;
    isListening = false;
  };

  return { start, stop };
}

/**
 * Convert device orientation to Three.js Euler angles
 * Critical: When device yaws right (alpha increases), overlay should slide LEFT (negative rotation)
 */
export function deviceOrientationToEuler(orientation: DeviceOrientation): {
  x: number;
  y: number;
  z: number;
} {
  // Convert degrees to radians
  const alpha = orientation.alpha !== null ? (orientation.alpha * Math.PI) / 180 : 0;
  const beta = orientation.beta !== null ? (orientation.beta * Math.PI) / 180 : 0;
  const gamma = orientation.gamma !== null ? (orientation.gamma * Math.PI) / 180 : 0;

  // Three.js uses Y-up coordinate system
  // Device orientation:
  // - alpha (yaw): rotation around Z-axis, 0-360
  // - beta (pitch): rotation around X-axis, -180 to 180
  // - gamma (roll): rotation around Y-axis, -90 to 90

  // For AR alignment:
  // - When device yaws right (alpha increases), overlay slides LEFT (negative Y rotation)
  // - Pitch (beta) maps to X rotation
  // - Roll (gamma) maps to Z rotation

  return {
    x: beta, // Pitch
    y: -alpha, // Yaw (negated so right yaw = left slide)
    z: gamma, // Roll
  };
}

