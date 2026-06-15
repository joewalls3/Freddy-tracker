import { loadTrackerData } from "./services/tracker-service.js";
import { renderDashboard } from "./views/dashboard-view.js";
import { renderMap } from "./views/map-view.js";
import { renderTimeline } from "./views/timeline-view.js";
import { select, selectAll } from "./utils/dom.js";

const state = { data: null, filter: "all" };

function showToast(message) {
  const toast = select("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function render() {
  renderDashboard(state.data);
  renderTimeline(select("#timeline"), state.data.updates, state.filter);
  renderMap(select("#map"), select("#mapStatus"), state.data.route);
}

async function refresh({ notify = false } = {}) {
  const button = select("#refreshButton");
  button.disabled = true;
  button.textContent = "Refreshing…";

  try {
    state.data = await loadTrackerData();
    render();
    if (notify) showToast("Tracker refreshed.");
  } catch (error) {
    console.error(error);
    select("#freshnessLabel").textContent = "Tracker failed to load";
    select("#timeline").replaceChildren();
    const notice = document.createElement("div");
    notice.className = "notice error";
    notice.textContent = `Could not load tracker data: ${error.message}`;
    select("#timeline").append(notice);
    select("#mapStatus").textContent = "Map unavailable because tracker data did not load.";
    if (notify) showToast("Refresh failed.");
  } finally {
    button.disabled = false;
    button.textContent = "Refresh";
  }
}

select("#filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button || !state.data) return;

  state.filter = button.dataset.filter;
  selectAll(".filter").forEach((item) => {
    const active = item === button;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  renderTimeline(select("#timeline"), state.data.updates, state.filter);
});

select("#refreshButton").addEventListener("click", () => refresh({ notify: true }));
select("#shareButton").addEventListener("click", async () => {
  const share = {
    title: state.data?.meta?.siteTitle ?? "Where's Freddy?",
    text: state.data
      ? `Freddy is currently reported in ${state.data.current.city}, ${state.data.current.region}.`
      : "Check out this Freddy tracker.",
    url: window.location.href
  };

  try {
    if (navigator.share) await navigator.share(share);
    else {
      await navigator.clipboard.writeText(share.url);
      showToast("Link copied.");
    }
  } catch (error) {
    if (error?.name !== "AbortError") showToast("Could not share the link.");
  }
});

refresh();
