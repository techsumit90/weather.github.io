/* ============================================================
   Atmos Weather App — assets/js/app.js
   ============================================================

   Architecture
   ────────────
   1. CONFIG        — API base URLs and app-wide constants
   2. WMO_CODES     — WMO weather interpretation code map
   3. Theme         — Dynamic background theme selection
   4. Stars         — Procedural star generation (night theme)
   5. Utilities     — Date/string helpers + HTML escaping
   6. API           — Fetch wrappers (weather, geocoding)
   7. Renderer      — Builds and injects weather UI
   8. State Helpers — Loading / error UI helpers
   9. Search        — Autocomplete + search event handling
  10. Init          — Auto-detect location on page load

   Data Sources (both free, no API key required):
   - Weather:    Open-Meteo           (https://open-meteo.com)
   - Geocoding:  OSM Nominatim        (https://nominatim.openstreetmap.org)
   ============================================================ */

'use strict';

/* ── 1. CONFIG ──────────────────────────────────────────────── */

const CONFIG = {
  WEATHER_API:  'https://api.open-meteo.com/v1/forecast',
  GEOCODE_API:  'https://nominatim.openstreetmap.org',
  /** Debounce delay (ms) for autocomplete requests */
  AC_DEBOUNCE:   320,
  /** Number of autocomplete suggestions to show */
  AC_LIMIT:      5,
  /** Hours to show in the hourly forecast strip */
  HOURLY_COUNT:  24,
  /** Days to request from the forecast API */
  FORECAST_DAYS: 7,
  /** Number of stars rendered in the night theme */
  STAR_COUNT:    120,
  /** Milliseconds in one hour — used to filter past hourly slots */
  HOUR_MS:       3_600_000,
};

/* ── 2. WMO_CODES ───────────────────────────────────────────── */

/** Maps WMO weather interpretation codes to [emoji, label] pairs. */
const WMO_CODES = {
  0:  ['☀️',  'Clear sky'],
  1:  ['🌤️', 'Mainly clear'],
  2:  ['⛅',  'Partly cloudy'],
  3:  ['☁️',  'Overcast'],
  45: ['🌫️', 'Foggy'],
  48: ['🌫️', 'Icy fog'],
  51: ['🌦️', 'Light drizzle'],
  53: ['🌦️', 'Drizzle'],
  55: ['🌧️', 'Heavy drizzle'],
  61: ['🌧️', 'Light rain'],
  63: ['🌧️', 'Rain'],
  65: ['🌧️', 'Heavy rain'],
  71: ['🌨️', 'Light snow'],
  73: ['❄️',  'Snow'],
  75: ['🌨️', 'Heavy snow'],
  77: ['🌨️', 'Snow grains'],
  80: ['🌦️', 'Light showers'],
  81: ['🌧️', 'Showers'],
  82: ['⛈️',  'Heavy showers'],
  85: ['🌨️', 'Snow showers'],
  86: ['🌨️', 'Heavy snow showers'],
  95: ['⛈️',  'Thunderstorm'],
  96: ['⛈️',  'Thunderstorm w/ hail'],
  99: ['⛈️',  'Severe thunderstorm'],
};

/* ── 3. Theme ───────────────────────────────────────────────── */

/**
 * Returns a CSS theme class name based on WMO weather code and time of day.
 * @param {number}  code    - WMO weather code
 * @param {boolean} isNight - Whether it is currently night-time
 * @returns {string} CSS class name for <body>
 */
function getTheme(code, isNight) {
  if (isNight)                                        return 'night';
  if ([95, 96, 99].includes(code))                    return 'stormy';
  if ([71, 73, 75, 77, 85, 86].includes(code))        return 'snowy';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'rainy';
  if ([45, 48].includes(code))                        return 'foggy';
  if ([2, 3].includes(code))                          return 'cloudy';
  if (code === 0 || code === 1)                       return 'sunny';
  return 'cloudy';
}

