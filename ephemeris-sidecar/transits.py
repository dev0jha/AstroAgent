import swisseph as swe
from datetime import datetime
import pytz
import math

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

ASPECTS = [
    ("conjunction", 0,   8),
    ("sextile",     60,  4),
    ("square",      90,  6),
    ("trine",       120, 6),
    ("opposition",  180, 8),
]

def degree_to_sign(deg: float) -> str:
    return SIGNS[int(deg // 30) % 12]

def angular_distance(a: float, b: float) -> float:
    diff = abs(a - b) % 360
    return diff if diff <= 180 else 360 - diff

def compute(date_str: str, natal_chart: dict) -> dict:
    swe.set_ephe_path('')
    dt = datetime.strptime(date_str, "%Y-%m-%d").replace(hour=12, tzinfo=pytz.utc)
    jd = swe.julday(dt.year, dt.month, dt.day, 12.0)

    transiting = {}
    for planet_id, planet_name in PLANETS:
        pos, _ = swe.calc_ut(jd, planet_id)
        transiting[planet_name] = {
            "sign": degree_to_sign(pos[0]),
            "degree": round(pos[0] % 30, 4),
            "absolute_degree": round(pos[0], 4),
        }

    notable = []
    natal_planets = natal_chart.get("planets", {})
    for t_name, t_data in transiting.items():
        for n_name, n_data in natal_planets.items():
            dist = angular_distance(t_data["absolute_degree"], n_data["absolute_degree"])
            for aspect_name, angle, orb in ASPECTS:
                diff = abs(dist - angle)
                if diff <= orb:
                    notable.append({
                        "transiting_planet": t_name,
                        "natal_planet": n_name,
                        "aspect": aspect_name,
                        "orb": round(diff, 2),
                        "description": f"{t_name} {aspect_name} natal {n_name} (orb {round(diff,1)}°)"
                    })

    notable.sort(key=lambda x: x["orb"])

    return {
        "date": date_str,
        "transiting_planets": transiting,
        "notable_transits": notable[:10],  # top 10 by tightness
    }
