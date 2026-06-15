import { clear, make } from "../utils/dom.js";

const TIMEZONE = "America/New_York";

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: TIMEZONE
  }).format(new Date(value));
}

export function renderTimeline(container, updates, filter = "all") {
  clear(container);
  const visible = [...updates]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter((update) => filter === "all" || update.category === filter);

  if (visible.length === 0) {
    container.append(make("div", { className: "notice", text: "No updates in this category yet." }));
    return;
  }

  for (const update of visible) {
    const card = make("article", { className: "update-card", attrs: { id: update.id } });
    const top = make("div", { className: "update-top" });
    top.append(
      make("h3", { text: update.title }),
      make("span", { className: "badge", text: update.category })
    );

    const meta = make("div", { className: "update-meta" });
    const location = [update.location?.city, update.location?.region].filter(Boolean).join(", ");
    if (location) meta.append(make("span", { text: `📍 ${location}` }));
    meta.append(make("span", { text: formatDate(update.date) }));

    if (update.source?.url) {
      meta.append(make("a", {
        className: "source-link",
        text: `Source: ${update.source.label} ↗`,
        attrs: { href: update.source.url, target: "_blank", rel: "noopener noreferrer" }
      }));
    }

    card.append(top, make("p", { text: update.summary }), meta);
    container.append(card);
  }
}
