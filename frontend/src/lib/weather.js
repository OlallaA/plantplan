const conditions = {
  0: 'clear', 1: 'mostlyClear', 2: 'partlyCloudy', 3: 'cloudy',
  45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 56: 'freezingDrizzle', 57: 'freezingDrizzle',
  61: 'rain', 63: 'rain', 65: 'rain', 66: 'freezingRain', 67: 'freezingRain',
  71: 'snow', 73: 'snow', 75: 'snow', 77: 'snowGrains',
  80: 'showers', 81: 'showers', 82: 'showers', 85: 'snowShowers', 86: 'snowShowers',
  95: 'thunderstorm', 96: 'hail', 99: 'hail',
}

const rainConditions = new Set(['drizzle', 'freezingDrizzle', 'rain', 'freezingRain', 'showers'])
const stormConditions = new Set(['thunderstorm', 'hail'])
const snowConditions = new Set(['snow', 'snowGrains', 'snowShowers'])

export function weatherCondition(code) {
  return conditions[code] ?? 'unknown'
}

export function gardenWeatherEffect(current) {
  if (!current) return null
  const condition = weatherCondition(current.weatherCode)
  if (rainConditions.has(condition) || (stormConditions.has(condition) && current.precipitationMm > 0)) {
    return 'rain'
  }
  if (snowConditions.has(condition)) return 'snow'
  if (condition === 'fog') return 'fog'
  if (condition === 'partlyCloudy' || condition === 'cloudy' || stormConditions.has(condition)) return 'clouds'
  if (condition === 'clear' || condition === 'mostlyClear') {
    if (current.daylight === true) return 'sun'
    if (current.daylight === false) return 'night'
  }
  return null
}
