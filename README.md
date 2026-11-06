# Arslan Ashrafi — Cosmic Birthday Experience

A lightweight static birthday website. It uses local HTML, CSS, JavaScript, and SVG artwork; the optional display fonts are loaded from Google Fonts with system fallbacks.

## Run locally

Open `index.html` directly, or serve the folder with any static file server. For example, with Python:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## GitHub Pages

The site uses relative asset and section links, so it can be served from the repository root at `https://behnooddev.github.io/Birthday-ARASH/` without a bundler or base-path setting. The included GitHub Actions workflow deploys the repository root to GitHub Pages whenever a commit reaches `main`. In the repository's Pages settings, select **GitHub Actions** as the build and deployment source if it is not already selected.

## Files

- `index.html` — page structure and content
- `styles.css` — visual system, responsive layout, and motion preferences
- `app.js` — reveal effects, interactive sound display, and puzzle feedback
- `favicon.svg` — local site icon

