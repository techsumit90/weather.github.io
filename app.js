/* ================================================================
   WeatherNow — app.js
   ================================================================ */

'use strict';

/* ── Constants ─────────────────────────────────────────────────── */
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const NOMINATIM_SEARCH  = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

/* Open-Meteo hourly / daily variables we need */
const HOURLY_VARS  = 'temperature_2m,weathercode,precipitation_probability,apparent_temperature,windspeed_10m,visibility';
const DAILY_VARS   = 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset';
const CURRENT_VARS = 'temperature_2m,apparent_temperature,relativehumidity_2m,windspeed_10m,weathercode,precipitation,visibility';

/* ── WMO Weather Code → label & emoji ──────────────────────────── */
const WMO_MAP = {
  0:  { label: 'Clear Sky',        icon: '☀️' },
  1:  { label: 'Mainly Clear',     icon: '🌤' },
  2:  { label: 'Partly Cloudy',    icon: '⛅' },
  3:  { label: 'Overcast',         icon: '☁️' },
  45: { label: 'Foggy',            icon: '🌫' },
  48: { label: 'Icy Fog',          icon: '🌫' },
  51: { label: 'Light Drizzle',    icon: '🌦' },
  53: { label: 'Drizzle',          icon: '🌦' },
  55: { label: 'Heavy Drizzle',    icon: '🌧' },
  56: { label: 'Freezing Drizzle', icon: '🌧' },
  57: { label: 'Heavy Freezing Drizzle', icon: '🌧' },
  61: { label: 'Light Rain',       icon: '🌧' },
  63: { label: 'Rain',             icon: '🌧' },
  65: { label: 'Heavy Rain',       icon: '🌧' },
  66: { label: 'Freezing Rain',    icon: '🌨' },
  67: { label: 'Heavy Freezing Rain', icon: '🌨' },
  71: { label: 'Light Snow',       icon: '🌨' },
  73: { label: 'Snow',             icon: '❄️' },
  75: { label: 'Heavy Snow',       icon: '❄️' },
  77: { label: 'Snow Grains',      icon: '🌨' },
  80: { label: 'Light Showers',    icon: '🌦' },
  81: { label: 'Showers',          icon: '🌧' },
  82: { label: 'Heavy Showers',    icon: '⛈' },
  85: { label: 'Snow Showers',     icon: '🌨' },
  86: { label: 'Heavy Snow Showers', icon: '❄️' },
  95: { label: 'Thunderstorm',     icon: '⛈' },
  96: { label: 'Thunderstorm w/ Hail', icon: '⛈' },
  99: { label: 'Severe Thunderstorm', icon: '🌩' },
};

function wmoInfo(code) {
  return WMO_MAP[code] ?? { label: 'Unknown', icon: '🌡' };
}

/* ── Theme mapping by WMO code ──────────────────────────────────── */
function wmoTheme(code) {
  if (code === 0 || code === 1)                       return 'theme-clear';
  if (code === 2 || code === 3)                       return 'theme-cloudy';
  if (code === 45 || code === 48)                     return 'theme-fog';
  if (code >= 51 && code <= 67)                       return 'theme-rain';
  if (code >= 71 && code <= 77)                       return 'theme-snow';
  if (code >= 80 && code <= 86)                       return 'theme-rain';
  if (code >= 95 && code <= 99)                       return 'theme-storm';
  return 'theme-default';
}

/* ── Helpers ────────────────────────────────────────────────────── */
function qs(sel) { return document.querySelector(sel); }

function showEl(...ids)  { ids.forEach(id => qs('#' + id)?.classList.remove('hidden')); }
function hideEl(...ids)  { ids.forEach(id => qs('#' + id)?.classList.add('hidden')); }

function setText(id, val) {
  const el = qs('#' + id);
  if (el) el.textContent = val;
}

function fmt12h(isoString) {
  const d = new Date(isoString);
  const h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12  = h % 12 || 12;
  return `${h12}${ampm}`;
}

