import { useEffect, useState } from 'react';

const FOV_STORAGE_KEY = 'ar-camera-fov';

// Minimal device database for known iPhone FOV values
const DEVICE_FOV_MAP: Record<string, number> = {
  // iPhone SE (2020/2022) - uses iPhone 8 camera module
  'iphone se': 65,
  'iphone se (2nd generation)': 65,
  'iphone se 2020': 65,
  'iphone se 2022': 65,
  // iPhone 11 Pro - wide camera
  'iphone 11 pro': 77,
  'iphone 11 pro max': 77,
  // iPhone 12 series - wide camera
  'iphone 12': 77,
  'iphone 12 mini': 77,
  'iphone 12 pro': 77,
  'iphone 12 pro max': 77,
  // iPhone 13 series - wide camera
  'iphone 13': 77,
  'iphone 13 mini': 77,
  'iphone 13 pro': 77,
  'iphone 13 pro max': 77,
  // iPhone 14 series - wide camera
  'iphone 14': 77,
  'iphone 14 plus': 77,
  'iphone 14 pro': 77,
  'iphone 14 pro max': 77,
  // iPhone 15 series - main camera
  'iphone 15': 77,
  'iphone 15 plus': 77,
  'iphone 15 pro': 77,
  'iphone 15 pro max': 77,
};

const DEFAULT_FOV = 75;

/**
 * Detect device camera FOV using multiple fallback strategies
 * Returns FOV and device info
 * Reordered to avoid camera stream request when possible
 */
function detectCameraFOV(): Promise<{ fov: number; device: string }> {
  return new Promise((resolve) => {
    // Strategy 1: Check localStorage for cached value (fastest, no camera needed)
    const cachedFOV = localStorage.getItem(FOV_STORAGE_KEY);
    if (cachedFOV) {
      const fov = parseFloat(cachedFOV);
      if (!isNaN(fov) && fov > 0 && fov < 180) {
        resolve({ fov, device: 'Cached value' });
        return;
      }
    }
    
    // Strategy 2: Device detection via User-Agent (no camera needed)
    const userAgent = navigator.userAgent.toLowerCase();
    const detected = detectFOVFromUserAgent(userAgent);
    
    if (detected.fov !== DEFAULT_FOV) {
      // Cache detected FOV
      localStorage.setItem(FOV_STORAGE_KEY, detected.fov.toString());
      resolve(detected);
      return;
    }
    
    // Strategy 3: Try to get FOV from MediaStreamTrack settings (only as last resort)
    // This requires camera access which may conflict with ARCamera component
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        const track = stream.getVideoTracks()[0];
        if (track) {
          const settings = track.getSettings();
          
          // Check if FOV is directly available in settings (not in standard types, but may be available)
          const fovValue = (settings as any).fov;
          if (fovValue && typeof fovValue === 'number') {
            track.stop();
            // Cache it
            localStorage.setItem(FOV_STORAGE_KEY, fovValue.toString());
            resolve({ fov: fovValue, device: 'Detected from camera settings' });
            return;
          }
          
          track.stop();
        }
        
        // If camera doesn't provide FOV, use default
        resolve({ fov: DEFAULT_FOV, device: 'Default (75°)' });
      })
      .catch(() => {
        // If camera access fails, use default
        resolve({ fov: DEFAULT_FOV, device: 'Default (75°)' });
      });
  });
}

/**
 * Detect FOV from User-Agent string
 * Returns FOV and device name
 */
function detectFOVFromUserAgent(userAgent: string): { fov: number; device: string } {
  // Check for iPhone models
  for (const [device, fov] of Object.entries(DEVICE_FOV_MAP)) {
    if (userAgent.includes(device)) {
      return { fov, device: device.replace('iphone ', 'iPhone ').replace(/\b\w/g, l => l.toUpperCase()) };
    }
  }
  
  return { fov: DEFAULT_FOV, device: 'Unknown' };
}

/**
 * React hook to detect and cache device camera FOV
 * Returns the detected FOV, device info, and loading state
 */
export function useCameraFOV() {
  const [fov, setFov] = useState<number>(DEFAULT_FOV);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<string>('Unknown');

  useEffect(() => {
    let cancelled = false;

    // Check localStorage first for immediate result
    const cachedFOV = localStorage.getItem(FOV_STORAGE_KEY);
    if (cachedFOV) {
      const cached = parseFloat(cachedFOV);
      if (!isNaN(cached) && cached > 0 && cached < 180) {
        setFov(cached);
        setIsLoading(false);
        // Still try to detect in background to update if needed
      }
    }

    // Detect FOV (may take a moment if camera permission needed)
    detectCameraFOV()
      .then((result) => {
        if (!cancelled) {
          setFov(result.fov);
          setDeviceInfo(result.device);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { fov, isLoading, deviceInfo };
}

