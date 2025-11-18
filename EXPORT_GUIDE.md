# Export Guide: AR Components for Porting to Other Apps

This guide instructs LLM agents on how to extract the core AR rendering components from this sandbox app for use in other applications.

## Core Components to Export

### 1. Phone AR Renderer (`components/ARScene.tsx`)

**Purpose:** Main AR overlay component that renders 3D sun trajectory content over the device camera feed.

**Key Features:**
- Three.js scene with transparent background
- PerspectiveCamera with configurable FOV
- Device orientation tracking (quaternion-based rotation)
- AR content rendering (sun arcs, markers, compass, horizon)

**Dependencies:**
- `three` (Three.js library)
- `lib/createARContent.ts` (AR content creation)
- `lib/orientation.ts` (device orientation utilities)
- `lib/sunTrajectory.ts` (sun position calculations)

### 2. AR Content Creation (`lib/createARContent.ts`)

**Purpose:** Factory function that creates all AR visual elements (sun trajectory arcs, hourly markers, current position indicator, horizon plane, compass).

**Key Features:**
- Creates reusable AR content for any Three.js scene
- Generates sun trajectory visualization from trajectory data
- Returns grouped objects for easy scene management

**Dependencies:**
- `three` (Three.js library)
- `lib/sunTrajectory.ts` (for `sunPositionTo3D` function)

## Minimal Export Package

### Required Files

```
components/
  ARScene.tsx              # Main AR renderer component
lib/
  createARContent.ts      # AR content factory function
  sunTrajectory.ts        # Sun position calculations (needed by createARContent)
  orientation.ts          # Device orientation utilities (needed by ARScene)
```

### Optional but Recommended

```
lib/
  useCameraFOV.ts        # Camera FOV detection hook (for accurate AR alignment)
```

## Integration Steps

### Step 1: Copy Core Files

Copy the files listed above to your target application, maintaining the directory structure or adapting to your project's structure.

### Step 2: Install Dependencies

Ensure your target app has these dependencies:

```json
{
  "dependencies": {
    "three": "^0.160.0"
  }
}
```

### Step 3: Update Imports

Update import paths in `ARScene.tsx` to match your project structure:

```typescript
// Change from:
import { createARContent } from '@/lib/createARContent';
import { setObjectQuaternion } from '@/lib/orientation';
import type { SunTrajectory } from '@/lib/sunTrajectory';

// To your project's import style:
import { createARContent } from './lib/createARContent';
import { setObjectQuaternion } from './lib/orientation';
import type { SunTrajectory } from './lib/sunTrajectory';
```

### Step 4: Update Type Definitions

Ensure `lib/sunTrajectory.ts` exports the `SunTrajectory` type that `ARScene.tsx` expects:

```typescript
export interface SunTrajectory {
  positions: SunPosition[];
  sunrise: Date;
  sunset: Date;
  currentPosition: SunPosition | null;
}
```

### Step 5: Integrate ARScene Component

Use `ARScene` in your app:

```typescript
import ARScene from './components/ARScene';
import { calculateSunTrajectory } from './lib/sunTrajectory';

// In your component:
<ARScene
  orientation={deviceOrientation}  // DeviceOrientation | null
  trajectory={sunTrajectory}       // SunTrajectory | null
  width={screenWidth}              // number
  height={screenHeight}             // number
  fov={cameraFOV}                  // number (optional, defaults to 75)
/>
```

### Step 6: Handle Device Orientation

You'll need to provide device orientation data. The `lib/orientation.ts` file includes utilities, or you can use your own orientation tracking:

```typescript
// Example: Using the orientation utilities
import { createOrientationListener } from './lib/orientation';

const listener = createOrientationListener((orientation) => {
  setDeviceOrientation(orientation);
});

await listener.start();
```

### Step 7: Calculate Sun Trajectory

Provide sun trajectory data using `calculateSunTrajectory`:

```typescript
import { calculateSunTrajectory } from './lib/sunTrajectory';

const trajectory = calculateSunTrajectory({
  latitude: 34.18,
  longitude: -118.37
});
```

## What NOT to Export

**Do not include these files** (they're specific to this sandbox app):

- `app/page.tsx` - Next.js page component
- `app/editor/page.tsx` - Editor page
- `components/AREditor/*` - Editor-specific components
- `components/ARCamera.tsx` - Camera wrapper (use your own)
- `components/LocationInput.tsx` - Location input UI
- `components/PermissionModal.tsx` - Permission modal
- `lib/location.ts` - Location storage (use your own)
- `lib/useContainerSize.ts` - Container sizing hook (editor-specific)

## Component Props Reference

### ARScene Props

```typescript
interface ARSceneProps {
  orientation: DeviceOrientation | null;  // Device orientation (alpha, beta, gamma)
  trajectory: SunTrajectory | null;        // Sun trajectory data
  width: number;                           // Canvas width in pixels
  height: number;                          // Canvas height in pixels
  fov?: number;                            // Camera FOV in degrees (optional, default: 75)
}
```

### createARContent Function

```typescript
function createARContent(
  scene: THREE.Scene,
  trajectory: SunTrajectory,
  THREE: typeof THREE
): ARContent
```

**Returns:**
- `aboveHorizonArc`: THREE.Line - Sun arc above horizon
- `belowHorizonArc`: THREE.Line - Sun arc below horizon
- `markers`: THREE.Group - Hourly position markers
- `currentIndicator`: THREE.Mesh | null - Current sun position indicator
- `horizonPlane`: THREE.Mesh - Horizon reference plane
- `compass`: THREE.Group - Compass rose

## Testing Checklist

After integration, verify:

- [ ] ARScene renders with transparent background
- [ ] Camera feed shows through AR overlay
- [ ] Sun trajectory arcs display correctly
- [ ] Device orientation updates AR camera rotation
- [ ] Compass and markers are visible
- [ ] FOV matches device camera (if using useCameraFOV)
- [ ] No console errors related to missing dependencies

## Notes

- The ARScene component uses a transparent background (`scene.background = null`) to overlay on camera feed
- Camera position is set at human eye level (1.78m) - adjust if needed
- The component handles its own Three.js scene lifecycle (cleanup on unmount)
- Orientation updates are applied via quaternion-based rotation for smooth tracking