function fmtDay(isoDate, isToday = false, isTomorrow = false) {
  if (isToday)    return 'Today';
  if (isTomorrow) return 'Tomorrow';
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return days[new Date(isoDate + 'T12:00:00').getDay()];
}

function formatLocalTime(timezone) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit',
      weekday: 'long', timeZone: timezone
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', weekday: 'long'
    }).format(new Date());
  }
}

/* ── State ──────────────────────────────────────────────────────── */
let autocompleteTimer = null;
let currentAcItems    = [];
let acSelectedIndex   = -1;

/* ── DOM references (populated after DOMContentLoaded) ─────────── */
let searchInput, autocompleteList;

/* ── Geocoding ──────────────────────────────────────────────────── */
async function reverseGeocode(lat, lon) {
  const url = `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Reverse geocode failed');
  return res.json();
}

async function forwardGeocode(query) {
  const url = `${NOMINATIM_SEARCH}?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Forward geocode failed');
  return res.json();
}

function buildLocationStrings(address) {
  /* Primary name — prefer county/city/town/village/hamlet */
  const primary =
    address.county      ||
    address.city        ||
    address.town        ||
    address.village     ||
    address.hamlet      ||
    address.municipality ||
    address.suburb      ||
    address.district    ||
    address.state_district ||
    address.region      ||
    address.state       ||
    'Unknown Location';

  /* Sub line — state + country */
  const parts = [];
  if (address.state && address.state !== primary)    parts.push(address.state);
  if (address.country)                               parts.push(address.country);
  const sub = parts.join(', ') || '';

  return { primary, sub };
}

/* ── Weather fetch ──────────────────────────────────────────────── */
async function fetchWeather(lat, lon) {
  const url = new URL(OPEN_METEO_BASE);
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('current',  CURRENT_VARS);
  url.searchParams.set('hourly',   HOURLY_VARS);
  url.searchParams.set('daily',    DAILY_VARS);
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '7');
  url.searchParams.set('windspeed_unit', 'mph');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return res.json();
}

/* ── Render ─────────────────────────────────────────────────────── */
function applyTheme(weatherCode, sunrise, sunset) {
  const body = document.getElementById('app-body');
  /* Remove existing theme classes */
  body.className = body.className.replace(/theme-\S+/g, '').trim();

  const theme = wmoTheme(weatherCode);
  body.classList.add(theme);

  /* Night detection */
  const now = new Date();
  if (sunrise && sunset) {
    const sr = new Date(sunrise);
    const ss = new Date(sunset);
    if (now < sr || now > ss) body.classList.add('night');
  }
}

function renderCurrentWeather(data) {
  const cu = data.current;
  const code = cu.weathercode ?? 0;
  const { label, icon } = wmoInfo(code);

  setText('weather-icon',    icon);
  setText('temp-main',       `${Math.round(cu.temperature_2m)}°C`);
  setText('condition-label', label);
  setText('feels-like',      `${Math.round(cu.apparent_temperature)}°C`);
  setText('humidity',        `${cu.relativehumidity_2m}%`);
  setText('wind-speed',      `${Math.round(cu.windspeed_10m)} mph`);
  setText('visibility',      cu.visibility != null
    ? `${(cu.visibility / 1000).toFixed(1)} km` : 'N/A');

  /* Precipitation chance — from hourly closest to now */
  const hourlyTimes = data.hourly.time;
  const nowStr = new Date().toISOString().slice(0, 13); // "2024-03-14T15"
  const idx = hourlyTimes.findIndex(t => t.startsWith(nowStr));
  const precipPct = idx !== -1 ? data.hourly.precipitation_probability[idx] : null;
  setText('precip-chance', precipPct != null ? `${precipPct}%` : 'N/A');

  /* Theme */
  const todaySunrise = data.daily?.sunrise?.[0];
  const todaySunset  = data.daily?.sunset?.[0];
  applyTheme(code, todaySunrise, todaySunset);

  /* Local time */
  const timeStr = formatLocalTime(data.timezone);
  setText('location-time', timeStr);
}

