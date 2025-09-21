interface GeocodingLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  feature_code: string;
  country_code: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  admin4?: string;
  timezone?: string;
  population?: number;
  country?: string;
  country_id?: number;
}

interface GeocodingResponse {
  results?: GeocodingLocation[];
  generationtime_ms: number;
}

interface CachedGeocodingData {
  results: GeocodingLocation[];
  timestamp: number;
}

// Cache for geocoding search results
const geocodingCache = new Map<string, CachedGeocodingData>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Search for locations using Open-Meteo Geocoding API
 * @param query - Search term (city name, location name)
 * @param count - Number of results to return (default: 10, max: 100)
 * @returns Promise<GeocodingLocation[]> - Array of matching locations
 */
export const searchLocations = async (
  query: string,
  count: number = 10
): Promise<GeocodingLocation[]> => {
  // Don't search for very short queries
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmedQuery = query.trim();
  const cacheKey = `${trimmedQuery}-${count}`;
  const now = Date.now();

  // Check cache first
  const cachedData = geocodingCache.get(cacheKey);
  if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
    return cachedData.results;
  }

  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.append('name', trimmedQuery);
    url.searchParams.append('count', count.toString());
    url.searchParams.append('language', 'en');

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Geocoding API error: ${response.status} - ${errorText}`);
    }

    const data: GeocodingResponse = await response.json();
    const results = data.results || [];

    // Cache the successful result
    geocodingCache.set(cacheKey, {
      results,
      timestamp: now
    });

    return results;
  } catch (error) {
    console.error('Geocoding API error:', error);

    // Try to return stale cached data if available
    if (cachedData) {
      return cachedData.results;
    }

    // Return empty array on error
    return [];
  }
};

/**
 * Format a geocoding location for display in UI
 * @param location - GeocodingLocation object
 * @returns Formatted display string
 */
export const formatLocationDisplay = (location: GeocodingLocation): string => {
  const parts = [location.name];

  if (location.admin1) {
    parts.push(location.admin1);
  }

  if (location.country) {
    parts.push(location.country);
  }

  return parts.join(', ');
};

/**
 * Convert a GeocodingLocation to the LocationData format used by WeatherWidget
 * @param location - GeocodingLocation object
 * @returns LocationData object
 */
export const convertToLocationData = (location: GeocodingLocation) => {
  return {
    name: formatLocationDisplay(location),
    lat: location.latitude,
    lng: location.longitude
  };
};

export type { GeocodingLocation, GeocodingResponse };