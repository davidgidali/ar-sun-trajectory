import type { Location } from './types';
export interface SunPosition {
    azimuth: number;
    altitude: number;
    time: Date;
}
export interface SunTrajectory {
    positions: SunPosition[];
    sunrise: Date;
    sunset: Date;
    currentPosition: SunPosition | null;
}
/**
 * Calculate sun trajectory for today at the given location
 */
export declare function calculateSunTrajectory(location: Location, date?: Date): SunTrajectory;
/**
 * Convert sun position (azimuth, altitude) to 3D coordinates
 * Returns a point on a unit sphere
 */
export declare function sunPositionTo3D(position: SunPosition): {
    x: number;
    y: number;
    z: number;
};
//# sourceMappingURL=sunTrajectory.d.ts.map