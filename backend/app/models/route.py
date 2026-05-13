from sqlalchemy import JSON, Column, DateTime, Float, Index, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class RouteCache(Base):
    __tablename__ = "route_cache"

    id = Column(Integer, primary_key=True, index=True)
    
    # Hash of coordinates or unique key (e.g., "lat1,lon1:lat2,lon2")
    origin_key = Column(String, index=True, nullable=False)
    destination_key = Column(String, index=True, nullable=False)
    
    # Provider: "yandex" or "haversine"
    provider = Column(String, default="yandex")
    
    # Data
    distance_meters = Column(Float, nullable=False)
    duration_seconds = Column(Float, nullable=False)
    
    # Full geometry for polyline (optional, can be large)
    geometry_json = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Composite index for fast lookups
    __table_args__ = (
        Index("ix_route_lookup", "origin_key", "destination_key"),
    )
