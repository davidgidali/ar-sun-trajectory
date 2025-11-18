'use client';

import { useEffect, useState, useRef } from 'react';
import ARCamera from '@/components/ARCamera';
import ARScene from '@/components/ARScene';
import LocationInput from '@/components/LocationInput';
import PermissionModal from '@/components/PermissionModal';
import { getLocation, saveLocation, type Location } from '@/lib/location';
import { calculateSunTrajectory, type SunTrajectory } from '@/lib/sunTrajectory';
import {
  createOrientationListener,
  type DeviceOrientation,
  isDeviceOrientationSupported,
} from '@/lib/orientation';

export default function Home() {
  const [location, setLocation] = useState<Location | null>(null);
  const [trajectory, setTrajectory] = useState<SunTrajectory | null>(null);
  const [orientation, setOrientation] = useState<DeviceOrientation | null>(null);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showMotionPermission, setShowMotionPermission] = useState(false);
  const [motionPermissionGranted, setMotionPermissionGranted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const orientationListenerRef = useRef<{ start: () => Promise<void>; stop: () => void } | null>(
    null
  );

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
    if (!isDeviceOrientationSupported()) {
      console.warn('Device orientation not supported');
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
      {/* Camera View */}
      <ARCamera
        onStreamReady={() => {
          console.log('Camera stream ready');
        }}
        onError={(error) => {
          console.error('Camera error:', error);
        }}
      />

      {/* AR Overlay 
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ARScene
          orientation={orientation}
          trajectory={trajectory}
          width={dimensions.width}
          height={dimensions.height}
        />
      )}*/}

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

