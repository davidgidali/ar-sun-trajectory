'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import ARCamera from '@/components/ARCamera';
import ARScene from '@/components/ARScene';
import AROverlay from '@/components/AROverlay';
import LocationInput from '@/components/LocationInput';
import PermissionModal from '@/components/PermissionModal';
import { getLocation, saveLocation, type Location } from '@/lib/location';
import { calculateSunTrajectory, type SunTrajectory } from '@/lib/sunTrajectory';
import {
  createOrientationListener,
  type DeviceOrientation,
  isDeviceOrientationSupported,
} from '@/lib/orientation';
import { useCameraFOV } from '@/lib/useCameraFOV';

export default function Home() {
  const [location, setLocation] = useState<Location | null>(null);
  const [trajectory, setTrajectory] = useState<SunTrajectory | null>(null);
  const [orientation, setOrientation] = useState<DeviceOrientation | null>(null);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showMotionPermission, setShowMotionPermission] = useState(false);
  const [motionPermissionGranted, setMotionPermissionGranted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showEditorLink, setShowEditorLink] = useState(false);
  const orientationListenerRef = useRef<{ start: () => Promise<void>; stop: () => void } | null>(
    null
  );
  const { fov, deviceInfo, isLoading: fovLoading } = useCameraFOV();

  // Get screen dimensions
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Get location
  useEffect(() => {
    const fetchLocation = async () => {
      const loc = await getLocation();
      if (loc) {
        setLocation(loc);
      } else {
        setShowLocationInput(true);
      }
    };

    fetchLocation();
  }, []);

  // Calculate trajectory when location is available
  useEffect(() => {
    if (location) {
      const traj = calculateSunTrajectory(location);
      setTrajectory(traj);
    }
  }, [location]);

  // Setup device orientation listener
  useEffect(() => {
    const supported = isDeviceOrientationSupported();
    if (!supported) {
      console.warn('Device orientation not supported');
      setShowEditorLink(true);
      return;
    }

    const listener = createOrientationListener(
      (orient) => {
        setOrientation(orient);
      },
      (error) => {
        console.error('Orientation error:', error);
      }
    );

    orientationListenerRef.current = listener;

    // Check if we need to request permission
    if (typeof DeviceMotionEvent !== 'undefined') {
      const DeviceMotionEventWithPermission = DeviceMotionEvent as typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<PermissionState>;
      };
      if (DeviceMotionEventWithPermission.requestPermission) {
        setShowMotionPermission(true);
      } else {
        // Start listening immediately if permission not needed
        listener.start();
      }
    } else {
      // Start listening immediately if permission not needed
      listener.start();
    }

    return () => {
      listener.stop();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 1;
    if (!isTouchDevice || process.env.NODE_ENV !== 'production') {
      setShowEditorLink(true);
    }
  }, []);

  const handleLocationSet = (loc: Location) => {
    saveLocation(loc);
    setLocation(loc);
    setShowLocationInput(false);
  };

  const handleMotionPermissionGrant = async () => {
    setShowMotionPermission(false);
    if (orientationListenerRef.current) {
      await orientationListenerRef.current.start();
      setMotionPermissionGranted(true);
    }
  };

  const handleMotionPermissionDeny = () => {
    setShowMotionPermission(false);
    // Continue without motion tracking
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {showEditorLink && (
        <div className="absolute top-4 left-4 z-30">
          <Link
            href="/editor"
            className="rounded-md border border-white/30 bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur hover:bg-white/10"
          >
            Open Editor
          </Link>
        </div>
      )}

      {/* Debug Overlay - FOV Detection Info */}
      <div className="absolute top-4 right-4 z-30 rounded-md border border-white/30 bg-black/80 px-3 py-2 text-xs text-white backdrop-blur">
        <div className="font-semibold mb-1">Camera FOV Debug</div>
        <div className="space-y-0.5 text-white/80">
          <div>Device: {fovLoading ? 'Detecting...' : deviceInfo}</div>
          <div>FOV: {fov.toFixed(1)}°</div>
        </div>
      </div>
      {/* Camera View */}
      <ARCamera
        onStreamReady={() => {
          console.log('Camera stream ready');
        }}
        onError={(error) => {
          console.error('Camera error:', error);
        }}
      />

      {/* AR Overlay */}
      {dimensions.width > 0 && dimensions.height > 0 && (
        <>
          <ARScene
            orientation={orientation}
            trajectory={trajectory}
            width={dimensions.width}
            height={dimensions.height}
            fov={fov}
          />
          <AROverlay orientation={orientation} />
        </>
      )}

      {/* Location Input Modal */}
      {showLocationInput && (
        <LocationInput
          onLocationSet={handleLocationSet}
          onCancel={() => setShowLocationInput(false)}
        />
      )}

      {/* Motion Permission Modal */}
      {showMotionPermission && (
        <PermissionModal
          type="motion"
          onGrant={handleMotionPermissionGrant}
          onDeny={handleMotionPermissionDeny}
        />
      )}

      {/* Deployment Stats Overlay */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-2 rounded-lg text-xs z-30 font-mono">
        <div className="space-y-1">
          <p className="font-semibold">v0.1.0</p>
          <p className="text-gray-300">
            {process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 'Prod' : 
             process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ? 'Preview' : 'Dev'}
          </p>
          {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA && (
            <p className="text-gray-400 text-[10px]">
              {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.substring(0, 7)}
            </p>
          )}
          {process.env.NEXT_PUBLIC_VERCEL_URL && (
            <p className="text-gray-400 text-[10px] truncate max-w-[120px]">
              {(() => {
                try {
                  return new URL(process.env.NEXT_PUBLIC_VERCEL_URL || '').hostname;
                } catch {
                  return process.env.NEXT_PUBLIC_VERCEL_URL;
                }
              })()}
            </p>
          )}
        </div>
      </div>

      {/* Info Overlay */}
      {location && trajectory && (
        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-60 text-white p-3 rounded-lg text-sm z-20">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">Sun Trajectory</p>
              <p className="text-xs text-gray-300">
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs">
                Sunrise: {trajectory.sunrise.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-xs">
                Sunset: {trajectory.sunset.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

