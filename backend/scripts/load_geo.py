import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.config import settings
from app.models.geo import Region

GEO_DATA_DIR = "/Users/nurlan/Projects/maps_test_service/data"

FILE_MAPPING = {
    "abairjay_region.geojson": "abairjay_region",
    "akmola_region.geojson": "akmola_region",
    "almaty_region.geojson": "almaty_region",
    "atyrau_region.geojson": "atyrau_region",
    "eastkazakhstan_region.geojson": "eastkazakhstan_region",
    "kostanai_region.geojson": "kostanai_region",
    "kyzylorda_region.geojson": "kyzylorda_region",
    "mangistau_region.geojson": "mangistau_region",
    "northkazakhstan_region.geojson": "northkazakhstan_region",
    "pavlodar_region.geojson": "pavlodar_region",
    "stpjersamrjay_region.geojson": "stpjersamrjay_region",
    "ulytau_region.geojson": "ulytau_region",
    "west_kazakhstan_region.geojson": "west_kazakhstan_region",
    "zhambyl_region.geojson": "zhambyl_region",
    "zhetysu_region.geojson": "zhetysu_region",
    "актюбинская_region.geojson": "aktobe_region",
    "карагандинская_region.geojson": "карагандинская_region",
}

async def load_geo():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        for filename, code in FILE_MAPPING.items():
            filepath = os.path.join(GEO_DATA_DIR, filename)
            if not os.path.exists(filepath):
                print(f"  [!] File not found: {filepath}")
                continue

            with open(filepath, 'r', encoding='utf-8') as f:
                geo_data = json.load(f)
            
            # Extract polygon if it's a FeatureCollection or Feature
            geometry = None
            if geo_data.get("type") == "FeatureCollection":
                if geo_data.get("features"):
                    geometry = geo_data["features"][0].get("geometry")
            elif geo_data.get("type") == "Feature":
                geometry = geo_data.get("geometry")
            else:
                geometry = geo_data

            if not geometry:
                print(f"  [!] No geometry found in {filename}")
                continue

            result = await db.execute(
                update(Region)
                .where(Region.code == code)
                .values(geometry_json=geometry)
            )
            await db.commit()
            print(f"  [+] Updated region: {code} from {filename}")

    await engine.dispose()
    print("\n✅ Geo data loading finished!")

if __name__ == "__main__":
    asyncio.run(load_geo())
