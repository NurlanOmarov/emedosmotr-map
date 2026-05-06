import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FunnelData(Base):
    __tablename__ = "funnel_data"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
    region_id: Mapped[int] = mapped_column(Integer, nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    directions_issued: Mapped[int] = mapped_column(Integer, default=0)
    results_uploaded: Mapped[int] = mapped_column(Integer, default=0)
    results_via_auto: Mapped[int] = mapped_column(Integer, default=0)
    results_via_manual: Mapped[int] = mapped_column(Integer, default=0)
    results_via_external: Mapped[int] = mapped_column(Integer, default=0)
    doctors_active: Mapped[int] = mapped_column(Integer, default=0)
    doctors_total: Mapped[int] = mapped_column(Integer, default=0)
    conversion_rate: Mapped[float | None] = mapped_column(Numeric(5, 2))
    loss_rate: Mapped[float | None] = mapped_column(Numeric(5, 2))
    source: Mapped[str] = mapped_column(String(50), default="manual")
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    location: Mapped["Location"] = relationship(  # noqa: F821
        "Location", back_populates="funnel_data"
    )
