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

    // Prefer deviceorientationabsolute for compass-aligned data
    // Fallback to deviceorientation if absolute is not available
    const win = window as any;
    if ('ondeviceorientationabsolute' in window) {
      win.addEventListener('deviceorientationabsolute', orientationHandler);
    } else {
      win.addEventListener('deviceorientation', orientationHandler);
    }
    isListening = true;
  };

  const stop = () => {
    if (!isListening || !orientationHandler) return;
    // Remove both event types to be safe
    const win = window as any;
    win.removeEventListener('deviceorientationabsolute', orientationHandler);
    win.removeEventListener('deviceorientation', orientationHandler);
    orientationHandler = null;
    isListening = false;
  };

  return { start, stop };
}

/**
 * Get screen orientation angle in degrees
 * Handles both window.orientation (legacy) and screen.orientation (modern)
 * Returns degrees (will be converted to radians in calling code)
 */
export function getScreenOrientation(): number {
  if (typeof window !== 'undefined') {
    // Modern API
    if (screen.orientation && screen.orientation.angle !== undefined) {
      return screen.orientation.angle;
    }
    // Legacy API
    if (window.orientation !== undefined) {
      return window.orientation;
    }
  }
  return 0;
}

/**
 * Set object quaternion from device orientation
 * Based on official Three.js DeviceOrientationControls implementation
 * Uses quaternion-based rotation with proper angle mapping and adjustments
 * 
 * @param quaternion - Three.js Quaternion object to modify
 * @param alpha - Device yaw angle in radians (0-2π)
 * @param beta - Device pitch angle in radians (-π to π)
 * @param gamma - Device roll angle in radians (-π/2 to π/2)
 * @param orient - Screen orientation angle in radians
 * @param THREE - Three.js library (passed from component to avoid import issues)
 */
export function setObjectQuaternion(
  quaternion: any, // THREE.Quaternion
  alpha: number,
  beta: number,
  gamma: number,
  orient: number,
  THREE: any
): void {
  // Create reusable objects (following Three.js pattern)
  const zee = new THREE.Vector3(0, 0, 1);
  const euler = new THREE.Euler();
  const q0 = new THREE.Quaternion();
  // -90° rotation around X-axis (replaces beta - 90° adjustment)
  const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

  // Official Three.js pattern:
  // Map: beta→X, alpha→Y, -gamma→Z (note: gamma is negated)
  // Use 'YXZ' Euler order (NOT 'ZXY')
  euler.set(beta, alpha, -gamma, 'YXZ');

  // Convert Euler to quaternion
  quaternion.setFromEuler(euler);

  // Apply -90° X-axis rotation (handles vertical device hold)
  quaternion.multiply(q1);

  // Adjust for screen orientation (portrait/landscape)
  quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
}

