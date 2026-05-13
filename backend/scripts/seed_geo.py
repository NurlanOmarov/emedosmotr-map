"""
Seed geo data: creates Kazakhstan regions and loads GeoJSON boundaries.
Run inside backend container: python scripts/seed_geo.py
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings

GEO_DATA_DIR = os.path.join(os.path.dirname(__file__), "geo_data")

REGIONS = [
    {"name": "Алматинская область",           "code": "almaty_region",           "file": "almaty_region.geojson",           "center_lat": 44.5, "center_lon": 77.5},
    {"name": "Акмолинская область",            "code": "akmola_region",            "file": "akmola_region.geojson",            "center_lat": 51.5, "center_lon": 69.5},
    {"name": "Актюбинская область",            "code": "aktobe_region",            "file": "актюбинская_region.geojson",       "center_lat": 48.8, "center_lon": 57.2},
    {"name": "Атырауская область",             "code": "atyrau_region",            "file": "atyrau_region.geojson",            "center_lat": 47.1, "center_lon": 52.0},
    {"name": "Восточно-Казахстанская область", "code": "eastkazakhstan_region",    "file": "eastkazakhstan_region.geojson",    "center_lat": 48.5, "center_lon": 82.5},
    {"name": "Жамбылская область",             "code": "zhambyl_region",           "file": "zhambyl_region.geojson",           "center_lat": 43.5, "center_lon": 72.5},
    {"name": "Западно-Казахстанская область",  "code": "west_kazakhstan_region",   "file": "west_kazakhstan_region.geojson",   "center_lat": 50.5, "center_lon": 51.5},
    {"name": "Карагандинская область",         "code": "karaganda_region",         "file": "карагандинская_region.geojson",    "center_lat": 47.8, "center_lon": 72.0},
    {"name": "Костанайская область",           "code": "kostanai_region",          "file": "kostanai_region.geojson",          "center_lat": 52.2, "center_lon": 63.5},
    {"name": "Кызылординская область",         "code": "kyzylorda_region",         "file": "kyzylorda_region.geojson",         "center_lat": 44.8, "center_lon": 65.5},
    {"name": "Мангистауская область",          "code": "mangistau_region",         "file": "mangistau_region.geojson",         "center_lat": 43.7, "center_lon": 52.8},
    {"name": "Павлодарская область",           "code": "pavlodar_region",          "file": "pavlodar_region.geojson",          "center_lat": 52.5, "center_lon": 77.0},
    {"name": "Северо-Казахстанская область",   "code": "northkazakhstan_region",   "file": "northkazakhstan_region.geojson",   "center_lat": 54.0, "center_lon": 69.0},
    {"name": "Туркестанская область",          "code": "stpjersamrjay_region",     "file": "stpjersamrjay_region.geojson",     "center_lat": 43.3, "center_lon": 68.0},
    {"name": "Улытауская область",             "code": "ulytau_region",            "file": "ulytau_region.geojson",            "center_lat": 48.0, "center_lon": 66.5},
    {"name": "Жетысуская область",             "code": "zhetysu_region",           "file": "zhetysu_region.geojson",           "center_lat": 45.0, "center_lon": 79.0},
    {"name": "Область Абай",                   "code": "abairjay_region",          "file": "abairjay_region.geojson",          "center_lat": 49.5, "center_lon": 80.5},
    # Города республиканского значения
    {"name": "Астана",   "code": "astana_region",   "file": "astana_city.geojson",   "center_lat": 51.1694, "center_lon": 71.4491},
    {"name": "Алматы",   "code": "almaty_city",     "file": "almaty_city.geojson",   "center_lat": 43.2220, "center_lon": 76.8512},
    {"name": "Шымкент",  "code": "shymkent_region", "file": "shymkent_city.geojson", "center_lat": 42.3000, "center_lon": 69.6000},
]


async def seed_geo() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        for r in REGIONS:
            filepath = os.path.join(GEO_DATA_DIR, str(r["file"]))
            geometry = None

            if os.path.exists(filepath):
                with open(filepath, encoding="utf-8") as f:
                    raw = json.load(f)
                if raw.get("type") == "FeatureCollection":
                    features = raw.get("features", [])
                    if features:
                        geometry = features[0].get("geometry")
                elif raw.get("type") == "Feature":
                    geometry = raw.get("geometry")
                else:
                    geometry = raw
            else:
                print(f"  [!] File not found: {filepath}")

            existing = await db.execute(
                text("SELECT region_id FROM regions WHERE code = :code"),
                {"code": r["code"]},
            )
            row = existing.scalar_one_or_none()

            if row:
                await db.execute(
                    text("""
                        UPDATE regions SET
                            geometry_json = CAST(:geometry AS jsonb),
                            center_lat = :lat,
                            center_lon = :lon
                        WHERE code = :code
                    """),
                    {
                        "geometry": json.dumps(geometry) if geometry else None,
                        "lat": r["center_lat"],
                        "lon": r["center_lon"],
                        "code": r["code"],
                    },
                )
                print(f"  [~] Updated region '{r['name']}'")
            else:
                await db.execute(
                    text("""
                        INSERT INTO regions (name, code, geometry_json, center_lat, center_lon)
                        VALUES (:name, :code, CAST(:geometry AS jsonb), :lat, :lon)
                    """),
                    {
                        "name": r["name"],
                        "code": r["code"],
                        "geometry": json.dumps(geometry) if geometry else None,
                        "lat": r["center_lat"],
                        "lon": r["center_lon"],
                    },
                )
                print(f"  [+] Created region '{r['name']}'")

        await db.commit()

    await engine.dispose()
    print("\n✅ Geo seed завершён!")


if __name__ == "__main__":
    asyncio.run(seed_geo())
