import type * as THREEType from 'three';
import type { SunTrajectory } from './sunTrajectory';
interface ARContent {
    aboveHorizonArc: THREEType.Line;
    belowHorizonArc: THREEType.Line;
    markers: THREEType.Group;
    currentIndicator: THREEType.Mesh | null;
    horizonPlane: THREEType.Mesh;
    compass: THREEType.Group;
}
/**
 * Builds the shared AR scene content (sun arc, hourly markers, current position).
 * This helper should be edited when adding new AR visuals so both the mobile AR
 * scene and the desktop editor stay in sync.
 */
export declare function createARContent(scene: THREEType.Scene, trajectory: SunTrajectory, THREE: typeof THREEType): ARContent;
export {};
//# sourceMappingURL=createARContent.d.ts.map