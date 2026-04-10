/* ============================================================
   Atmos Weather App — app.js
   ============================================================

   Data Sources (both free, no API key required):
   - Weather:    Open-Meteo  (https://open-meteo.com)
   - Geocoding:  OpenStreetMap Nominatim (https://nominatim.openstreetmap.org)
   ============================================================ */

'use strict';

/* ── WMO Weather Interpretation Code Map ─────────────────── */
const WMO = {
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

/* ── Theme Mapping ───────────────────────────────────────── */

/**
 * Returns a CSS class name based on weather code and time of day.
 * @param {number} code  - WMO weather code
 * @param {boolean} isNight
 * @returns {string} theme class name
 */
function getTheme(code, isNight) {
  if (isNight)                          return 'night';
  if ([95, 96, 99].includes(code))      return 'stormy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snowy';
  if ([61, 63, 65, 80, 81, 82].includes(code)) return 'rainy';
  if ([51, 53, 55].includes(code))      return 'rainy';
  if ([45, 48].includes(code))          return 'foggy';
  if ([2, 3].includes(code))            return 'cloudy';
  if (code === 0 || code === 1)         return 'sunny';
  return 'cloudy';
}

/**
 * Applies the correct theme class to <body> and
 * generates stars for the night theme.
 */
function applyTheme(code, isNight) {
  const theme = getTheme(code, isNight);
  document.body.className = theme;
  if (theme === 'night') makeStars();
  else document.getElementById('stars').innerHTML = '';
}

/* ── Star Generation (night theme) ──────────────────────── */

function makeStars() {
  const el = document.getElementById('stars');
  el.innerHTML = '';
  for (let i = 0; i < 120; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    star.style.cssText =
      `width:${size}px;height:${size}px;` +
      `top:${Math.random() * 100}%;` +
      `left:${Math.random() * 100}%;` +
      `animation-duration:${2 + Math.random() * 3}s;` +
      `animation-delay:${Math.random() * 3}s;`;
    el.appendChild(star);
  }
}

/* ── Helper Utilities ────────────────────────────────────── */

/**
 * Formats an ISO datetime string to a short hour label e.g. "3pm", "12am".
 */
function fmtHour(isoStr) {
  const h = new Date(isoStr + 'Z').getHours();
  if (h === 0)  return '12am';
  if (h < 12)   return h + 'am';
  if (h === 12) return '12pm';
  return (h - 12) + 'pm';
}

/**
 * Returns true if the given ISO datetime string falls between 8pm and 6am.
 */
function isNightTime(isoStr) {
  const h = new Date(isoStr + 'Z').getHours();
  return h < 6 || h >= 20;
}

/* ── API Calls ───────────────────────────────────────────── */

/**
 * Reverse geocodes lat/lon to county, state, country using OSM Nominatim.
 * @returns {Promise<{county, state, country, display}>}
 */
async function reverseGeocode(lat, lon) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const data = await res.json();
  const a = data.address || {};

  const county  = a.county || a.state_district || a.municipality || a.city || a.town || a.village || '';
  const state   = a.state   || '';
  const country = a.country || '';

  return {
    county,
    state,
    country,
    display: [county, state, country].filter(Boolean).join(', '),
  };
}

/**
 * Fetches autocomplete suggestions for a search query from OSM Nominatim.
 * @returns {Promise<Array>} array of place result objects
 */
async function fetchAutocomplete(query) {
  if (query.length < 2) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } }
  );
  return await res.json();
}

/**
 * Fetches current + hourly + daily weather from Open-Meteo.
 * Free API — no key required.
 * @returns {Promise<Object>} full Open-Meteo response object
 */
async function fetchWeather(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,visibility,precipitation_probability` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
    `&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;

  const res = await fetch(url);
  return await res.json();
}

/* ── Core Load & Render ──────────────────────────────────── */

/**
 * Main entry point: fetches geocode + weather in parallel, then renders.
 */
async function loadWeather(lat, lon) {
  showLoading();
  try {
    const [geo, wx] = await Promise.all([
      reverseGeocode(lat, lon),
      fetchWeather(lat, lon),
    ]);
    render(geo, wx);
  } catch (err) {
    console.error(err);
    showError('Could not load weather. Please try again.');
  }
}

