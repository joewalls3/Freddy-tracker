import { clear, make } from "../utils/dom.js";

const LEAFLET_VERSION = "1.9.4";
const LEAFLET_SCRIPT = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
const LEAFLET_STYLES = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const LOAD_TIMEOUT_MS = 6_000;
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
});
let mapInstance = null;
let leafletPromise = null;

function locationName(stop) {
  return [stop.city, stop.region].filter(Boolean).join(", ");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMATTER.format(date);
}

function formatVisitDate(stop) {
  const start = formatDate(stop.date);
  const end = formatDate(stop.dateEnd);
  return [start, end].filter(Boolean).join(" – ");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeSource(source) {
  if (!source?.url || !source?.label) return null;
  try {
    const url = new URL(source.url);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return { label: source.label, url: url.href };
  } catch {
    return null;
  }
}

function instagramEmbed(source, stop) {
  if (!source) return "";

  const url = new URL(source.url);
  if (!["instagram.com", "www.instagram.com"].includes(url.hostname)) return "";

  const match = url.pathname.match(/^\/(?:[^/]+\/)?(p|reel)\/([A-Za-z0-9_-]+)\/?$/);
  if (!match) return "";

  const [, postType, shortcode] = match;
  const embedUrl = `https://www.instagram.com/${postType}/${shortcode}/embed/captioned/`;
  const title = `Instagram post for ${locationName(stop)}`;

  return `
    <div class="map-social-embed map-instagram-embed">
      <iframe
        src="${escapeHtml(embedUrl)}"
        title="${escapeHtml(title)}"
        loading="lazy"
        allowtransparency="true"
        scrolling="no"
      ></iframe>
    </div>
  `;
}

function xEmbed(source, stop) {
  if (!source) return "";

  const url = new URL(source.url);
  const allowedHosts = ["twitter.com", "www.twitter.com", "x.com", "www.x.com"];
  const match = url.pathname.match(/^\/[^/]+\/status\/(\d+)\/?$/);
  if (!allowedHosts.includes(url.hostname) || !match) return "";

  const embedUrl = new URL("https://platform.twitter.com/embed/Tweet.html");
  embedUrl.searchParams.set("id", match[1]);
  embedUrl.searchParams.set("theme", "dark");
  embedUrl.searchParams.set("dnt", "true");
  const title = `X post for ${locationName(stop)}`;

  return `
    <div class="map-social-embed map-x-embed">
      <iframe
        src="${escapeHtml(embedUrl.href)}"
        title="${escapeHtml(title)}"
        loading="lazy"
        allowtransparency="true"
        scrolling="no"
      ></iframe>
    </div>
  `;
}

function socialEmbed(stop, source) {
  if (stop.media?.type === "story-recap") {
    return '<span class="map-story-label">Instagram Story recap</span>';
  }

  return instagramEmbed(source, stop) || xEmbed(source, stop);
}

function hydratePopupEmbeds(popup) {
  const popupElement = popup.getElement();
  if (!popupElement) return;

  popupElement.querySelectorAll("iframe").forEach((frame) => {
    frame.addEventListener("load", () => popup.update(), { once: true });
  });

}

function visitPopup(stop, index, routeLength) {
  const source = safeSource(stop.source);
  const sourceLink = source
    ? `<a class="map-popup-source" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">View source: ${escapeHtml(source.label)} ↗</a>`
    : "";
  const category = stop.category
    ? `<span class="map-popup-category">${escapeHtml(stop.category.replaceAll("-", " "))}</span>`
    : "";
  const embed = socialEmbed(stop, source);

  return `
    <article class="map-popup-visit">
      <div class="map-popup-meta">
        <span>Stop ${index + 1} of ${routeLength}</span>
        ${category}
      </div>
      <h3>${escapeHtml(locationName(stop))}</h3>
      <time>${escapeHtml(formatVisitDate(stop))}</time>
      <strong>${escapeHtml(stop.title || "Route stop")}</strong>
      <p>${escapeHtml(stop.summary || "No additional details have been added for this stop yet.")}</p>
      ${embed}
      ${sourceLink}
    </article>
  `;
}

function groupVisits(route) {
  const groups = new Map();

  route.forEach((stop, index) => {
    const key = `${stop.lat.toFixed(4)},${stop.lng.toFixed(4)}`;
    const group = groups.get(key) ?? { lat: stop.lat, lng: stop.lng, visits: [] };
    group.visits.push({ stop, index });
    groups.set(key, group);
  });

  return [...groups.values()];
}

function renderFallback(container, route, message) {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  clear(container);
  container.className = "map-fallback";
  container.append(make("strong", { text: message }));
  const list = make("ol", { className: "map-fallback-list" });

  route.forEach((stop, index) => {
    const item = make("li");
    item.append(make("span", { className: "map-fallback-number", text: index + 1 }));
    const content = make("div");
    content.append(make("strong", { text: locationName(stop) }));
    if (stop.date) content.append(make("time", { text: formatVisitDate(stop) }));
    if (stop.title) content.append(make("b", { text: stop.title }));
    if (stop.summary) content.append(make("p", { text: stop.summary }));

    const source = safeSource(stop.source);
    if (source) {
      content.append(
        make("a", {
          className: "map-popup-source",
          text: `View source: ${source.label} ↗`,
          attrs: { href: source.url, target: "_blank", rel: "noopener noreferrer" }
        })
      );
    }

    item.append(content);
    list.append(item);
  });

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

function markerLabel(visits) {
  if (visits.length === 1) return String(visits[0].index + 1);
  return visits.map(({ index }) => index + 1).join("/");
}

function addLegend(L) {
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = () => {
    const element = L.DomUtil.create("div", "map-legend");
    element.innerHTML = `
      <strong>Route key</strong>
      <span><i class="map-legend-dot start"></i>Trip start</span>
      <span><i class="map-legend-dot stop"></i>Route stop</span>
      <span><i class="map-legend-dot final"></i>Final stop</span>
    `;
    return element;
  };
  legend.addTo(mapInstance);
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
    L.polyline(points, { color: "#f2c94c", weight: 3, dashArray: "7 9", opacity: 0.8 }).addTo(mapInstance);

    groupVisits(route).forEach(({ lat, lng, visits }) => {
      const isStart = visits.some(({ index }) => index === 0);
      const isFinal = visits.some(({ index }) => index === route.length - 1);
      const stateClass = isStart ? "start" : isFinal ? "final" : "stop";
      const label = markerLabel(visits);
      const icon = L.divIcon({
        className: "route-marker-shell",
        html: `<span class="route-marker ${stateClass}${visits.length > 1 ? " multiple" : ""}">${escapeHtml(label)}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18]
      });
      const marker = L.marker([lat, lng], {
        icon,
        title: visits.map(({ stop }) => locationName(stop)).join(" / ")
      }).addTo(mapInstance);

      marker.bindPopup(
        `<div class="map-popup${visits.length > 1 ? " multiple" : ""}">
          ${visits.map(({ stop, index }) => visitPopup(stop, index, route.length)).join("")}
        </div>`,
        { maxWidth: 430, minWidth: 280 }
      );
      marker.on("popupopen", ({ popup }) => hydratePopupEmbeds(popup));
    });

    addLegend(L);
    mapInstance.fitBounds(points, { padding: [34, 34], maxZoom: 6 });
    statusElement.textContent = `${route.length} documented visits. Select a numbered marker for dates, recaps, and embedded posts.`;
    requestAnimationFrame(() => mapInstance?.invalidateSize());
  } catch (error) {
    console.warn(error);
    renderFallback(container, route, "Interactive map unavailable. The detailed route list is shown instead.");
    statusElement.textContent = "The map service did not load; all route details remain available below.";
  }
}
