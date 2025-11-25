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
export function setObjectQuaternion(quaternion, // THREE.Quaternion
alpha, beta, gamma, orient, THREE) {
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