function renderHourly(data) {
  const container = qs('#hourly-scroll');
  container.innerHTML = '';

  const times  = data.hourly.time;
  const temps  = data.hourly.temperature_2m;
  const codes  = data.hourly.weathercode;
  const precip = data.hourly.precipitation_probability;

  /* Show next 24 hours starting from current hour */
  const now = new Date();
  const startIdx = times.findIndex(t => new Date(t) >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()));
  const from = startIdx >= 0 ? startIdx : 0;
  const slice = 24;

  for (let i = from; i < from + slice && i < times.length; i++) {
    const { icon } = wmoInfo(codes[i]);
    const chip = document.createElement('div');
    chip.className = 'hour-chip';
    chip.setAttribute('role', 'listitem');
    if (i === from) chip.classList.add('current-hour');

    chip.innerHTML = `
      <span class="chip-time">${i === from ? 'Now' : fmt12h(times[i])}</span>
      <span class="chip-icon">${icon}</span>
      <span class="chip-temp">${Math.round(temps[i])}°</span>
      <span class="chip-rain">💧${precip[i] ?? 0}%</span>
    `;
    container.appendChild(chip);
  }
}

function renderDaily(data) {
  const container = qs('#daily-grid');
  container.innerHTML = '';

  const times   = data.daily.time;
  const codes   = data.daily.weathercode;
  const maxT    = data.daily.temperature_2m_max;
  const minT    = data.daily.temperature_2m_min;
  const precip  = data.daily.precipitation_probability_max;
  const today   = new Date().toISOString().slice(0, 10);

  times.forEach((date, i) => {
    const { icon, label } = wmoInfo(codes[i]);
    const isToday    = date === today;
    const isTomorrow = new Date(date + 'T12:00:00').getDate() ===
                       new Date(Date.now() + 86400000).getDate() &&
                       !isToday;

    const row = document.createElement('div');
    row.className = 'day-row';
    row.setAttribute('role', 'listitem');
    row.innerHTML = `
      <span class="day-name">${fmtDay(date, isToday, isTomorrow)}</span>
      <span class="day-icon">${icon}</span>
      <span class="day-desc">${label}</span>
      <span class="day-rain">💧${precip[i] ?? 0}%</span>
      <span class="day-range">
        <span class="hi">${Math.round(maxT[i])}°</span>
        <span class="lo">${Math.round(minT[i])}°</span>
      </span>
    `;
    container.appendChild(row);
  });
}

/* ── Main load flow ─────────────────────────────────────────────── */
function showLoading(msg = 'Fetching weather…') {
  hideEl('weather-section', 'error-state');
  showEl('loading-state');
  setText('loading-state', '');
  const p = document.createElement('p');
  p.textContent = msg;
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  qs('#loading-state').append(spinner, p);
}

function showError(msg) {
  hideEl('loading-state', 'weather-section');
  setText('error-message', msg);
  showEl('error-state');
}

async function loadWeatherForCoords(lat, lon) {
  showLoading('Fetching weather…');
  try {
    const [geoData, weatherData] = await Promise.all([
      reverseGeocode(lat, lon),
      fetchWeather(lat, lon),
    ]);

    const addr = geoData.address ?? {};
    const { primary, sub } = buildLocationStrings(addr);

    setText('location-name', primary);
    setText('location-sub',  sub);

    renderCurrentWeather(weatherData);
    renderHourly(weatherData);
    renderDaily(weatherData);

    hideEl('loading-state', 'error-state');
    showEl('weather-section');
  } catch (err) {
    console.error(err);
    showError('Unable to load weather data. Please try again.');
  }
}

/* ── Geolocation ────────────────────────────────────────────────── */
function autoDetectLocation() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser. Please search for a location.');
    return;
  }
  showLoading('Detecting your location…');
  navigator.geolocation.getCurrentPosition(
    pos => loadWeatherForCoords(pos.coords.latitude, pos.coords.longitude),
    err => {
      console.warn('Geolocation denied:', err.message);
      showError('Location access denied. Please search for a city or region above.');
    },
    { timeout: 10000 }
  );
}