/**
 * Renders all weather UI into #content from geocode + weather data.
 */
function render(geo, wx) {
  const c    = wx.current;
  const code = c.weather_code;
  const isNight = isNightTime(
    wx.current_weather_time || c.time || new Date().toISOString().slice(0, 16)
  );

  applyTheme(code, isNight);

  const [icon, label] = WMO[code] || ['🌡️', 'Unknown'];
  const temp  = Math.round(c.temperature_2m);
  const feels = Math.round(c.apparent_temperature);
  const humid = c.relative_humidity_2m;
  const wind  = Math.round(c.wind_speed_10m);
  const vis   = c.visibility != null ? (c.visibility / 1000).toFixed(1) + 'km' : '—';
  const prec  = c.precipitation_probability ?? '—';
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ── Hourly forecast HTML (next 24 hours) ──
  const now   = new Date();
  const hours = wx.hourly;
  let hourHTML = '';
  let count = 0;

  for (let i = 0; i < hours.time.length && count < 24; i++) {
    const slotTime = new Date(hours.time[i] + 'Z');
    if (slotTime < now - 3_600_000) continue; // skip past hours

    const isNowSlot = count === 0;
    const hIcon     = (WMO[hours.weather_code[i]] || ['🌡️'])[0];

    hourHTML += `
      <div class="hour-card${isNowSlot ? ' now' : ''}">
        <div class="hour-time">${isNowSlot ? 'Now' : fmtHour(hours.time[i])}</div>
        <div class="hour-icon">${hIcon}</div>
        <div class="hour-temp">${Math.round(hours.temperature_2m[i])}°</div>
        <div class="hour-prec">${hours.precipitation_probability[i] ?? 0}%💧</div>
      </div>`;
    count++;
  }

  // ── 7-day daily forecast HTML ──
  const daily    = wx.daily;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const allMax   = daily.temperature_2m_max;
  const allMin   = daily.temperature_2m_min;
  const rangeMax = Math.max(...allMax);
  const rangeMin = Math.min(...allMin);
  let dayHTML = '';

  for (let i = 0; i < daily.time.length; i++) {
    const d       = new Date(daily.time[i] + 'Z');
    const dayName = i === 0 ? 'Today' : dayNames[d.getDay()];
    const [dIcon, dLabel] = WMO[daily.weather_code[i]] || ['🌡️', '—'];
    const hi = Math.round(allMax[i]);
    const lo = Math.round(allMin[i]);

    // Proportional bar position within the week's full temp range
    const barLeft = (lo - rangeMin) / (rangeMax - rangeMin + 1) * 100;
    const barW    = Math.max((hi - lo) / (rangeMax - rangeMin + 1) * 100, 8);

    dayHTML += `
      <div class="day-row">
        <div class="day-name">${dayName}</div>
        <div class="day-icon">${dIcon}</div>
        <div class="day-cond">${dLabel}</div>
        <div class="day-bar">
          <div class="day-bar-fill"
               style="margin-left:${barLeft.toFixed(0)}%;width:${barW.toFixed(0)}%">
          </div>
        </div>
        <div class="day-temps">
          <span class="day-hi">${hi}°</span>
          <span class="day-lo">${lo}°</span>
        </div>
      </div>`;
  }

  // ── Inject full UI ──
  document.getElementById('content').innerHTML = `
    <div class="main-card">
      <div class="loc-row">
        <span class="loc-pin">📍</span>
        <span class="loc-text">
          <strong>${geo.county || geo.display.split(',')[0]}</strong>
          ${geo.state   ? ', ' + geo.state   : ''}
          ${geo.country ? ', ' + geo.country : ''}
        </span>
        <span class="time-badge">${timeStr}</span>
      </div>

      <div class="weather-hero">
        <div>
          <div class="temp-main">${temp}°C</div>
          <div class="condition-label">${label}</div>
        </div>
        <div class="weather-icon-big">${icon}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-icon">🌡️</div>
          <div class="stat-val">${feels}°C</div>
          <div class="stat-label">Feels like</div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">💧</div>
          <div class="stat-val">${humid}%</div>
          <div class="stat-label">Humidity</div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">💨</div>
          <div class="stat-val">${wind} km/h</div>
          <div class="stat-label">Wind</div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">👁️</div>
          <div class="stat-val">${vis}</div>
          <div class="stat-label">Visibility</div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">🌂</div>
          <div class="stat-val">${prec}%</div>
          <div class="stat-label">Precip.</div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">${isNight ? '🌙' : '☀️'}</div>
          <div class="stat-val">${isNight ? 'Night' : 'Day'}</div>
          <div class="stat-label">Period</div>
        </div>
      </div>
    </div>

    <div class="hourly-wrap">
      <div class="section-title">⏱ 24-Hour Forecast</div>
      <div class="hourly-scroll">${hourHTML}</div>
    </div>

    <div class="daily-wrap">
      <div class="section-title">📅 7-Day Forecast</div>
      ${dayHTML}
    </div>
  `;
}

