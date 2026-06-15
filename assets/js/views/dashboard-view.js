import { clear, make, select } from "../utils/dom.js";

const TIMEZONE = "America/New_York";

function formatTimestamp(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: TIMEZONE
  }).format(new Date(value));
}

function dateParts(value) {
  const date = new Date(`${value}T12:00:00`);
  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
    day: new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(date)
  };
}

export function renderDashboard(data) {
  document.title = data.meta.siteTitle;
  select("#tagline").textContent = data.meta.tagline;
  select("#lastUpdated").textContent = `Last updated ${formatTimestamp(data.meta.updatedAt)}`;
  select("#profileLink").href = data.meta.profileUrl;
  select("#disclaimer").textContent = data.meta.disclaimer;

  const ageHours = (Date.now() - new Date(data.meta.updatedAt)) / 3_600_000;
  select("#freshnessLabel").textContent = ageHours <= 24 ? "Recently updated" : "Update may be stale";
  select(".status-dot").classList.toggle("stale", ageHours > 24);

  select("#currentLocation").textContent = [data.current.city, data.current.region].filter(Boolean).join(", ");
  select("#currentHeadline").textContent = data.current.headline;
  select("#currentDetail").textContent = data.current.detail;

  const nextStops = select("#nextStops");
  clear(nextStops);
  if (data.nextStops.length === 0) {
    nextStops.append(make("p", { className: "muted", text: "No reported next stop yet." }));
  }
  for (const stop of data.nextStops) {
    const item = make("div", { className: "next-stop" });
    const chip = make("div", { className: "date-chip" });
    const parts = dateParts(stop.date);
    chip.append(make("strong", { text: parts.day }), make("span", { text: parts.month }));
    const content = make("div");
    content.append(
      make("h3", { text: [stop.city, stop.region].filter(Boolean).join(", ") }),
      make("p", { text: stop.note })
    );
    item.append(chip, content);
    nextStops.append(item);
  }

  select("#routeCount").textContent = String(data.route.length);
  select("#updateCount").textContent = String(data.updates.length);
  const elapsed = Math.max(1, Math.floor((Date.now() - new Date(data.meta.tripStart)) / 86_400_000) + 1);
  select("#dayCount").textContent = String(elapsed);
}
