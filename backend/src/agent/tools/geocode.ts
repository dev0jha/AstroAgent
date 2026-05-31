import axios from "axios";
import { find } from "geo-tz";

// Simple in-memory cache
const geocodeCache = new Map<string, GeoResult>();

export interface GeoResult {
  latitude: number;
  longitude: number;
  timezone: string;
  displayName: string;
}

export async function geocodePlace(place: string): Promise<GeoResult> {
  const key = place.toLowerCase().trim();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  const resp = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: { q: place, format: "json", limit: 1 },
    headers: { "User-Agent": "aradhana-agentic-app/1.0" },
    timeout: 8000,
  });

  if (!resp.data || resp.data.length === 0) {
    throw new Error(`Place not found: "${place}". Please provide a more specific location name.`);
  }

  const result = resp.data[0];
  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);

  // geo-tz returns IANA timezone from lat/lon
  const tzArr = find(lat, lon);
  if (!tzArr || tzArr.length === 0) {
    throw new Error(`Could not determine timezone for "${place}".`);
  }

  const geo: GeoResult = {
    latitude: lat,
    longitude: lon,
    timezone: tzArr[0],
    displayName: result.display_name,
  };

  geocodeCache.set(key, geo);
  return geo;
}
