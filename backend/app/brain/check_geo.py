import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.geo import Region
from app.models.oblast import Oblast


async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Region).where(Region.geometry_json.isnot(None)))
        regions_with_geom = res.scalars().all()
        print(f"Regions with geometry: {len(regions_with_geom)}")
        for r in regions_with_geom[:5]:
            print(f" - ID: {r.region_id}, Name: {r.name}, Oblast ID: {r.oblast_id}")
            
        res = await db.execute(select(Oblast))
        oblasts = res.scalars().all()
        print(f"Oblasts: {len(oblasts)}")
        for o in oblasts[:5]:
            print(f" - ID: {o.oblast_id}, Name: {o.name}")

if __name__ == "__main__":
    asyncio.run(check())
