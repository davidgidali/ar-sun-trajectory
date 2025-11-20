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
    
    // Strategy 2: Device detection via User-Agent and screen dimensions (no camera needed)
    const userAgent = navigator.userAgent.toLowerCase();
    console.log('FOV Detection: User-Agent:', userAgent);
    console.log('FOV Detection: Screen dimensions:', window.screen.width, 'x', window.screen.height);
    const detected = detectFOVFromUserAgent(userAgent);
    
    if (detected.fov !== DEFAULT_FOV) {
      // Cache detected FOV
      localStorage.setItem(FOV_STORAGE_KEY, detected.fov.toString());
      console.log('FOV Detection: Using detected FOV:', detected.fov, 'from device:', detected.device);
      resolve(detected);
      return;
    }
    
    console.log('FOV Detection: Could not detect device, using default FOV: 75');
    
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
 * Detect FOV from User-Agent string and device characteristics
 * Returns FOV and device name
 * 
 * Note: iOS Safari User-Agent doesn't include device model, so we use
 * screen dimensions and other heuristics as fallback
 */
function detectFOVFromUserAgent(userAgent: string): { fov: number; device: string } {
  // Check for iPhone models in User-Agent (rarely works on iOS Safari)
  for (const [device, fov] of Object.entries(DEVICE_FOV_MAP)) {
    if (userAgent.includes(device)) {
      const deviceName = device.replace('iphone ', 'iPhone ').replace(/\b\w/g, l => l.toUpperCase());
      console.log('FOV Detection: Matched device from User-Agent:', deviceName, 'FOV:', fov);
      return { fov, device: deviceName };
    }
  }
  
  // iOS Safari User-Agent doesn't include model, so use screen dimensions as heuristic
  if (typeof window !== 'undefined' && userAgent.includes('iphone')) {
    const width = window.screen.width;
    const height = window.screen.height;
    const minDim = Math.min(width, height);
    const maxDim = Math.max(width, height);
    
    // iPhone SE (2020/2022) has 750x1334 or 828x1792 resolution
    // iPhone 12 Pro has 1170x2532 resolution
    // Use resolution as heuristic
    if (minDim === 750 && maxDim === 1334) {
      // iPhone SE (1st gen) or SE (2nd gen) in portrait
      console.log('FOV Detection: Detected iPhone SE from screen dimensions (750x1334), FOV: 65');
      return { fov: 65, device: 'iPhone SE (detected from screen)' };
    }
    if (minDim === 828 && maxDim === 1792) {
      // iPhone SE (2nd gen) or iPhone 11/XR in portrait
      // SE 2nd gen is more likely if it's a smaller device
      console.log('FOV Detection: Detected iPhone SE/11 from screen dimensions (828x1792), assuming SE, FOV: 65');
      return { fov: 65, device: 'iPhone SE (detected from screen)' };
    }
    if (minDim === 1170 && maxDim === 2532) {
      // iPhone 12/12 Pro/13/13 Pro in portrait
      console.log('FOV Detection: Detected iPhone 12/13 Pro from screen dimensions (1170x2532), FOV: 77');
      return { fov: 77, device: 'iPhone 12/13 Pro (detected from screen)' };
    }
    if (minDim === 1284 && maxDim === 2778) {
      // iPhone 12 Pro Max/13 Pro Max/14 Pro Max in portrait
      console.log('FOV Detection: Detected iPhone Pro Max from screen dimensions (1284x2778), FOV: 77');
      return { fov: 77, device: 'iPhone Pro Max (detected from screen)' };
    }
    
    console.log('FOV Detection: iPhone detected but unknown model, screen:', width, 'x', height, 'using default FOV: 75');
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

