from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.database import Base

if TYPE_CHECKING:
    from app.models.oblast import Oblast


class Region(Base):
    __tablename__ = "regions"

    region_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    oblast_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("oblasts.oblast_id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(50), unique=True)
    geometry_json: Mapped[dict | None] = mapped_column(JSONB)
    center_lat: Mapped[float | None] = mapped_column(Numeric)
    center_lon: Mapped[float | None] = mapped_column(Numeric)
    geom: Mapped[Any | None] = mapped_column(Geometry("POLYGON", srid=4326), nullable=True)

    is_connected: Mapped[bool] = mapped_column(Boolean, default=False, server_default='false')

    # Engineer info
    engineer_name: Mapped[str | None] = mapped_column(String(255))
    engineer_phone: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    oblast: Mapped[Oblast | None] = relationship("Oblast", back_populates="regions")
    settlements: Mapped[list[Settlement]] = relationship("Settlement", back_populates="region")


class Settlement(Base):
    __tablename__ = "settlements"

    settlement_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    region_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("regions.region_id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Numeric, nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric, nullable=False)
    status: Mapped[str | None] = mapped_column(String(50))
    population: Mapped[int | None] = mapped_column(Integer)
    computers_connected: Mapped[int] = mapped_column(Integer, default=0)
    computers_total: Mapped[int] = mapped_column(Integer, default=0)
    internet_available: Mapped[bool] = mapped_column(Boolean, default=False)
    internet_speed_sufficient: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    region: Mapped[Region] = relationship("Region", back_populates="settlements")