/**
 * Applies the correct theme class to <body> and manages the star overlay.
 * @param {number}  code    - WMO weather code
 * @param {boolean} isNight
 */
function applyTheme(code, isNight) {
  const theme = getTheme(code, isNight);
  document.body.className = theme;
  if (theme === 'night') {
    makeStars();
  } else {
    document.getElementById('stars').innerHTML = '';
  }
}

/* ── 4. Stars ───────────────────────────────────────────────── */

/** Procedurally generates twinkling stars for the night theme. */
function makeStars() {
  const container = document.getElementById('stars');
  container.innerHTML = '';

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    star.style.cssText =
      `width:${size}px;height:${size}px;` +
      `top:${Math.random() * 100}%;` +
      `left:${Math.random() * 100}%;` +
      `animation-duration:${2 + Math.random() * 3}s;` +
      `animation-delay:${Math.random() * 3}s;`;
    fragment.appendChild(star);
  }
  container.appendChild(fragment);
}

/* ── 5. Utilities ───────────────────────────────────────────── */

/**
 * Escapes a string for safe insertion into HTML innerHTML.
 * Prevents XSS when rendering third-party API data.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats an ISO datetime string (without trailing Z) to a short label,
 * e.g. "3pm" or "12am", interpreting the time as UTC.
 * @param {string} isoStr - e.g. "2024-06-01T15:00"
 * @returns {string}
 */
function formatHourUTC(isoStr) {
  const hour = new Date(isoStr + 'Z').getUTCHours();
  if (hour === 0)  return '12am';
  if (hour < 12)   return hour + 'am';
  if (hour === 12) return '12pm';
  return (hour - 12) + 'pm';
}

/**
 * Returns true if the given ISO datetime string (UTC) is between 8 pm and 6 am.
 * @param {string} isoStr
 * @returns {boolean}
 */
function isNightTime(isoStr) {
  const hour = new Date(isoStr + 'Z').getUTCHours();
  return hour < 6 || hour >= 20;
}

/* ── 6. API ─────────────────────────────────────────────────── */

/**
 * Reverse geocodes a lat/lon pair to county, state, and country
 * using OpenStreetMap Nominatim.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{county: string, state: string, country: string, display: string}>}
 */
async function reverseGeocode(lat, lon) {
  const url =
    `${CONFIG.GEOCODE_API}/reverse` +
    `?lat=${lat}&lon=${lon}&format=json&zoom=10`;

  const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);

  const data = await response.json();
  const address = data.address || {};

  const county  = address.county || address.state_district ||
                  address.municipality || address.city ||
                  address.town || address.village || '';
  const state   = address.state   || '';
  const country = address.country || '';

  return {
    county,
    state,
    country,
    display: [county, state, country].filter(Boolean).join(', '),
  };
}

/**
 * Fetches autocomplete location suggestions from OSM Nominatim.
 * Returns an empty array for queries shorter than 2 characters.
 * @param {string} query
 * @returns {Promise<Array>}
 */
async function fetchAutocomplete(query) {
  if (query.length < 2) return [];

  const url =
    `${CONFIG.GEOCODE_API}/search` +
    `?q=${encodeURIComponent(query)}&format=json` +
    `&limit=${CONFIG.AC_LIMIT}&addressdetails=1`;

  const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!response.ok) throw new Error(`Autocomplete failed: ${response.status}`);
  return response.json();
}

/**
 * Fetches current conditions, hourly, and daily forecasts from Open-Meteo.
 * Uses the auto timezone feature so all times match the queried location.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<Object>} Full Open-Meteo response object
 */
