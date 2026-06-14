let tracker = null;

const $ = (selector) => document.querySelector(selector);

function setStatus(selector, message, success = false) {
  const element = $(selector);
  element.textContent = message;
  element.classList.toggle("success", success);
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function validateTracker(data) {
  if (!data?.meta || !Array.isArray(data?.updates)) {
    throw new Error("This does not look like a valid tracker.json file.");
  }
}

async function loadRemote() {
  try {
    const response = await fetch(`data/tracker.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not fetch tracker.json");
    const data = await response.json();
    validateTracker(data);
    tracker = data;
    setStatus("#loadStatus", `Loaded ${tracker.updates.length} existing updates.`, true);
  } catch (error) {
    setStatus("#loadStatus", `${error.message}. Choose the JSON file manually instead.`);
  }
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      validateTracker(data);
      tracker = data;
      setStatus("#loadStatus", `Loaded ${tracker.updates.length} existing updates from ${file.name}.`, true);
    } catch (error) {
      setStatus("#loadStatus", error.message);
    }
  };
  reader.readAsText(file);
}

function downloadJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tracker.json";
  link.click();
  URL.revokeObjectURL(url);
}

function localIsoWithOffset(localValue) {
  const date = new Date(localValue);
  return date.toISOString();
}

$("#loadButton").addEventListener("click", loadRemote);
$("#fileInput").addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) readFile(file);
});

$("#updateForm").addEventListener("submit", (event) => {
  event.preventDefault();

  if (!tracker) {
    setStatus("#formStatus", "Load the current tracker data first.");
    return;
  }

  const coordinateParts = $("#coordinates").value
    .split(",")
    .map((part) => Number(part.trim()));

  const hasCoordinates = coordinateParts.length === 2 && coordinateParts.every(Number.isFinite);
  const title = $("#title").value.trim();
  const city = $("#city").value.trim();
  const region = $("#region").value.trim();
  const timestamp = localIsoWithOffset($("#date").value);

  const update = {
    id: `${slugify(city)}-${slugify(title)}-${Date.now().toString().slice(-5)}`,
    date: timestamp,
    category: $("#category").value,
    title,
    summary: $("#summary").value.trim(),
    location: {
      city,
      region,
      ...(hasCoordinates ? { lat: coordinateParts[0], lng: coordinateParts[1] } : {})
    },
    source: {
      label: $("#sourceLabel").value.trim(),
      url: $("#sourceUrl").value.trim()
    }
  };

  tracker.updates.unshift(update);
  tracker.meta.updatedAt = new Date().toISOString();

  if (hasCoordinates && $("#category").value === "location") {
    const alreadyInRoute = tracker.route?.some(
      (stop) => stop.city.toLowerCase() === city.toLowerCase() &&
                (stop.region ?? "").toLowerCase() === region.toLowerCase()
    );

    if (!alreadyInRoute) {
      tracker.route ??= [];
      tracker.route.push({
        city,
        region,
        lat: coordinateParts[0],
        lng: coordinateParts[1]
      });
    }

    tracker.current = {
      city,
      region,
      country: tracker.current?.country ?? "",
      lat: coordinateParts[0],
      lng: coordinateParts[1],
      headline: title,
      detail: $("#summary").value.trim()
    };
  }

  downloadJson(tracker);
  setStatus("#formStatus", "Update added. tracker.json downloaded.", true);
});

const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
$("#date").value = now.toISOString().slice(0, 16);
