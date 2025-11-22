// @ts-ignore - suncalc doesn't have TypeScript definitions
import * as SunCalc from 'suncalc';
import type { Location } from './types';

export interface SunPosition {
  azimuth: number; // 0-360 degrees, 0 = North, 90 = East, 180 = South, 270 = West
  altitude: number; // -90 to 90 degrees, negative = below horizon
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
export function calculateSunTrajectory(location: Location, date: Date = new Date()): SunTrajectory {
  const { latitude, longitude } = location;

  // Get sunrise and sunset times
  const times = SunCalc.getTimes(date, latitude, longitude);
  const sunrise = times.sunrise;
  const sunset = times.sunset;

  // Calculate hourly positions for full 24-hour cycle (360° arc)
  const positions: SunPosition[] = [];

  // Generate position for each hour (0-23)
  for (let hour = 0; hour < 24; hour++) {
    const time = new Date(date);
    time.setHours(hour, 0, 0, 0);

    const position = SunCalc.getPosition(time, latitude, longitude);
    positions.push({
      azimuth: position.azimuth * (180 / Math.PI) + 180, // Convert to degrees and adjust (0 = North)
      altitude: position.altitude * (180 / Math.PI), // Convert to degrees
      time,
    });
  }

  // Calculate current position
  const now = new Date();
  let currentPosition: SunPosition | null = null;
  if (now >= sunrise && now <= sunset) {
    const currentPos = SunCalc.getPosition(now, latitude, longitude);
    currentPosition = {
      azimuth: currentPos.azimuth * (180 / Math.PI) + 180,
      altitude: currentPos.altitude * (180 / Math.PI),
      time: now,
    };
  }

  return {
    positions,
    sunrise,
    sunset,
    currentPosition,
  };
}

/**
 * Convert sun position (azimuth, altitude) to 3D coordinates
 * Returns a point on a unit sphere
 */
export function sunPositionTo3D(position: SunPosition): { x: number; y: number; z: number } {
  // Convert azimuth and altitude to radians
  const azimuthRad = ((position.azimuth - 180) * Math.PI) / 180; // Adjust so 0 = South (typical for AR)
  const altitudeRad = (position.altitude * Math.PI) / 180;

  // Convert spherical coordinates to Cartesian
  // x: East-West (positive = East)
  // y: Up-Down (positive = Up)
  // z: North-South (positive = North)
  const x = Math.cos(altitudeRad) * Math.sin(azimuthRad);
  const y = Math.sin(altitudeRad);
  const z = Math.cos(altitudeRad) * Math.cos(azimuthRad);

  return { x, y, z };
}