/* ── Autocomplete ───────────────────────────────────────────────── */
function clearAutocomplete() {
  autocompleteList.innerHTML = '';
  autocompleteList.classList.add('hidden');
  currentAcItems = [];
  acSelectedIndex = -1;
}

function renderAutocomplete(results) {
  autocompleteList.innerHTML = '';
  currentAcItems = results;
  acSelectedIndex = -1;

  if (!results.length) {
    autocompleteList.classList.add('hidden');
    return;
  }

  results.forEach((item, idx) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('id', `ac-item-${idx}`);

    const addr = item.address ?? {};
    const { primary, sub } = buildLocationStrings(addr);
    const displaySub = sub || item.display_name?.split(',').slice(1, 3).join(',').trim() || '';

    li.innerHTML = `<span class="place-main">${primary}</span><br>
                    <span class="place-sub">${displaySub}</span>`;
    li.addEventListener('mousedown', e => {
      e.preventDefault(); // don't blur search input
      selectAutocompleteItem(idx);
    });
    autocompleteList.appendChild(li);
  });

  autocompleteList.classList.remove('hidden');
}

function selectAutocompleteItem(idx) {
  const item = currentAcItems[idx];
  if (!item) return;
  const addr = item.address ?? {};
  const { primary } = buildLocationStrings(addr);
  searchInput.value = primary;
  clearAutocomplete();
  loadWeatherForCoords(parseFloat(item.lat), parseFloat(item.lon));
}

async function runAutocomplete(query) {
  if (query.trim().length < 2) { clearAutocomplete(); return; }
  try {
    const results = await forwardGeocode(query);
    renderAutocomplete(results);
  } catch {
    clearAutocomplete();
  }
}

/* ── Search submission ──────────────────────────────────────────── */
async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  clearAutocomplete();
  showLoading('Searching…');
  try {
    const results = await forwardGeocode(query);
    if (!results.length) { showError(`No results found for "${query}".`); return; }
    const top = results[0];
    loadWeatherForCoords(parseFloat(top.lat), parseFloat(top.lon));
  } catch {
    showError('Search failed. Please check your connection.');
  }
}

/* ── Keyboard navigation in autocomplete ───────────────────────── */
function handleSearchKeydown(e) {
  const items = autocompleteList.querySelectorAll('li');
  if (!items.length) {
    if (e.key === 'Enter') handleSearch();
    return;
  }
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      acSelectedIndex = (acSelectedIndex + 1) % items.length;
      break;
    case 'ArrowUp':
      e.preventDefault();
      acSelectedIndex = (acSelectedIndex - 1 + items.length) % items.length;
      break;
    case 'Enter':
      e.preventDefault();
      if (acSelectedIndex >= 0) selectAutocompleteItem(acSelectedIndex);
      else handleSearch();
      return;
    case 'Escape':
      clearAutocomplete();
      return;
    default:
      return;
  }
  items.forEach((li, i) => {
    li.setAttribute('aria-selected', i === acSelectedIndex ? 'true' : 'false');
  });
  searchInput.setAttribute('aria-activedescendant', `ac-item-${acSelectedIndex}`);
}

/* ── Init ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  searchInput      = qs('#search-input');
  autocompleteList = qs('#autocomplete-list');

  /* Search events */
  searchInput.addEventListener('input', () => {
    clearTimeout(autocompleteTimer);
    autocompleteTimer = setTimeout(() => runAutocomplete(searchInput.value), 300);
  });

  searchInput.addEventListener('keydown', handleSearchKeydown);

  searchInput.addEventListener('blur', () => {
    /* Delay so mousedown on list item fires first */
    setTimeout(clearAutocomplete, 200);
  });

  qs('#search-btn').addEventListener('click', handleSearch);
  qs('#locate-btn').addEventListener('click', autoDetectLocation);
  qs('#retry-btn').addEventListener('click', autoDetectLocation);

  /* Auto-detect on load */
  autoDetectLocation();
});
