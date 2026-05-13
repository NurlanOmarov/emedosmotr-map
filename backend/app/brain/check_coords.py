import asyncio
import json

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.geo import Region


async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Region).where(Region.geometry_json.isnot(None)).limit(1))
        region = res.scalar_one_or_none()
        if region:
            geom = region.geometry_json
            if isinstance(geom, str):
                geom = json.loads(geom)
            
            coords = []
            if geom['type'] == 'Polygon':
                coords = geom['coordinates'][0][0]
            elif geom['type'] == 'MultiPolygon':
                coords = geom['coordinates'][0][0][0]
                
            print(f"Sample coordinates for {region.name}: {coords}")
            # In Kazakhstan, latitude is around 40-55, longitude is around 50-85.
            # If the first number is > 60, it's likely longitude.
            if coords[0] > 60:
                print("Likely [lon, lat] (standard GeoJSON)")
            else:
                print("Likely [lat, lon] (Yandex-style)")

if __name__ == "__main__":
    asyncio.run(check())
