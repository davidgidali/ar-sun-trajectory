# AR Orientation System Analysis

## Executive Summary

This document analyzes the current implementation of device orientation to AR scene transformation. Two main issues have been identified:

1. **Camera Visibility**: Camera view disappears after granting permissions (black background shows)
2. **Orientation Alignment**: AR overlay doesn't properly react to device orientation changes

### Quick Reference

**Current Implementation** (INCORRECT):
- Device alpha (yaw, 0-360°) → Three.js Y rotation (negated: `-alpha`)
- Device beta (pitch, -180 to 180°) → Three.js X rotation (`beta`)
- Device gamma (roll, -90 to 90°) → Three.js Z rotation (`gamma`)
- Euler order: `'YXZ'` ❌ **WRONG - Should be 'ZXY'**

**Correct Transformation** (per W3C spec):
- Device uses Z-X'-Y'' intrinsic Tait-Bryan angles
- Three.js should use 'ZXY' Euler order to match
- Both coordinate systems are right-handed with Y-up, Z-out (similar, not different!)
- Beta needs -90° adjustment for vertical device hold

**Key Files**:
- `lib/orientation.ts` - Device orientation capture and transformation
- `components/ARScene.tsx` - Three.js scene and camera rotation
- `components/ARCamera.tsx` - Camera video feed
- `lib/sunTrajectory.ts` - Sun position to 3D coordinate conversion

---

## Current Implementation Flow

### 1. Device Orientation Capture
**File**: `lib/orientation.ts` (lines 78-84)

- Listens to `deviceorientation` event from browser
- Captures three values:
  - **alpha** (yaw): 0-360° - rotation around device's Z-axis (out of screen)
  - **beta** (pitch): -180 to 180° - rotation around device's X-axis (right)
  - **gamma** (roll): -90 to 90° - rotation around device's Y-axis (up)

**Device Coordinate System** (W3C Standard - CORRECTED):
- X-axis: Points right (in screen plane)
- Y-axis: Points UP toward top of screen (in screen plane)
- Z-axis: Points OUT of screen (perpendicular, toward user)

**Key Insight**: Device coordinate system is actually similar to Three.js (both Y-up, Z-out), not different!

**Alpha Reference**:
- Alpha is the **opposite** of compass heading
- When alpha = 90°, device points West (compass heading = 270° = 360 - 90)
- To get compass heading: `heading = 360 - alpha`
- A device lying flat with top pointing West: `{ alpha: 90, beta: 0, gamma: 0 }`

**Event Types**:
- `deviceorientation`: May provide relative data (initial orientation = 0°)
- `deviceorientationabsolute`: Provides compass-aligned data (alpha = 0° = North)

### 2. Coordinate Transformation
**File**: `lib/orientation.ts` (lines 105-131)

**Current Implementation** (INCORRECT):
```javascript
x: beta        // Pitch → Three.js X rotation
y: -alpha      // Yaw (negated) → Three.js Y rotation  
z: gamma       // Roll → Three.js Z rotation
// Euler order: 'YXZ' ❌ WRONG
```

**Three.js Coordinate System**:
- X-axis: Right
- Y-axis: Up
- Z-axis: Toward camera (out of screen)

**Correct Transformation** (per W3C spec):
Device orientation uses **Z-X'-Y'' intrinsic Tait-Bryan angles**, which corresponds to Three.js `'ZXY'` Euler order.

**Correct Mapping**:
```javascript
// Device Z-X'-Y'' → Three.js 'ZXY'
camera.rotation.order = 'ZXY';

// Direct mapping (both systems are right-handed Y-up):
camera.rotation.set(
  THREE.MathUtils.degToRad(beta - 90),  // X rotation (pitch, -90 for vertical hold)
  THREE.MathUtils.degToRad(gamma),      // Y rotation (roll)
  THREE.MathUtils.degToRad(alpha),      // Z rotation (yaw)
  'ZXY'
);
```

**Key Points**:
- Beta needs -90° adjustment when device is held vertically (screen vertical)
- Both coordinate systems are right-handed with Y-up, so mapping is more direct
- The -90° on beta accounts for common vertical device orientation

### 3. Camera Rotation Application
**File**: `components/ARScene.tsx` (lines 119-122, 156-161)

