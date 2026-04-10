# 🌤️ Atmos — Hyperlocal Weather App

> A beautiful, fully responsive weather web app with glassmorphism UI, dynamic theming, live search, and 7-day forecasts — built with pure HTML, CSS & JavaScript.

🔗 **Live Demo:** [https://techsumit90.github.io/weather.github.io/](https://techsumit90.github.io/weather.github.io/)

---

## ✨ Features

- 📍 **Auto Location Detection** — On load, asks for GPS permission and instantly shows weather for your exact county/region
- 🔍 **Live Search with Autocomplete** — Type any city, county, or region worldwide; suggestions appear as you type via OpenStreetMap
- 🌡️ **Current Weather Display** — Temperature, condition, feels-like, humidity, wind speed, visibility, and precipitation chance
- 🎨 **Dynamic Theming** — Background gradient shifts based on weather (sunny blue, stormy dark, snowy pale, foggy grey) and switches to a starry night theme after dark
- ⏱️ **24-Hour Hourly Forecast** — Horizontally scrollable with weather icon, temperature, and precipitation % per hour
- 📅 **7-Day Daily Forecast** — Shows high/low temps with a proportional visual range bar for easy comparison
- 🗺️ **County-level Location** — Displays county, state, and country extracted from reverse geocoding so you always know the precise administrative region

---

## 📁 Project Structure

```
weather.github.io/
│
├── index.html       # HTML structure — layout & component scaffolding
├── style.css        # All styles — glassmorphism, themes, animations, responsive grid
├── app.js           # All logic — API calls, geocoding, search, rendering
└── README.md        # You are here
```

---

## 🚀 Getting Started (Run Locally)

No build tools. No npm. No setup.

```bash
# 1. Clone the repository
git clone https://github.com/techsumit90/weather.github.io.git

# 2. Open the project folder
cd weather.github.io

# 3. Open index.html in your browser
# On Windows:
start index.html

# On macOS:
open index.html

# On Linux:
xdg-open index.html
```

> ⚠️ For GPS auto-detect to work, open via a local server or GitHub Pages (not by double-clicking the file directly), as browsers block geolocation on `file://` URLs.

**Quick local server (optional):**
```bash
# Python 3
python -m http.server 8080

# Then visit: http://localhost:8080
```

---

## 🌐 APIs Used

| Service | Purpose | Cost |
|--------|---------|------|
| [Open-Meteo](https://open-meteo.com) | Weather data (current, hourly, daily) | ✅ Free, no API key |
| [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org) | Reverse geocoding + search autocomplete | ✅ Free, no API key |

No API keys needed — just clone and run!

---

## 🎨 Weather Themes

The app dynamically changes the entire background gradient based on current conditions:

| Condition | Theme |
|-----------|-------|
| ☀️ Clear / Mainly clear | Bright blue sky gradient |
| ⛅ Cloudy / Overcast | Muted blue-grey tones |
| 🌧️ Rain / Drizzle / Showers | Deep navy-blue gradient |
| ⛈️ Thunderstorm | Very dark near-black gradient |
| ❄️ Snow | Light icy pale blue-white |
| 🌫️ Fog | Soft grey-blue mist tones |
| 🌙 Night (any condition) | Deep dark navy with animated twinkling stars |

---

## 📸 Screenshots

| Clear Day | Rainy | Night Mode |
|-----------|-------|------------|
| *(Sunny blue gradient with stats)* | *(Deep navy card UI)* | *(Starry dark sky)* |

> Replace these placeholders with actual screenshots from your live site.

---

## 🛠️ Tech Stack

- **HTML5** — Semantic structure
- **CSS3** — Custom properties, glassmorphism, CSS Grid, Flexbox, keyframe animations
- **Vanilla JavaScript (ES2020+)** — No frameworks, no dependencies
- **Google Fonts** — Outfit + DM Serif Display
- **GitHub Pages** — Free static hosting

---

## 📦 Deployment (GitHub Pages)

This project is deployed via **GitHub Pages** from the `main` branch.

To deploy your own fork:
1. Fork this repository
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)` folder
4. Save — your site will be live at `https://<your-username>.github.io/<repo-name>/`

---

## 🙋‍♂️ Author

**Sumit** — [GitHub @techsumit90](https://github.com/techsumit90)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">Made with ❤️ and ☁️ | <a href="https://techsumit90.github.io/weather.github.io/">Live Site</a></p>
