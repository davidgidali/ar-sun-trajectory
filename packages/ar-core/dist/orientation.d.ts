export interface DeviceOrientation {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
    absolute: boolean;
}
export interface OrientationState {
    orientation: DeviceOrientation | null;
    permissionGranted: boolean;
    permissionRequested: boolean;
    error: string | null;
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
export declare function setObjectQuaternion(quaternion: any, // THREE.Quaternion
alpha: number, beta: number, gamma: number, orient: number, THREE: any): void;
//# sourceMappingURL=orientation.d.ts.map