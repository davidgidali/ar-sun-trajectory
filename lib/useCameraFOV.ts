import { useEffect, useState } from 'react';

const FOV_STORAGE_KEY = 'ar-camera-fov';

// Minimal device database for known iPhone FOV values
const DEVICE_FOV_MAP: Record<string, number> = {
  // iPhone SE (2020/2022) - uses iPhone 8 camera module
  'iphone se': 65,
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
 */
function detectCameraFOV(): Promise<number> {
  return new Promise((resolve) => {
    // Strategy 1: Try to get FOV from MediaStreamTrack settings
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        const track = stream.getVideoTracks()[0];
        if (track) {
          const settings = track.getSettings();
          
          // Check if FOV is directly available in settings
          if (settings.fov && typeof settings.fov === 'number') {
            track.stop();
            const fov = settings.fov;
            // Cache it
            localStorage.setItem(FOV_STORAGE_KEY, fov.toString());
            resolve(fov);
            return;
          }
          
          track.stop();
        }
        
        // Strategy 2: Device detection via User-Agent
        const userAgent = navigator.userAgent.toLowerCase();
        const detectedFOV = detectFOVFromUserAgent(userAgent);
        
        if (detectedFOV !== DEFAULT_FOV) {
          // Cache detected FOV
          localStorage.setItem(FOV_STORAGE_KEY, detectedFOV.toString());
          resolve(detectedFOV);
          return;
        }
        
        // Strategy 3: Check localStorage for cached value
        const cachedFOV = localStorage.getItem(FOV_STORAGE_KEY);
        if (cachedFOV) {
          const fov = parseFloat(cachedFOV);
          if (!isNaN(fov) && fov > 0 && fov < 180) {
            resolve(fov);
            return;
          }
        }
        
        // Strategy 4: Default fallback
        resolve(DEFAULT_FOV);
      })
      .catch(() => {
        // If camera access fails, try device detection and localStorage
        const userAgent = navigator.userAgent.toLowerCase();
        const detectedFOV = detectFOVFromUserAgent(userAgent);
        
        if (detectedFOV !== DEFAULT_FOV) {
          localStorage.setItem(FOV_STORAGE_KEY, detectedFOV.toString());
          resolve(detectedFOV);
          return;
        }
        
        const cachedFOV = localStorage.getItem(FOV_STORAGE_KEY);
        if (cachedFOV) {
          const fov = parseFloat(cachedFOV);
          if (!isNaN(fov) && fov > 0 && fov < 180) {
            resolve(fov);
            return;
          }
        }
        
        resolve(DEFAULT_FOV);
      });
  });
}

/**
 * Detect FOV from User-Agent string
 */
function detectFOVFromUserAgent(userAgent: string): number {
  // Check for iPhone models
  for (const [device, fov] of Object.entries(DEVICE_FOV_MAP)) {
    if (userAgent.includes(device)) {
      return fov;
    }
  }
  
  return DEFAULT_FOV;
}

/**
 * React hook to detect and cache device camera FOV
 * Returns the detected FOV and loading state
 */
export function useCameraFOV() {
  const [fov, setFov] = useState<number>(DEFAULT_FOV);
  const [isLoading, setIsLoading] = useState(true);

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
      .then((detectedFOV) => {
        if (!cancelled) {
          setFov(detectedFOV);
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

  return { fov, isLoading };
}

