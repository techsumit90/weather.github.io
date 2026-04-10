# 🌤️ Atmos — Hyperlocal Weather App

> A beautiful, fully responsive weather web app with glassmorphism UI, dynamic theming, live search, and 7-day forecasts — built with **zero dependencies** using pure HTML, CSS & JavaScript.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue?logo=github)](https://techsumit90.github.io/weather.github.io/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2020-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

🔗 **Live Demo:** [https://techsumit90.github.io/weather.github.io/](https://techsumit90.github.io/weather.github.io/)

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📍 **Auto Location** | Requests GPS on load and renders weather for your exact county/region instantly |
| 🔍 **Live Autocomplete** | Debounced search with OSM Nominatim — suggestions appear as you type |
| 🌡️ **Current Conditions** | Temperature, feels-like, humidity, wind speed, visibility, and precipitation chance |
| 🎨 **Dynamic Theming** | Background gradient shifts by weather condition and switches to a starry night theme after dark |
| ⏱️ **24-Hour Forecast** | Horizontally scrollable strip with icon, temperature, and precipitation % |
| 📅 **7-Day Forecast** | High/low temps with a proportional visual range bar for the full week |
| 🗺️ **County-level Geocoding** | Displays county, state, and country extracted via reverse geocoding |
| 🔒 **No API Keys** | 100 % free data sources — clone and run without signing up for anything |

---

## 📁 Project Structure

```
weather.github.io/
│
├── index.html              # HTML shell — layout, semantic markup, ARIA roles
├── assets/
│   ├── css/
│   │   └── style.css       # All styles — glassmorphism, themes, animations, responsive grid
│   └── js/
│       └── app.js          # All logic — modular sections: config, API, renderer, search, init
└── README.md               # This file
```

**Design principles:**
- **Separation of concerns** — HTML for structure, CSS for presentation, JS for behaviour.
- **Modular JS** — `app.js` is divided into ten clearly labelled sections (CONFIG, WMO_CODES, Theme, Stars, Utilities, API, Renderer, State Helpers, Search, Init) so each concern can be located and updated in isolation.
- **Zero build tooling** — No bundler, no transpiler, no package manager. Works directly in any modern browser.

---

## 🚀 Getting Started

No build tools. No npm. No setup required.

```bash
# 1. Clone the repository
git clone https://github.com/techsumit90/weather.github.io.git

# 2. Open the project folder
cd weather.github.io

# 3. Serve locally (required for GPS auto-detect)
python -m http.server 8080
# Then open: http://localhost:8080
```

> **Note:** GPS auto-detect requires a secure context (`https://` or `localhost`). Opening `index.html` directly via `file://` will skip auto-detect and fall back to manual search.

**Alternatives to Python's server:**

```bash
# Node.js (npx)
npx serve .

# VS Code
# Install the "Live Server" extension and click "Go Live"
```

---

## 🌐 APIs Used

| Service | Purpose | Cost |
|---------|---------|------|
| [Open-Meteo](https://open-meteo.com) | Weather data (current, hourly, daily) | ✅ Free, no API key |
| [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org) | Reverse geocoding + search autocomplete | ✅ Free, no API key |

---

## 🎨 Weather Themes

The app dynamically changes the entire background gradient based on current conditions:

| Condition | Theme Class | Visual |
|-----------|-------------|--------|
| ☀️ Clear / Mainly clear | `sunny` | Bright sky-blue gradient |
| ⛅ Cloudy / Overcast | `cloudy` | Muted blue-grey tones |
| 🌧️ Rain / Drizzle / Showers | `rainy` | Deep navy-blue gradient |
| ⛈️ Thunderstorm | `stormy` | Very dark near-black gradient |
| ❄️ Snow | `snowy` | Light icy pale blue-white (dark text) |
| 🌫️ Fog | `foggy` | Soft grey-blue mist (dark text) |
| 🌙 Night (any condition) | `night` | Deep dark navy with animated twinkling stars |

Adding a new theme requires only:
1. A new CSS class in `assets/css/style.css` with overridden CSS variables.
2. A one-line condition in the `getTheme()` function in `assets/js/app.js`.

---

## 🛠️ Tech Stack

| Technology | Usage |
|------------|-------|
| **HTML5** | Semantic structure, ARIA roles, Open Graph meta tags |
| **CSS3** | Custom properties (tokens), glassmorphism, CSS Grid, Flexbox, keyframe animations |
| **Vanilla JavaScript (ES2020+)** | Async/await, optional chaining, numeric separators — no frameworks |
| **Google Fonts** | Outfit (UI) + DM Serif Display (headings) |
| **GitHub Pages** | Free static hosting, zero-config deploy |

---

## 📦 Deployment (GitHub Pages)

This project is deployed via **GitHub Pages** from the `main` branch.

To deploy your own fork:
1. Fork this repository.
2. Go to **Settings → Pages**.
3. Set the source to `main` branch, `/ (root)` folder.
4. Save — your site will be live at `https://<your-username>.github.io/<repo-name>/`.

---

## 🔮 Future Enhancements

- [ ] **°C / °F toggle** — Unit switcher with preference saved to `localStorage`.
- [ ] **UV Index** — Add UV index to the current-conditions stat grid via Open-Meteo's UV variable.
- [ ] **Air Quality (AQI)** — Integrate [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) for PM2.5 / ozone data.
- [ ] **Sunrise & Sunset** — Show daily sunrise/sunset times using Open-Meteo's `daily` fields.
- [ ] **Offline Support (PWA)** — Add a Service Worker and `manifest.json` to enable "Add to Home Screen" and offline caching.
- [ ] **Saved Locations** — Persist a list of favourite cities in `localStorage` for one-tap access.
- [ ] **Weather Alerts** — Surface any active weather warnings from national met services.
- [ ] **Dark / Light mode override** — Respect `prefers-color-scheme` and allow manual override.
- [ ] **Animated Weather Icons** — Replace emoji with SVG Lottie animations for richer visual feedback.
- [ ] **Accessibility audit** — Full WCAG 2.1 AA compliance pass (contrast ratios, keyboard navigation).

---

## 🙋‍♂️ Author

**Sumit** — [GitHub @techsumit90](https://github.com/techsumit90)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">Made with ❤️ and ☁️ &nbsp;|&nbsp; <a href="https://techsumit90.github.io/weather.github.io/">Live Site</a></p>
