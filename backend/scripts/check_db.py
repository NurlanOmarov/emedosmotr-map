import asyncio
from app.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        users = (await conn.execute(text('SELECT id, username, role, region_id FROM users'))).all()
        print(f"Users: {len(users)}")
        for u in users:
            print(dict(u._mapping))
            
        regions = (await conn.execute(text('SELECT region_id, name FROM regions'))).all()
        print(f"\nRegions: {len(regions)}")
        for r in regions:
            print(dict(r._mapping))
            
        locations = (await conn.execute(text('SELECT id, name FROM locations'))).all()
        print(f"\nLocations: {len(locations)}")
        for l in locations[:10]: # Show first 10
            print(dict(l._mapping))

if __name__ == "__main__":
    asyncio.run(check())
