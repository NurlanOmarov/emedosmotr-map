import asyncio

from sqlalchemy import func, select

from app.database import AsyncSessionLocal
from app.models.geo import Region


async def check():
    async with AsyncSessionLocal() as db:
        res_all = await db.execute(select(func.count(Region.region_id)))
        total = res_all.scalar()
        
        res_geom = await db.execute(select(func.count(Region.region_id)).where(Region.geometry_json.isnot(None)))
        with_geom = res_geom.scalar()
        
        print(f"Total Regions in DB: {total}")
        print(f"Regions with Geometry: {with_geom}")
        
        if total > with_geom:
            res_missing = await db.execute(select(Region).where(Region.geometry_json.is_(None)))
            missing = res_missing.scalars().all()
            print("Missing Geometry:")
            for m in missing:
                print(f" - {m.name} (ID: {m.region_id})")

if __name__ == "__main__":
    asyncio.run(check())
