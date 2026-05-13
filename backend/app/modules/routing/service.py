import math
from datetime import datetime, timedelta

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.route import RouteCache
from app.modules.routing.schemas import Coordinate, RouteResponse


class RoutingService:
    @staticmethod
    def _get_cache_key(coord: Coordinate) -> str:
        return f"{coord.lat:.6f},{coord.lon:.6f}"

    @staticmethod
    def haversine_distance(c1: Coordinate, c2: Coordinate) -> float:
        R = 6371000  # Earth radius in meters
        phi1, phi2 = math.radians(c1.lat), math.radians(c2.lat)
        dphi = math.radians(c2.lat - c1.lat)
        dlambda = math.radians(c2.lon - c1.lon)
        a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    async def get_route(
        self, 
        db: AsyncSession, 
        origin: Coordinate, 
        destination: Coordinate,
        use_cache: bool = True
    ) -> RouteResponse:
        okey = self._get_cache_key(origin)
        dkey = self._get_cache_key(destination)

        if use_cache:
            stmt = select(RouteCache).where(
                RouteCache.origin_key == okey,
                RouteCache.destination_key == dkey
            )
            result = await db.execute(stmt)
            cached = result.scalar_one_or_none()
            
            if cached and (not cached.expires_at or cached.expires_at > datetime.now()):
                return RouteResponse(
                    distance_meters=cached.distance_meters,
                    duration_seconds=cached.duration_seconds,
                    geometry=cached.geometry_json,
                    provider=cached.provider
                )

        # Try Yandex Router API
        try:
            # Note: Yandex Router API URL might vary. Common one: 
            # https://router.api.yandex.net/v2/route
            # But Yandex Maps JS API uses its own internal router. 
            # For server-side, we usually use the Distance Matrix API or Router API.
            # Here we use a generic fetch as placeholder/template.
            
            api_key = getattr(settings, "YANDEX_ROUTER_API_KEY", settings.YANDEX_MAPS_API_KEY)
            url = "https://api.routing.yandex.net/v2/route"
            params = {
                "waypoints": f"{origin.lon},{origin.lat}|{destination.lon},{destination.lat}",
                "apikey": api_key,
                "mode": "driving"
            }
            
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, params=params)
                
                if resp.status_code == 200:
                    data = resp.json()
                    # Parsing depends on Yandex version
                    route = data['route']
                    dist = float(route['distance']['value'])
                    dur = float(route['duration']['value'])
                    # Geometry is usually polyline encoded or list of points
                    geom = route.get('geometry', {}).get('coordinates')
                    
                    # Save to cache
                    new_cache = RouteCache(
                        origin_key=okey,
                        destination_key=dkey,
                        provider="yandex",
                        distance_meters=dist,
                        duration_seconds=dur,
                        geometry_json=geom,
                        expires_at=datetime.now() + timedelta(days=7)
                    )
                    db.add(new_cache)
                    await db.commit()
                    
                    return RouteResponse(
                        distance_meters=dist,
                        duration_seconds=dur,
                        geometry=geom,
                        provider="yandex"
                    )
        except Exception as e:
            # Log error (structlog would be better)
            print(f"Routing API Error: {e}")

        # Fallback to Haversine
        dist = self.haversine_distance(origin, destination)
        # Empirical factor for driving distance in RU/KZ
        dist_driving = dist * 1.3
        # Estimate duration (average 40 km/h)
        dur = (dist_driving / 11.1)  # 11.1 m/s ~= 40 km/h
        
        return RouteResponse(
            distance_meters=dist_driving,
            duration_seconds=dur,
            provider="haversine_fallback"
        )

    async def invalidate_cache(self, db: AsyncSession):
        stmt = delete(RouteCache).where(RouteCache.created_at < datetime.now() - timedelta(days=7))
        await db.execute(stmt)
        await db.commit()

routing_service = RoutingService()