**Current Implementation**:
```javascript
camera.rotation.set(euler.x, euler.y, euler.z, 'YXZ');
```

This rotates the Three.js camera directly based on device orientation.

### 4. Scene Rendering
**File**: `components/ARScene.tsx` (lines 26-153)

- Three.js scene is rendered to a canvas
- Canvas is overlaid on top of camera video (z-index: 10)
- Canvas has `alpha: true` (transparent background)
- Camera video is behind (z-index: default/0)

### 5. Sun Position in 3D Space
**File**: `lib/sunTrajectory.ts` (lines 87-101)

**Coordinate Conversion**:
- Azimuth (0-360°, where 0=North) → converted to radians with -180 offset
- Altitude (-90 to 90°) → converted to radians
- Spherical to Cartesian conversion:
  - x = cos(altitude) * sin(azimuth)  // East-West
  - y = sin(altitude)                 // Up-Down
  - z = cos(altitude) * cos(azimuth)  // North-South

**Scaling**: All positions multiplied by 10 for visibility

---

## Potential Issues Identified

### Issue 1: Coordinate System Description - CORRECTED
**Previous Analysis**: INCORRECT - stated device uses Z-up, Y-toward-user

**Actual W3C Specification**:
- **Device**: X-right, Y-up (toward top of screen), Z-out (toward user)
- **Three.js**: X-right, Y-up, Z-out (toward camera)

**Key Discovery**: Both coordinate systems are actually **similar** (both right-handed, Y-up, Z-out), not different!

**Correct Mapping**:
- Device alpha (Z-axis rotation) → Three.js Z rotation (not Y!)
- Device beta (X-axis rotation) → Three.js X rotation
- Device gamma (Y-axis rotation) → Three.js Y rotation (not Z!)

**Current Implementation Error**:
- Using `y: -alpha` maps alpha to Y rotation - **WRONG**
- Alpha rotates around Z-axis, should map to Z rotation
- Euler order `'YXZ'` is wrong - should be `'ZXY'` to match Z-X'-Y''

### Issue 2: Euler Angle Order - CRITICAL ERROR
**Current**: `'YXZ'` order ❌ **WRONG**

**W3C Specification**: Device orientation uses **Z-X'-Y'' intrinsic Tait-Bryan angles**

**Correct Order**: `'ZXY'` (applies rotations: Z first, then X, then Y)

**Current Implementation**:
```javascript
camera.rotation.set(euler.x, euler.y, euler.z, 'YXZ'); // WRONG ORDER
```

**Should Be**:
```javascript
camera.rotation.order = 'ZXY';
camera.rotation.set(
  THREE.MathUtils.degToRad(beta - 90),  // X rotation
  THREE.MathUtils.degToRad(gamma),      // Y rotation
  THREE.MathUtils.degToRad(alpha),      // Z rotation
  'ZXY'
);
```

**Impact**: Wrong Euler order causes incorrect rotation behavior, especially when multiple axes rotate simultaneously.

### Issue 3: Initial Camera Orientation
**File**: `components/ARScene.tsx` (line 34)

Camera is created with default orientation (looking down -Z axis).

**Potential issue**: No initial calibration or reference frame. The camera starts at (0,0,0) rotation, which may not match device's initial orientation.

### Issue 4: Camera vs Scene Rotation
**Current**: Camera is rotated, not the scene

**Implication**: Rotating the camera changes what the camera "sees". This is correct for AR, but the direction of rotation matters.

**Alternative approach**: Rotate the scene instead of camera (inverse transformation).

### Issue 5: Alpha Reference Frame - CLARIFIED
**W3C Specification**: Alpha is the **opposite** of compass heading.

**Key Facts**:
- When alpha = 90°, device points **West** (compass heading = 270° = 360 - 90)
- When alpha = 0°, device points **North** (compass heading = 360° or 0°)
- To get compass heading: `heading = 360 - alpha`

**Event Types**:
- `deviceorientation`: May provide relative data (alpha = 0° at page load orientation)
- `deviceorientationabsolute`: Provides compass-aligned data (alpha = 0° = North)

**Current Implementation**: Uses `deviceorientation` event, which may not be compass-aligned.

