import swisseph as swe
from datetime import datetime
import pytz
from typing import Optional

swe.set_ephe_path('')  # Use built-in Moshier ephemeris — no data files needed

PLANETS = [
    (swe.SUN,     "Sun"),
    (swe.MOON,    "Moon"),
    (swe.MERCURY, "Mercury"),
    (swe.VENUS,   "Venus"),
    (swe.MARS,    "Mars"),
    (swe.JUPITER, "Jupiter"),
    (swe.SATURN,  "Saturn"),
    (swe.URANUS,  "Uranus"),
    (swe.NEPTUNE, "Neptune"),
    (swe.PLUTO,   "Pluto"),
]

SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
         "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]

def degree_to_sign(deg: float) -> str:
    return SIGNS[int(deg // 30) % 12]

def compute(date_str: str, time_str: Optional[str], lat: float, lon: float, tz_str: str) -> dict:
    # Validate date range
    date = datetime.strptime(date_str, "%Y-%m-%d")
    if date.year < 1800 or date.year > 2100:
        raise ValueError(f"Date {date_str} is outside supported range (1800–2100)")

    time_unknown = time_str is None or time_str.strip() == ""
    if time_unknown:
        time_str = "12:00"

    # Convert local time to UTC Julian Day
    tz = pytz.timezone(tz_str)
    dt_local = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    dt_local = tz.localize(dt_local)
    dt_utc = dt_local.astimezone(pytz.utc)

    jd = swe.julday(dt_utc.year, dt_utc.month, dt_utc.day,
                    dt_utc.hour + dt_utc.minute / 60.0)

    # Compute planets
    planets = {}
    for planet_id, planet_name in PLANETS:
        pos, _ = swe.calc_ut(jd, planet_id)
        lon_deg = pos[0]
        speed = pos[3]  # degrees/day; negative = retrograde
        planets[planet_name] = {
            "sign": degree_to_sign(lon_deg),
            "degree": round(lon_deg % 30, 4),
            "absolute_degree": round(lon_deg, 4),
            "house": 1,      # placeholder; set after house calculation
            "retrograde": speed < 0,
        }

    # Compute houses (Placidus)
    cusps, ascmc = swe.houses(jd, lat, lon, b'P')  # 'P' = Placidus
    ascendant_deg = ascmc[0]

    houses = {}
    for i, cusp in enumerate(cusps, start=1):
        houses[str(i)] = {
            "sign": degree_to_sign(cusp),
            "cusp_degree": round(cusp, 4),
        }

    # Assign planets to houses
    cusp_list = list(cusps)
    for planet_name, pdata in planets.items():
        abs_deg = pdata["absolute_degree"]
        house_num = 12
        for h in range(12):
            start = cusp_list[h]
            end = cusp_list[(h + 1) % 12]
            if start <= end:
                if start <= abs_deg < end:
                    house_num = h + 1
                    break
            else:
                if abs_deg >= start or abs_deg < end:
                    house_num = h + 1
                    break
        planets[planet_name]["house"] = house_num

    return {
        "sun_sign": planets["Sun"]["sign"],
        "moon_sign": planets["Moon"]["sign"],
        "ascendant": degree_to_sign(ascendant_deg),
        "ascendant_degree": round(ascendant_deg, 4),
        "planets": planets,
        "houses": houses,
        "time_unknown": time_unknown,
        "computed_at": datetime.utcnow().isoformat() + "Z",
    }
