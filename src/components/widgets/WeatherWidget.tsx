'use client'

import React, { useState, useEffect, memo } from 'react'
import { BaseWidget } from './BaseWidget'
import { WidgetProps, LocationData } from './types'
import { fetchWeatherData, WeatherInfo } from '../../lib/weather-api'

const getWeatherEmoji = (condition: string): string => {
  const conditionLower = condition.toLowerCase()
  
  if (conditionLower.includes('clear') || conditionLower.includes('sunny')) return '☀️'
  if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) return '☁️'
  if (conditionLower.includes('partly')) return '⛅'
  if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) return '🌧️'
  if (conditionLower.includes('thunderstorm') || conditionLower.includes('storm')) return '⛈️'
  if (conditionLower.includes('snow')) return '🌨️'
  if (conditionLower.includes('fog')) return '🌫️'
  if (conditionLower.includes('hail')) return '🌨️'
  
  return '🌤️'
}

const getWeatherColors = (condition: string, hour: number): string => {
  const conditionLower = condition.toLowerCase()
  const isNight = hour < 6 || hour >= 18
  const isMorning = hour >= 6 && hour < 12
  const isAfternoon = hour >= 12 && hour < 18
  
  // Rain/Storm conditions - darker blues
  if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
    if (isNight) return 'bg-gradient-to-br from-slate-800 to-blue-900 text-white'
    if (isMorning) return 'bg-gradient-to-br from-blue-600 to-blue-800 text-white'
    return 'bg-gradient-to-br from-blue-700 to-blue-900 text-white'
  }
  
  if (conditionLower.includes('thunderstorm') || conditionLower.includes('storm')) {
    return 'bg-gradient-to-br from-gray-800 to-slate-900 text-white'
  }
  
  // Cloudy conditions
  if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) {
    if (isNight) return 'bg-gradient-to-br from-slate-700 to-blue-800 text-white'
    if (isMorning) return 'bg-gradient-to-br from-gray-400 to-blue-600 text-white'
    return 'bg-gradient-to-br from-gray-500 to-blue-700 text-white'
  }
  
  // Fog
  if (conditionLower.includes('fog')) {
    if (isNight) return 'bg-gradient-to-br from-gray-700 to-gray-800 text-white'
    return 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800'
  }
  
  // Clear/Sunny conditions
  if (conditionLower.includes('clear') || conditionLower.includes('sunny')) {
    if (isNight) return 'bg-gradient-to-br from-indigo-900 to-purple-900 text-white'
    if (isMorning) return 'bg-gradient-to-br from-orange-300 to-blue-400 text-white'
    return 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
  }
  
  // Partly cloudy
  if (conditionLower.includes('partly')) {
    if (isNight) return 'bg-gradient-to-br from-indigo-800 to-blue-900 text-white'
    if (isMorning) return 'bg-gradient-to-br from-blue-300 to-blue-500 text-white'
    return 'bg-gradient-to-br from-blue-400 to-blue-600 text-white'
  }
  
  // Default based on time of day
  if (isNight) return 'bg-gradient-to-br from-indigo-900 to-blue-900 text-white'
  if (isMorning) return 'bg-gradient-to-br from-blue-300 to-blue-500 text-white'
  return 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
}

const WeatherWidget: React.FC<WidgetProps> = memo(function WeatherWidget(props) {
  const { width, height, item } = props
  const [weatherData, setWeatherData] = useState<WeatherInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0)

  // Get locations from the item prop and filter out empty ones
  const locations = (item?.locations || []).filter((location: LocationData) => {
    return location.name && location.name.trim() &&
      location.lat !== '' && location.lng !== '' &&
      !isNaN(Number(location.lat)) && !isNaN(Number(location.lng)) &&
      Number(location.lat) !== 0 && Number(location.lng) !== 0;
  }).map((location: LocationData) => ({
    ...location,
    lat: Number(location.lat),
    lng: Number(location.lng)
  }))

  useEffect(() => {
    const loadWeatherData = async () => {
      try {
        setIsLoading(true)

        // If no custom locations, don't fetch weather data
        if (locations.length === 0) {
          setWeatherData([{
            location: 'No location',
            temperature: 0,
            condition: 'Configure locations in properties',
            precipitationProbability: 0
          }])
          setIsLoading(false)
          return
        }

        const data = await fetchWeatherData(locations)
        setWeatherData(data)
      } catch (error) {
        console.error('Failed to load weather data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadWeatherData()

    // Only set interval if we have locations
    if (locations.length > 0) {
      const refreshInterval = setInterval(loadWeatherData, 5 * 60 * 1000)
      return () => clearInterval(refreshInterval)
    }
  }, [locations])

  useEffect(() => {
    if (weatherData.length > 1) {
      const locationInterval = setInterval(() => {
        setCurrentLocationIndex(prev => (prev + 1) % weatherData.length)
      }, 10000)
      
      return () => clearInterval(locationInterval)
    }
  }, [weatherData.length])

  const currentWeather = weatherData[currentLocationIndex] || {
    location: 'Loading...',
    temperature: 0,
    condition: 'Loading...',
    precipitationProbability: 0
  }

  // Stable font sizes to prevent glitching
  const fontSizes = {
    location: Math.max(12, Math.min(width * 0.08, height * 0.2, 24)),
    temperature: Math.max(16, Math.min(width * 0.12, height * 0.3, 36)),
    condition: Math.max(10, Math.min(width * 0.05, height * 0.13, 16)),
    precipitation: Math.max(9, Math.min(width * 0.045, height * 0.12, 14)),
    counter: Math.max(8, Math.min(width * 0.03, height * 0.08, 12)),
    emoji: Math.max(20, Math.min(width * 0.12, height * 0.3, 40))
  }

  const currentHour = new Date().getHours()
  const weatherColors = getWeatherColors(currentWeather.condition, currentHour)

  return (
    <BaseWidget
      {...props}
      className={`${weatherColors} p-4`}
    >
      <div className="flex items-center justify-between h-full">
        <div className="flex-1">
          <div style={{ fontSize: `${fontSizes.location}px` }} className="font-medium opacity-90 mb-1">
            {currentWeather.location}
          </div>
          <div style={{ fontSize: `${fontSizes.temperature}px` }} className="font-black mb-1">
            {isLoading ? '--' : `${currentWeather.temperature}`}°C
          </div>
          <div style={{ fontSize: `${fontSizes.condition}px` }} className="font-medium opacity-90 mb-1">
            {currentWeather.condition}
          </div>
          <div style={{ fontSize: `${fontSizes.precipitation}px` }} className="opacity-85 font-medium">
            🌧️ {currentWeather.precipitationProbability}%
          </div>
          {weatherData.length > 1 && (
            <div style={{ fontSize: `${fontSizes.counter}px` }} className="opacity-60 mt-1">
              {currentLocationIndex + 1}/{weatherData.length}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 ml-4">
          <div style={{ fontSize: `${fontSizes.emoji}px` }}>
            {getWeatherEmoji(currentWeather.condition)}
          </div>
        </div>
      </div>
    </BaseWidget>
  )
})

export default WeatherWidget