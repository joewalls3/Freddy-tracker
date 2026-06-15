const REQUIRED_ARRAYS = ["nextStops", "route", "updates"];

export async function loadTrackerData(url = "data/tracker.json") {
  const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Tracker data request failed (${response.status}).`);
  const data = await response.json();
  validateTrackerData(data);
  return data;
}

export function validateTrackerData(data) {
  if (!data || typeof data !== "object") throw new Error("Tracker data is not an object.");
  if (data.schemaVersion !== 1) throw new Error(`Unsupported tracker schema version: ${data.schemaVersion ?? "missing"}.`);
  if (!data.meta || !data.current) throw new Error("Tracker data is missing meta or current status.");
  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(data[key])) throw new Error(`Tracker data field '${key}' must be an array.`);
  }
  for (const [index, stop] of data.route.entries()) {
    if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) {
      throw new Error(`Route stop ${index + 1} has invalid coordinates.`);
    }
  }
  for (const update of data.updates) {
    if (!update.id || !update.date || !update.title || !update.category) {
      throw new Error("One or more updates are missing required fields.");
    }
  }
  return true;
}
