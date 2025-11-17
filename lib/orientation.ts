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
 * Based on W3C specification: Device uses Z-X'-Y'' intrinsic Tait-Bryan angles
 * Maps to Three.js 'ZXY' Euler order
 */
export function deviceOrientationToEuler(orientation: DeviceOrientation): {
  x: number;
  y: number;
  z: number;
} {
  // Convert degrees to radians
  // Beta needs -90° adjustment for vertical device hold (screen vertical, not flat)
  const alpha = orientation.alpha !== null ? (orientation.alpha * Math.PI) / 180 : 0;
  const beta = orientation.beta !== null ? ((orientation.beta - 90) * Math.PI) / 180 : 0;
  const gamma = orientation.gamma !== null ? (orientation.gamma * Math.PI) / 180 : 0;

  // Device orientation (W3C standard):
  // - alpha (yaw): rotation around Z-axis, 0-360° (opposite of compass heading)
  // - beta (pitch): rotation around X-axis, -180 to 180°
  // - gamma (roll): rotation around Y-axis, -90 to 90°
  //
  // Three.js coordinate system (right-handed, Y-up):
  // - X-axis: Right
  // - Y-axis: Up
  // - Z-axis: Out of screen (toward camera)
  //
  // Both systems are right-handed with Y-up, so mapping is direct:
  // - Device alpha (Z-axis rotation) → Three.js Z rotation (yaw)
  // - Device beta (X-axis rotation) → Three.js X rotation (pitch, with -90° adjustment)
  // - Device gamma (Y-axis rotation) → Three.js Y rotation (roll)

  return {
    x: beta,   // X rotation (pitch) - with -90° adjustment for vertical hold
    y: gamma,  // Y rotation (roll) - gamma rotates around Y-axis
    z: alpha,  // Z rotation (yaw) - alpha rotates around Z-axis
  };
}

