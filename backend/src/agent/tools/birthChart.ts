import axios from "axios";
import { NatalChart } from "../state";

const SIDECAR_URL = process.env.EPHEMERIS_SIDECAR_URL ?? "http://localhost:8001";

export async function computeBirthChart(
  date: string,
  time: string | null,
  latitude: number,
  longitude: number,
  timezone: string
): Promise<NatalChart> {
  const resp = await axios.post(`${SIDECAR_URL}/compute-chart`, {
    date,
    time: time ?? null,
    latitude,
    longitude,
    timezone,
  }, { timeout: 15000 });

  const d = resp.data;

  // Normalize snake_case from Python sidecar → camelCase
  return {
    sunSign: d.sun_sign,
    moonSign: d.moon_sign,
    ascendant: d.ascendant,
    ascendantDegree: d.ascendant_degree,
    timeUnknown: d.time_unknown ?? false,
    computedAt: d.computed_at,
    planets: Object.fromEntries(
      Object.entries(d.planets).map(([name, p]: [string, any]) => [
        name,
        {
          sign: p.sign,
          degree: p.degree,
          absoluteDegree: p.absolute_degree,
          house: p.house,
          retrograde: p.retrograde,
        },
      ])
    ),
    houses: Object.fromEntries(
      Object.entries(d.houses).map(([num, h]: [string, any]) => [
        num,
        { sign: h.sign, cuspDegree: h.cusp_degree },
      ])
    ),
  };
}
