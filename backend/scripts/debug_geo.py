import asyncio
from app.database import engine
from sqlalchemy import text

async def check_locations():
    async with engine.connect() as conn:
        res = (await conn.execute(text('SELECT name, lat, lon, type, region_id, is_active, deleted_at FROM locations WHERE deleted_at IS NULL AND is_active = TRUE'))).all()
        print(f"Total active locations: {len(res)}")
        for r in res:
            print(dict(r._mapping))
            
        regions = (await conn.execute(text('SELECT region_id, name, geometry_json, center_lat, center_lon FROM regions'))).all()
        print(f"\nTotal regions: {len(regions)}")
        for r in regions:
            has_geo = r.geometry_json is not None
            has_center = r.center_lat is not None and r.center_lon is not None
            print(f"Region: {r.name}, ID: {r.region_id}, Has Geometry: {has_geo}, Has Center: {has_center} ({r.center_lat}, {r.center_lon})")

        settlements = (await conn.execute(text('SELECT count(*) FROM settlements'))).scalar()
        print(f"\nTotal settlements: {settlements}")

if __name__ == "__main__":
    asyncio.run(check_locations())
