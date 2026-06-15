import { validateTrackerData } from "./services/tracker-service.js";
import { select } from "./utils/dom.js";

let tracker = null;

function status(selector, message) {
  select(selector).textContent = message;
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function download(data) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tracker.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function loadLive() {
  try {
    const response = await fetch(`data/tracker.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Request failed (${response.status}).`);
    tracker = await response.json();
    validateTrackerData(tracker);
    status("#loadStatus", `Loaded ${tracker.updates.length} existing updates.`);
  } catch (error) {
    status("#loadStatus", `Could not load live data: ${error.message}`);
  }
}

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      tracker = JSON.parse(reader.result);
      validateTrackerData(tracker);
      status("#loadStatus", `Loaded ${tracker.updates.length} updates from ${file.name}.`);
    } catch (error) {
      status("#loadStatus", `Invalid file: ${error.message}`);
    }
  };
  reader.readAsText(file);
}

select("#loadButton").addEventListener("click", loadLive);
select("#fileInput").addEventListener("change", (event) => {
  if (event.target.files[0]) loadFile(event.target.files[0]);
});

select("#updateForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!tracker) {
    status("#formStatus", "Load the current tracker first.");
    return;
  }

  const coordinates = select("#coordinates").value.split(",").map((value) => Number(value.trim()));
  const hasCoordinates = coordinates.length === 2 && coordinates.every(Number.isFinite);
  const city = select("#city").value.trim();
  const region = select("#region").value.trim();
  const category = select("#category").value;
  const title = select("#title").value.trim();
  const summary = select("#summary").value.trim();

  const update = {
    id: `${slugify(city)}-${slugify(title)}-${Date.now().toString().slice(-6)}`,
    date: new Date(select("#date").value).toISOString(),
    category,
    title,
    summary,
    location: { city, region },
    source: {
      label: select("#sourceLabel").value.trim(),
      url: select("#sourceUrl").value.trim()
    }
  };

  tracker.updates.unshift(update);
  tracker.meta.updatedAt = new Date().toISOString();

  if (category === "location" && hasCoordinates) {
    const exists = tracker.route.some((stop) =>
      stop.city.toLowerCase() === city.toLowerCase() &&
      (stop.region ?? "").toLowerCase() === region.toLowerCase()
    );
    if (!exists) tracker.route.push({ city, region, lat: coordinates[0], lng: coordinates[1] });
    tracker.current = { city, region, headline: title, detail: summary };
  }

  validateTrackerData(tracker);
  download(tracker);
  status("#formStatus", "Validated tracker.json downloaded.");
});

const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
select("#date").value = now.toISOString().slice(0, 16);
