# Where's Freddy?

A static, GitHub Pages–friendly tracker for Freddy's public World Cup road-trip updates.

## Architecture

```text
index.html                              Public page shell
admin.html                              Browser-based update helper
assets/css/styles.css                   Shared design system
assets/js/app.js                        Application bootstrap and events
assets/js/admin.js                      Update-helper controller
assets/js/services/tracker-service.js   Data loading and schema validation
assets/js/views/dashboard-view.js       Current status and summary cards
assets/js/views/timeline-view.js        Filterable update timeline
assets/js/views/map-view.js             Leaflet map with a no-CDN fallback
assets/js/utils/dom.js                  Safe DOM helpers
data/tracker.json                       Single source of truth for tracker content
```

The UI, data, map, and update workflow are separated so the project can grow without rewriting the entire site.

## Updating content

Open the deployed `admin.html`, load the live tracker, add an update, and download the validated `tracker.json`. Replace `data/tracker.json` in GitHub and commit.

## GitHub Pages

In repository **Settings → Pages**, publish from the `main` branch and `/(root)` folder.

Project URL:

```text
https://joewalls3.github.io/Freddy-tracker/
```

## Local testing

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Privacy rules

Use public posts and published reporting only. Keep locations at city level. Do not add private contact information, unpublished hotels, or precise real-time coordinates.