async function fetchWeather(lat, lon) {
  const url =
    `${CONFIG.WEATHER_API}` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,` +
      `wind_speed_10m,relative_humidity_2m,visibility,precipitation_probability` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
    `&wind_speed_unit=kmh&timezone=auto&forecast_days=${CONFIG.FORECAST_DAYS}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Weather fetch failed: ${response.status}`);
  return response.json();
}

/* ── 7. Renderer ────────────────────────────────────────────── */

/**
 * Main entry point for loading and rendering weather.
 * Fetches geocode and weather data in parallel, then renders the UI.
 * @param {number|string} lat
 * @param {number|string} lon
 */
async function loadWeather(lat, lon) {
  showLoading();
  try {
    const [geo, weatherData] = await Promise.all([
      reverseGeocode(lat, lon),
      fetchWeather(lat, lon),
    ]);
    render(geo, weatherData);
  } catch (err) {
    console.error('[Atmos] Weather load error:', err);
    showError('Could not load weather. Please check your connection and try again.');
  }
}

/**
 * Renders the complete weather UI into #content.
 * All third-party strings are HTML-escaped before injection.
 * @param {{county: string, state: string, country: string, display: string}} geo
 * @param {Object} weatherData - Open-Meteo response
 */
function render(geo, weatherData) {
  const current     = weatherData.current;
  const weatherCode = current.weather_code;
  const currentTime = weatherData.current_weather_time || current.time ||
                      new Date().toISOString().slice(0, 16);
  const night       = isNightTime(currentTime);

  applyTheme(weatherCode, night);

  const [condIcon, condLabel] = WMO_CODES[weatherCode] || ['🌡️', 'Unknown'];
  const temp        = Math.round(current.temperature_2m);
  const feelsLike   = Math.round(current.apparent_temperature);
  const humidity    = current.relative_humidity_2m;
  const windSpeed   = Math.round(current.wind_speed_10m);
  const visibility  = current.visibility != null
    ? (current.visibility / 1000).toFixed(1) + ' km'
    : '—';
  const precipProb  = current.precipitation_probability ?? '—';
  const timeLabel   = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ── Escaped location parts ──
  const locationName  = escapeHtml(geo.county || geo.display.split(',')[0]);
  const locationState = geo.state   ? ', ' + escapeHtml(geo.state)   : '';
  const locationCountry = geo.country ? ', ' + escapeHtml(geo.country) : '';

  document.getElementById('content').innerHTML = `
    <div class="main-card">
      <div class="loc-row">
        <span class="loc-pin" aria-hidden="true">📍</span>
        <span class="loc-text">
          <strong>${locationName}</strong>${locationState}${locationCountry}
        </span>
        <span class="time-badge" aria-label="Local time">${escapeHtml(timeLabel)}</span>
      </div>

      <div class="weather-hero" aria-label="${escapeHtml(condLabel)}, ${temp}°C">
        <div>
          <div class="temp-main">${temp}°C</div>
          <div class="condition-label">${escapeHtml(condLabel)}</div>
        </div>
        <div class="weather-icon-big" aria-hidden="true">${condIcon}</div>
      </div>

      <div class="stats-grid">
        ${buildStatBox('🌡️', feelsLike + '°C', 'Feels like')}
        ${buildStatBox('💧', humidity + '%',   'Humidity')}
        ${buildStatBox('💨', windSpeed + ' km/h', 'Wind')}
        ${buildStatBox('👁️', visibility,       'Visibility')}
        ${buildStatBox('🌂', precipProb + '%', 'Precip.')}
        ${buildStatBox(night ? '🌙' : '☀️', night ? 'Night' : 'Day', 'Period')}
      </div>
    </div>

    <div class="hourly-wrap">
      <div class="section-title">⏱ 24-Hour Forecast</div>
      <div class="hourly-scroll" role="list">${buildHourlyHTML(weatherData.hourly)}</div>
    </div>

    <div class="daily-wrap">
      <div class="section-title">📅 7-Day Forecast</div>
      ${buildDailyHTML(weatherData.daily)}
    </div>
  `;
}

/**
 * Builds a single stat box HTML string.
 * @param {string} icon
 * @param {string} value
 * @param {string} label
 * @returns {string}
 */
function buildStatBox(icon, value, label) {
  return `
    <div class="stat-box">
      <div class="stat-icon" aria-hidden="true">${icon}</div>
      <div class="stat-val">${escapeHtml(String(value))}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
    </div>`;
}

/**
 * Builds the hourly forecast strip HTML for the next HOURLY_COUNT hours.
 * @param {Object} hourly - hourly section from Open-Meteo response
 * @returns {string} HTML string
 */
function buildHourlyHTML(hourly) {
  const now = new Date();
  let html  = '';
  let count = 0;

  for (let i = 0; i < hourly.time.length && count < CONFIG.HOURLY_COUNT; i++) {
    const slotTime = new Date(hourly.time[i] + 'Z');
    if (slotTime < now - CONFIG.HOUR_MS) continue; // skip slots already past

    const isNowSlot = count === 0;
    const slotIcon  = (WMO_CODES[hourly.weather_code[i]] || ['🌡️'])[0];
    const slotTemp  = Math.round(hourly.temperature_2m[i]);
    const slotPrec  = hourly.precipitation_probability[i] ?? 0;
    const timeLabel = isNowSlot ? 'Now' : formatHourUTC(hourly.time[i]);

    html += `
      <div class="hour-card${isNowSlot ? ' now' : ''}" role="listitem">
        <div class="hour-time">${escapeHtml(timeLabel)}</div>
        <div class="hour-icon" aria-hidden="true">${slotIcon}</div>
        <div class="hour-temp">${slotTemp}°</div>
        <div class="hour-prec">${slotPrec}%💧</div>
      </div>`;
    count++;
  }

  return html;
}

/**
 * Builds the 7-day daily forecast HTML.
 * Each day shows a proportional temperature-range bar relative to the week.
 * @param {Object} daily - daily section from Open-Meteo response
 * @returns {string} HTML string
 */
function buildDailyHTML(daily) {
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const allMax    = daily.temperature_2m_max;
  const allMin    = daily.temperature_2m_min;
  const rangeMax  = Math.max(...allMax);
  const rangeMin  = Math.min(...allMin);
  const rangeSpan = rangeMax - rangeMin + 1; // +1 avoids division by zero

  let html = '';

  for (let i = 0; i < daily.time.length; i++) {
    const date    = new Date(daily.time[i] + 'Z');
    const dayName = i === 0 ? 'Today' : DAY_NAMES[date.getUTCDay()];
    const [dayIcon, dayLabel] = WMO_CODES[daily.weather_code[i]] || ['🌡️', '—'];
    const hi = Math.round(allMax[i]);
    const lo = Math.round(allMin[i]);

    // Proportional bar within the full week temperature range
    const barLeft  = ((lo - rangeMin) / rangeSpan * 100).toFixed(0);
    const barWidth = Math.max((hi - lo) / rangeSpan * 100, 8).toFixed(0);

    html += `
      <div class="day-row" role="row" aria-label="${escapeHtml(dayName)}: ${escapeHtml(dayLabel)}, high ${hi}°, low ${lo}°">
        <div class="day-name">${escapeHtml(dayName)}</div>
        <div class="day-icon" aria-hidden="true">${dayIcon}</div>
        <div class="day-cond">${escapeHtml(dayLabel)}</div>
        <div class="day-bar" aria-hidden="true">
          <div class="day-bar-fill" style="margin-left:${barLeft}%;width:${barWidth}%"></div>
        </div>
        <div class="day-temps">
          <span class="day-hi">${hi}°</span>
          <span class="day-lo">${lo}°</span>
        </div>
      </div>`;
  }

  return html;
}

/* ── 8. State Helpers ───────────────────────────────────────── */

/** Renders a loading spinner into #content. */
function showLoading() {
  document.getElementById('content').innerHTML = `
    <div class="state-box" role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <div class="state-msg">Fetching weather data…</div>
    </div>`;
}

/**
 * Renders an error message into #content.
 * Message must be a trusted internal string — not raw user/API input.
 * @param {string} message
 */
function showError(message) {
  document.getElementById('content').innerHTML = `
    <div class="state-box" role="alert">
      <div class="state-icon" aria-hidden="true">⚠️</div>
      <div class="state-msg">${escapeHtml(message)}</div>
    </div>`;
}

/* ── 9. Search & Autocomplete ───────────────────────────────── */

let autocompleteTimer = null;
let autocompleteCache = [];

const searchInput  = document.getElementById('searchInput');
const acDropdown   = document.getElementById('autocomplete');
const searchButton = document.getElementById('searchBtn');
const locateButton = document.getElementById('locateBtn');

/** Closes the autocomplete dropdown and clears its content. */
function closeAutocomplete() {
  acDropdown.classList.remove('open');
}

// Debounced autocomplete fetch on each keystroke
searchInput.addEventListener('input', () => {
  clearTimeout(autocompleteTimer);
  const query = searchInput.value.trim();
  if (!query) { closeAutocomplete(); return; }

  autocompleteTimer = setTimeout(async () => {
    try {
      const results = await fetchAutocomplete(query);
      autocompleteCache = results;

      if (!results.length) { closeAutocomplete(); return; }

      // Escape all API strings before injecting into innerHTML
      acDropdown.innerHTML = results.map((result, index) => {
        const name   = escapeHtml(result.name || result.display_name.split(',')[0]);
        const region = escapeHtml(result.display_name);
        return `
          <div class="ac-item" data-index="${index}" role="option" tabindex="0">
            <div class="ac-name">${name}</div>
            <div class="ac-region">${region}</div>
          </div>`;
      }).join('');

      acDropdown.classList.add('open');
    } catch (err) {
      console.warn('[Atmos] Autocomplete error:', err);
      closeAutocomplete();
    }
  }, CONFIG.AC_DEBOUNCE);
});

// Click a suggestion to load its weather
acDropdown.addEventListener('click', (e) => {
  const item = e.target.closest('.ac-item');
  if (!item) return;
  const place = autocompleteCache[+item.dataset.index];
  if (!place) return;
  searchInput.value = '';
  closeAutocomplete();
  loadWeather(place.lat, place.lon);
});

// Keyboard navigation within the dropdown
acDropdown.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const item = e.target.closest('.ac-item');
    if (item) item.click();
  }
});

// Close dropdown when clicking outside the search area
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) closeAutocomplete();
});

// "Go" button — use the top autocomplete result
searchButton.addEventListener('click', async () => {
  const query = searchInput.value.trim();
  if (!query) return;

  try {
    const results = await fetchAutocomplete(query);
    if (results.length) {
      searchInput.value = '';
      closeAutocomplete();
      loadWeather(results[0].lat, results[0].lon);
    } else {
      showError('Location not found. Please try a different search term.');
    }
  } catch (err) {
    console.error('[Atmos] Search error:', err);
    showError('Search failed. Please check your connection and try again.');
  }
});

// Enter key triggers the same action as the "Go" button
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchButton.click();
});

// 📍 Locate button — re-request GPS position
locateButton.addEventListener('click', () => {
  closeAutocomplete();
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    (position) => loadWeather(position.coords.latitude, position.coords.longitude),
    ()         => showError('Location access denied. Please search for your city above.')
  );
});

/* ── 10. Init ───────────────────────────────────────────────── */

/** Auto-detect location on page load. Falls back to manual search if denied. */
(function init() {
  if (!navigator.geolocation) {
    document.getElementById('content').innerHTML = `
      <div class="state-box">
        <div class="state-icon" aria-hidden="true">🔍</div>
        <div class="state-msg">Search for your city above to get started.</div>
      </div>`;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => loadWeather(position.coords.latitude, position.coords.longitude),
    () => {
      document.getElementById('content').innerHTML = `
        <div class="state-box">
          <div class="state-icon" aria-hidden="true">🔍</div>
          <div class="state-msg">
            Location access denied.<br>
            Search for your city above to get started.
          </div>
        </div>`;
    }
  );
}());