/* ── UI State Helpers ────────────────────────────────────── */

function showLoading() {
  document.getElementById('content').innerHTML = `
    <div class="state-box">
      <div class="spinner"></div>
      <div class="state-msg">Fetching weather data…</div>
    </div>`;
}

function showError(msg) {
  document.getElementById('content').innerHTML = `
    <div class="state-box">
      <div class="state-icon">⚠️</div>
      <div class="state-msg">${msg}</div>
    </div>`;
}

/* ── Search & Autocomplete ───────────────────────────────── */

let acTimer = null;
let acData  = [];

const searchInput = document.getElementById('searchInput');
const acDropdown  = document.getElementById('autocomplete');
const searchBtn   = document.getElementById('searchBtn');
const locateBtn   = document.getElementById('locateBtn');

// Debounced autocomplete on each keystroke
searchInput.addEventListener('input', () => {
  clearTimeout(acTimer);
  const q = searchInput.value.trim();
  if (!q) { acDropdown.classList.remove('open'); return; }

  acTimer = setTimeout(async () => {
    const results = await fetchAutocomplete(q);
    acData = results;

    if (!results.length) { acDropdown.classList.remove('open'); return; }

    acDropdown.innerHTML = results.map((r, i) => `
      <div class="ac-item" data-i="${i}">
        <div class="ac-name">${r.name || r.display_name.split(',')[0]}</div>
        <div class="ac-region">${r.display_name}</div>
      </div>`).join('');

    acDropdown.classList.add('open');
  }, 320);
});

// Click a suggestion → load its weather
acDropdown.addEventListener('click', (e) => {
  const item = e.target.closest('.ac-item');
  if (!item) return;
  const place = acData[+item.dataset.i];
  searchInput.value = '';
  acDropdown.classList.remove('open');
  loadWeather(place.lat, place.lon);
});

// Close dropdown when clicking outside the search area
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) acDropdown.classList.remove('open');
});

// "Go" button — take the first autocomplete result
searchBtn.addEventListener('click', async () => {
  const q = searchInput.value.trim();
  if (!q) return;
  const results = await fetchAutocomplete(q);
  if (results.length) {
    searchInput.value = '';
    acDropdown.classList.remove('open');
    loadWeather(results[0].lat, results[0].lon);
  } else {
    showError('Location not found. Try a different search.');
  }
});

// Enter key triggers the same action as "Go"
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

// 📍 Locate button — re-request GPS
locateBtn.addEventListener('click', () => {
  acDropdown.classList.remove('open');
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    (pos) => loadWeather(pos.coords.latitude, pos.coords.longitude),
    ()    => showError('Location access denied. Please search manually.')
  );
});

/* ── Auto-detect on Page Load ────────────────────────────── */

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => loadWeather(pos.coords.latitude, pos.coords.longitude),
    ()    => {
      document.getElementById('content').innerHTML = `
        <div class="state-box">
          <div class="state-icon">🔍</div>
          <div class="state-msg">
            Location access denied.<br>
            Search for your city above.
          </div>
        </div>`;
    }
  );
} else {
  document.getElementById('content').innerHTML = `
    <div class="state-box">
      <div class="state-icon">🔍</div>
      <div class="state-msg">Search for your city above.</div>
    </div>`;
}
