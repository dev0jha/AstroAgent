import axios from "axios";
import { TransitData, NatalChart } from "../state";

const SIDECAR_URL = process.env.EPHEMERIS_SIDECAR_URL ?? "http://localhost:8001";

export async function getDailyTransits(
  date: string,
  natalChart: NatalChart
): Promise<TransitData> {
  // Convert camelCase NatalChart back to snake_case for the Python sidecar
  const natalForSidecar = {
    sun_sign: natalChart.sunSign,
    moon_sign: natalChart.moonSign,
    ascendant: natalChart.ascendant,
    planets: Object.fromEntries(
      Object.entries(natalChart.planets).map(([name, p]) => [
        name,
        {
          sign: p.sign,
          degree: p.degree,
          absolute_degree: p.absoluteDegree,
          house: p.house,
          retrograde: p.retrograde,
        },
      ])
    ),
  };

  const resp = await axios.post(`${SIDECAR_URL}/compute-transits`, {
    date,
    natal_chart: natalForSidecar,
  }, { timeout: 15000 });

  const d = resp.data;
  return {
    date: d.date,
    transitingPlanets: Object.fromEntries(
      Object.entries(d.transiting_planets).map(([name, p]: [string, any]) => [
        name,
        { sign: p.sign, degree: p.degree, absoluteDegree: p.absolute_degree },
      ])
    ),
    notableTransits: d.notable_transits.map((t: any) => ({
      transitingPlanet: t.transiting_planet,
      natalPlanet: t.natal_planet,
      aspect: t.aspect,
      orb: t.orb,
      description: t.description,
    })),
  };
}
