# Where's Freddy?

A polished, static, GitHub Pages–friendly tracker for Freddy's public 2026 World Cup road-trip updates.

## What is included

- Responsive public tracker
- Approximate city-level route map
- Current location and upcoming stops
- Filterable update timeline
- Source links for every update
- Stale-data warning
- Browser-based update helper
- No framework, database, API key, or build step

## Deploy to GitHub Pages

1. Create a new **public** GitHub repository. A name like `freddy-tracker` works well.
2. Upload every file and folder from this project to the repository's `main` branch.
3. Open the repository's **Settings**.
4. Select **Pages** in the left sidebar.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select `main` and `/(root)`, then save.
7. GitHub will publish the site at:

   `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`

The `.nojekyll` file is intentional. Keep it in the repository.

## Update the tracker

### Easy method

1. Open `admin.html` on the live site.
2. Load the current data.
3. Fill out the new update.
4. Download the generated `tracker.json`.
5. Replace `data/tracker.json` in GitHub and commit.

### Direct method

Edit `data/tracker.json`.

Important fields:

- `meta.updatedAt`: update this whenever the data changes.
- `current`: the latest city-level status.
- `nextStops`: reported or planned upcoming stops.
- `route`: cities shown on the map.
- `updates`: timeline entries, newest first.

## Test locally

Browsers normally block `fetch()` when a site is opened directly from the file system. Run a tiny local server instead:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Data policy

This project is intentionally limited to:

- Public posts
- Published reporting
- Approximate city-level locations
- Links to sources

Do not add private information, hotels that have not already been publicly disclosed, precise coordinates, personal contact information, or speculative real-time positioning.

## Technical structure

```text
.
├── index.html
├── styles.css
├── app.js
├── admin.html
├── admin.js
├── data/
│   └── tracker.json
├── .nojekyll
├── LICENSE
└── README.md
```

## Customization

The design is controlled through CSS variables at the top of `styles.css`. The site's title, X profile, current status, route, and timeline live in `data/tracker.json`.

## License

MIT. Reporting, logos, names, and linked source material remain the property of their respective owners.
