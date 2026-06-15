import { clear, make } from "../utils/dom.js";

const LEAFLET_VERSION = "1.9.4";
const LEAFLET_SCRIPT = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
const LEAFLET_STYLES = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const LOAD_TIMEOUT_MS = 6_000;
let mapInstance = null;
let leafletPromise = null;

function renderFallback(container, route, message) {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
  clear(container);
  container.className = "map-fallback";
  container.append(make("strong", { text: message }));
  const list = make("ol");
  for (const stop of route) {
    list.append(make("li", { text: [stop.city, stop.region].filter(Boolean).join(", ") }));
  }
  container.append(list);
}

function ensureLeafletStyles() {
  if (document.querySelector('link[data-leaflet-styles]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = LEAFLET_STYLES;
  link.dataset.leafletStyles = "true";
  document.head.append(link);
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    ensureLeafletStyles();
    const existing = document.querySelector('script[data-leaflet-script]');
    const script = existing ?? document.createElement("script");
    const timer = window.setTimeout(() => reject(new Error("Map library timed out.")), LOAD_TIMEOUT_MS);

    const finish = (callback) => {
      window.clearTimeout(timer);
      callback();
    };

    script.addEventListener(
      "load",
      () => finish(() => window.L ? resolve(window.L) : reject(new Error("Map library loaded incorrectly."))),
      { once: true }
    );
    script.addEventListener(
      "error",
      () => finish(() => reject(new Error("Map library could not be downloaded."))),
      { once: true }
    );

    if (!existing) {
      script.src = LEAFLET_SCRIPT;
      script.async = true;
      script.dataset.leafletScript = "true";
      document.head.append(script);
    }
  }).catch((error) => {
    leafletPromise = null;
    throw error;
  });

  return leafletPromise;
}

export async function renderMap(container, statusElement, route) {
  if (route.length === 0) {
    renderFallback(container, route, "No route stops have been added yet.");
    statusElement.textContent = "Add a route stop to data/tracker.json to enable the map.";
    return;
  }

  try {
    const L = await loadLeaflet();
    if (mapInstance) mapInstance.remove();
    clear(container);
    container.className = "";

    mapInstance = L.map(container, { scrollWheelZoom: false });
    const tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    });
    tileLayer.on("tileerror", () => {
      statusElement.textContent = "Some map tiles could not load. Route markers remain available.";
    });
    tileLayer.addTo(mapInstance);

    const points = route.map((stop) => [stop.lat, stop.lng]);
    L.polyline(points, { color: "#f2c94c", weight: 3, dashArray: "7 9" }).addTo(mapInstance);
    route.forEach((stop, index) => {
      const current = index === route.length - 1;
      L.circleMarker([stop.lat, stop.lng], {
        radius: current ? 9 : 6,
        color: "#0b0d12",
        weight: 3,
        fillColor: current ? "#e53e4d" : "#f5f7fb",
        fillOpacity: 1
      }).bindPopup(`<strong>${stop.city}</strong><br>${stop.region ?? ""}`).addTo(mapInstance);
    });

    mapInstance.fitBounds(points, { padding: [30, 30], maxZoom: 6 });
    requestAnimationFrame(() => mapInstance?.invalidateSize());
  } catch (error) {
    console.warn(error);
    renderFallback(container, route, "Interactive map unavailable. The route list is shown instead.");
    statusElement.textContent = "The map service did not load; tracker updates are still working.";
  }
}
