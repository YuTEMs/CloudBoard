interface WeatherLocation {
  name: string;
  lat: number;
  lng: number;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    precipitation_probability: number;
    weather_code: number;
  };
}

interface WeatherInfo {
  location: string;
  temperature: number;
  condition: string;
  precipitationProbability: number;
}

const LOCATIONS: WeatherLocation[] = [
  { name: 'Subang Jaya', lat: 3.0356, lng: 101.5819 },
  { name: 'Petaling Jaya', lat: 3.1073, lng: 101.6067 },
  { name: 'Damansara', lat: 3.1651, lng: 101.5900 }
];

// Cache for weather data
interface CachedWeatherData {
  data: WeatherInfo[];
  timestamp: number;
  locationsKey: string;
}

const weatherCache = new Map<string, CachedWeatherData>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const getWeatherCondition = (weatherCode: number): string => {
  const conditions: { [key: number]: string } = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  
  return conditions[weatherCode] || 'Unknown';
};

const fetchWeatherForLocation = async (location: WeatherLocation): Promise<WeatherInfo> => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current=temperature_2m,weather_code&hourly=precipitation_probability&timezone=Asia/Kuala_Lumpur&forecast_days=1`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Weather API error: ${response.status} - ${errorText}`);
  }

  const data: any = await response.json();

  // Get current hour precipitation probability from hourly data
  const currentHour = new Date().getHours();
  const precipitationProbability = data.hourly?.precipitation_probability?.[currentHour] || 0;

  return {
    location: location.name,
    temperature: Math.round(data.current.temperature_2m),
    condition: getWeatherCondition(data.current.weather_code),
    precipitationProbability: precipitationProbability
  };
};

// Helper function to create a cache key from locations
const createLocationsCacheKey = (locations: WeatherLocation[]): string => {
  return locations
    .map(loc => `${loc.name}-${loc.lat}-${loc.lng}`)
    .sort()
    .join('|');
};

export const fetchWeatherData = async (customLocations: WeatherLocation[]): Promise<WeatherInfo[]> => {
  const locationsToUse = customLocations;
  const cacheKey = createLocationsCacheKey(locationsToUse);
  const now = Date.now();

  // Check if we have cached data that's still valid
  const cachedData = weatherCache.get(cacheKey);
  if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
    return cachedData.data;
  }

  try {
    const weatherPromises = locationsToUse.map(location => fetchWeatherForLocation(location));
    const weatherData = await Promise.all(weatherPromises);

    // Cache the successful result
    weatherCache.set(cacheKey, {
      data: weatherData,
      timestamp: now,
      locationsKey: cacheKey
    });

    return weatherData;
  } catch (error) {
    console.error('Weather API error:', error);

    // Try to return stale cached data if available
    if (cachedData) {
      return cachedData.data;
    }

    // Last resort: return fallback data
    return locationsToUse.map(location => ({
      location: location.name,
      temperature: 25,
      condition: 'Unknown',
      precipitationProbability: 0
    }));
  }
};

export type { WeatherInfo, WeatherLocation };
export { LOCATIONS as DEFAULT_WEATHER_LOCATIONS };