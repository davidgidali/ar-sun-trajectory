import { DeviceOrientation, setObjectQuaternion } from '@starmap/ar-core';
export type { DeviceOrientation };
export { setObjectQuaternion };

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
        absolute: event.absolute ?? false,
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
