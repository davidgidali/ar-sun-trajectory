export interface Location {
  latitude: number;
  longitude: number;
}

const LOCATION_STORAGE_KEY = 'ar-sun-location';

export async function getLocation(): Promise<Location | null> {
  // Check if localStorage is available
  if (typeof window === 'undefined' || !window.localStorage) {
    // SSR or localStorage not available, skip to geolocation
    return getLocationFromGeolocation();
  }

  // Try to get from localStorage first
  const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
  if (stored) {
    try {
      const location = JSON.parse(stored);
      if (location.latitude && location.longitude) {
        return location;
      }
    } catch (e) {
      // Invalid stored data, continue to geolocation
    }
  }

  // Try browser geolocation
  return getLocationFromGeolocation();
}

async function getLocationFromGeolocation(): Promise<Location | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        // Store for future use if localStorage is available
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
        }
        resolve(location);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

export function saveLocation(location: Location): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
  }
}

export function clearLocation(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(LOCATION_STORAGE_KEY);
  }
}