**Recommendation**: Consider using `deviceorientationabsolute` for compass-aligned orientation, or calculate offset from initial orientation.

### Issue 6: Missing Compass Calibration
**No compass/magnetic heading consideration**: The sun trajectory is calculated based on geographic coordinates, but device orientation might not be aligned with geographic North.

**Impact**: If device alpha is relative to magnetic North, but sun positions are relative to true North, there's a magnetic declination offset that's not accounted for.

---

## Coordinate System Reference - CORRECTED

### Device Orientation (W3C Standard)
```
      Y (up, toward top of screen)
      |
      |
      |____ X (right)
     /
    /
   Z (out of screen, toward user)
```

### Three.js Standard
```
      Y (up)
      |
      |
      |____ X (right)
     /
    /
   Z (toward camera/out of screen)
```

### Key Insight
**Both coordinate systems are similar!** Both are right-handed with:
- X: Right
- Y: Up
- Z: Out (toward user/camera)

### Correct Transformation
Device uses **Z-X'-Y'' intrinsic Tait-Bryan angles**, which maps to Three.js `'ZXY'` Euler order:

```javascript
// Device orientation → Three.js camera rotation
camera.rotation.order = 'ZXY';
camera.rotation.set(
  THREE.MathUtils.degToRad(beta - 90),  // X: pitch (with -90° vertical adjustment)
  THREE.MathUtils.degToRad(gamma),      // Y: roll
  THREE.MathUtils.degToRad(alpha),      // Z: yaw
  'ZXY'
);
```

**Mapping**:
- Device alpha (Z-axis rotation) → Three.js Z rotation
- Device beta (X-axis rotation) → Three.js X rotation (with -90° offset)
- Device gamma (Y-axis rotation) → Three.js Y rotation

---

## Debugging Checklist

1. **Verify alpha values**: Log alpha when device is pointing North vs South
2. **Test rotation direction**: Pan device right, check if overlay moves left
3. **Check Euler order**: Try different orders ('XYZ', 'ZXY', 'YXZ')
4. **Test sign**: Try positive alpha instead of negative
5. **Initial orientation**: Capture initial alpha/beta/gamma and use as offset
6. **Compass alignment**: Check if alpha = 0° corresponds to North
7. **Camera vs Scene**: Try rotating scene instead of camera (inverse transform)

---

## Camera Visibility Issue

**Symptom**: Camera view disappears after granting motion permission, replaced by black background with trajectory visible.

**File**: `components/ARScene.tsx` (lines 38-45, 164-169)

**Current Setup**:
- ARScene canvas: `zIndex: 10`, `alpha: true` (transparent background)
- ARCamera video: Default z-index (lower), behind canvas
- Canvas renderer: `alpha: true` should make background transparent

**Potential Causes**:

1. **Renderer not clearing properly**:
   - Three.js renderer might not be clearing alpha channel
   - Solution: Ensure `renderer.setClearColor(0x000000, 0)` (black, fully transparent)

2. **Canvas background color**:
   - Canvas element might have default white/black background
   - Check CSS: `background: transparent` or `background: none`

3. **Z-index layering**:
   - Canvas (z-index: 10) is above video (z-index: default/0)
   - If canvas has any opacity, it will obscure video

4. **Scene background**:
   - Three.js scene might have a background color
   - Check: `scene.background = null` or transparent

5. **Render order**:
   - Canvas might be rendering before video is ready
   - Video might be hidden by CSS or positioning

**Current Code**:
```javascript
// ARScene.tsx line 38-42
const renderer = new THREE.WebGLRenderer({
  canvas: canvasRef.current,
  alpha: true,  // Should make transparent
  antialias: true,
});
```

**Missing**: Explicit clear color set to transparent:
```javascript
renderer.setClearColor(0x000000, 0); // Black, fully transparent
```

**CSS Check**: Canvas element should have:
```css
background: transparent;
```

---

## Key Questions - ANSWERED

1. **What does alpha = 0° represent?** ✅ ANSWERED
   - For `deviceorientation`: Initial device orientation when page loaded
   - For `deviceorientationabsolute`: Magnetic North
   - Alpha is opposite of compass heading: `heading = 360 - alpha`
   - When alpha = 90°, device points West (heading = 270°)

