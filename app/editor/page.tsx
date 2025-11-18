'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ThirdPersonView from '@/components/AREditor/ThirdPersonView';
import ARCameraView from '@/components/AREditor/ARCameraView';
import type { Location } from '@/lib/location';
import { getLocation, saveLocation } from '@/lib/location';
import type { SunTrajectory } from '@/lib/sunTrajectory';
import { calculateSunTrajectory } from '@/lib/sunTrajectory';
import type { DeviceOrientation } from '@/lib/orientation';
import LocationInput from '@/components/LocationInput';
import { useContainerSize } from '@/lib/useContainerSize';

const DEFAULT_LOCATION: Location = { latitude: 34.18, longitude: -118.37 };

export default function EditorPage() {
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const [trajectory, setTrajectory] = useState<SunTrajectory | null>(null);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [simOrientation, setSimOrientation] = useState<DeviceOrientation>({
    alpha: 180, // Camera facing North (back camera points to +Z)
    beta: 90, // Device held upright
    gamma: 0, // No roll
  });
  const thirdPersonViewport = useContainerSize({ width: 800, height: 600 });
  const cameraViewport = useContainerSize({ width: 400, height: 600 });

  useEffect(() => {
    let cancelled = false;
    const fetchLocation = async () => {
      const loc = await getLocation();
      if (!cancelled) {
        const effectiveLocation = loc || DEFAULT_LOCATION;
        setLocation(effectiveLocation);
        const traj = calculateSunTrajectory(effectiveLocation);
        console.log('Editor: Trajectory calculated', {
          positionCount: traj.positions.length,
          sunrise: traj.sunrise,
          sunset: traj.sunset,
          hasCurrent: !!traj.currentPosition,
        });
        setTrajectory(traj);
      }
    };
    fetchLocation();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLocationSet = (loc: Location) => {
    saveLocation(loc);
    setLocation(loc);
    const traj = calculateSunTrajectory(loc);
    setTrajectory(traj);
    setShowLocationInput(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-400">Editor Mode</p>
          <h1 className="text-2xl font-semibold">AR Sandbox</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
          <p>
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </p>
          <button
            type="button"
            onClick={() => setShowLocationInput(true)}
            className="rounded-md border border-white/30 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
          >
            Set Location
          </button>
          <Link
            href="/"
            className="rounded-md border border-white/30 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
          >
            Back to AR
          </Link>
        </div>
      </header>

      <section className="grid gap-6 px-6 py-6 lg:grid-cols-2">
        {/* Third-person view: Scene + Device Simulator + FOV */}
        <div
          ref={thirdPersonViewport.containerRef}
          className="h-[600px] max-h-[600px] overflow-hidden rounded-lg border border-white/10 bg-black/50 p-3"
        >
          {trajectory &&
          trajectory.positions.length > 0 &&
          thirdPersonViewport.size.width > 0 &&
          thirdPersonViewport.size.height > 0 ? (
            <ThirdPersonView
              trajectory={trajectory}
              orientation={simOrientation}
              onOrientationChange={setSimOrientation}
              width={thirdPersonViewport.size.width}
              height={thirdPersonViewport.size.height}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              <p>Loading scene…</p>
            </div>
          )}
        </div>

        {/* First-person view: AR Camera */}
        <div
          ref={cameraViewport.containerRef}
          className="h-[600px] max-h-[600px] overflow-hidden rounded-lg border border-white/10 bg-black/50 p-3"
        >
          {trajectory && cameraViewport.size.width > 0 && cameraViewport.size.height > 0 ? (
            <ARCameraView
              trajectory={trajectory}
              orientation={simOrientation}
              width={cameraViewport.size.width}
              height={cameraViewport.size.height}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Loading camera preview…
            </div>
          )}
        </div>
      </section>

      {showLocationInput && (
        <LocationInput
          onLocationSet={handleLocationSet}
          onCancel={() => setShowLocationInput(false)}
        />
      )}
    </main>
  );
}


