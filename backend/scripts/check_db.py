import asyncio

from sqlalchemy import text

from app.database import engine


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
        for loc in locations[:10]:
            print(dict(loc._mapping))

if __name__ == "__main__":
    asyncio.run(check())
