import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    settlement_id: Mapped[int | None] = mapped_column(Integer)
    region_id: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    lat: Mapped[float | None] = mapped_column(Numeric(10, 7))
    lon: Mapped[float | None] = mapped_column(Numeric(10, 7))
    # geom column added when PostGIS is available (Docker/production)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="critical")
    status_reason: Mapped[str | None] = mapped_column(Text)
    upload_mode: Mapped[str] = mapped_column(String(30), default="manual")
    has_relay_server: Mapped[bool] = mapped_column(Boolean, default=False)
    relay_server_notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    commission: Mapped["Commission | None"] = relationship(
        "Commission", back_populates="location", uselist=False
    )
    medical_orgs: Mapped[list["MedicalOrganization"]] = relationship(
        "MedicalOrganization", back_populates="location"
    )
    tasks: Mapped[list["Task"]] = relationship(  # noqa: F821
        "Task", back_populates="location"
    )
    funnel_data: Mapped[list["FunnelData"]] = relationship(  # noqa: F821
        "FunnelData", back_populates="location"
    )


class Commission(Base):
    __tablename__ = "commissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
    address: Mapped[str | None] = mapped_column(Text)
    computers_available: Mapped[int] = mapped_column(Integer, default=0)
    computers_required: Mapped[int] = mapped_column(Integer, default=0)
    doctors_count: Mapped[int] = mapped_column(Integer, default=0)
    connected_computers_count: Mapped[int] = mapped_column(Integer, default=0)
    internet_status: Mapped[bool] = mapped_column(Boolean, default=False)
    internet_type: Mapped[str | None] = mapped_column(String(50))  # wired, wi-fi, fiber, adsl
    internet_speed_mbps: Mapped[float | None] = mapped_column(Numeric(8, 2))
    has_local_network: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="critical")
    comment: Mapped[str | None] = mapped_column(Text)
    last_updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    last_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    location: Mapped["Location"] = relationship("Location", back_populates="commission")


class MedicalOrganization(Base):
    __tablename__ = "medical_organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    internet_status: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="critical")
    comment: Mapped[str | None] = mapped_column(Text)
    last_updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    last_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    location: Mapped["Location"] = relationship("Location", back_populates="medical_orgs")
    equipment: Mapped[list["MedicalEquipment"]] = relationship(  # noqa: F821
        "MedicalEquipment", back_populates="organization"
    )
    researches: Mapped[list["MedicalResearch"]] = relationship(  # noqa: F821
        "MedicalResearch", back_populates="organization"
    )