2. **What direction should overlay move when device pans right?**
   - Overlay slides left (current expectation) ✅
   - This requires correct coordinate transformation and Euler order

3. **Is the camera or scene being rotated?**
   - Currently: Camera rotation ✅ (correct for AR)
   - Alternative: Scene rotation (inverse) - not needed if camera rotation is correct

4. **What is the initial reference frame?**
   - Use `deviceorientationabsolute` for compass-aligned data
   - Or capture initial orientation as baseline offset
   - Beta needs -90° adjustment for vertical device hold

---

## Recommended Fixes

### 1. Fix Euler Order
Change from `'YXZ'` to `'ZXY'` to match W3C Z-X'-Y'' specification.

### 2. Fix Coordinate Mapping
```javascript
// WRONG (current):
camera.rotation.set(beta, -alpha, gamma, 'YXZ');

// CORRECT:
camera.rotation.order = 'ZXY';
camera.rotation.set(
  THREE.MathUtils.degToRad(beta - 90),  // X: pitch with vertical adjustment
  THREE.MathUtils.degToRad(gamma),      // Y: roll
  THREE.MathUtils.degToRad(alpha),      // Z: yaw
  'ZXY'
);
```

### 3. Consider deviceorientationabsolute
Use `deviceorientationabsolute` event for compass-aligned orientation instead of relative `deviceorientation`.

### 4. Add Beta Adjustment
Subtract 90° from beta to account for vertical device hold (screen vertical, not flat).

## Recommended Testing Approach

1. **Log all orientation values** to console when device moves
2. **Test specific movements**:
   - Pan right (alpha should increase) → overlay should slide left
   - Tilt up (beta should change) → overlay should tilt accordingly
   - Roll device (gamma should change) → overlay should roll
3. **Verify coordinate system**: Both should be Y-up, Z-out
4. **Test Euler order**: Use 'ZXY' not 'YXZ'
5. **Test beta adjustment**: Try with and without -90° offset

---

## Summary of Critical Issues

### ❌ Current Implementation Errors

1. **Wrong Euler Order**: Using `'YXZ'` instead of `'ZXY'`
   - Device uses Z-X'-Y'' intrinsic Tait-Bryan angles
   - Must use `'ZXY'` Euler order to match

2. **Wrong Coordinate Mapping**: 
   - Currently: `alpha → Y rotation` (WRONG - alpha rotates around Z)
   - Should be: `alpha → Z rotation`, `beta → X rotation`, `gamma → Y rotation`

3. **Missing Beta Adjustment**: 
   - Need to subtract 90° from beta for vertical device hold
   - Current: `beta` → Should be: `beta - 90`

4. **Coordinate System Misunderstanding**: 
   - Previous analysis incorrectly stated device uses Z-up
   - Actually: Device uses Y-up (same as Three.js!)

### ✅ Correct Implementation

```javascript
// lib/orientation.ts - deviceOrientationToEuler function
export function deviceOrientationToEuler(orientation: DeviceOrientation): {
  x: number;  // X rotation (pitch)
  y: number;  // Y rotation (roll)
  z: number;  // Z rotation (yaw)
} {
  const alpha = orientation.alpha !== null ? (orientation.alpha * Math.PI) / 180 : 0;
  const beta = orientation.beta !== null ? ((orientation.beta - 90) * Math.PI) / 180 : 0; // -90 for vertical
  const gamma = orientation.gamma !== null ? (orientation.gamma * Math.PI) / 180 : 0;

  return {
    x: beta,   // X: pitch (with -90° adjustment)
    y: gamma,  // Y: roll
    z: alpha,  // Z: yaw (NOT negated!)
  };
}

// components/ARScene.tsx - camera rotation
camera.rotation.order = 'ZXY';  // NOT 'YXZ'!
camera.rotation.set(euler.x, euler.y, euler.z, 'ZXY');
```

### 📋 Action Items

1. Change Euler order from `'YXZ'` to `'ZXY'`
2. Fix coordinate mapping: alpha→Z, beta→X, gamma→Y
3. Add -90° adjustment to beta
4. Consider using `deviceorientationabsolute` for compass alignment
5. Fix camera visibility issue (renderer clear color)

