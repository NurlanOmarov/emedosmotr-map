import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MedicalEquipment(Base):
    __tablename__ = "medical_equipment"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("medical_organizations.id", ondelete="CASCADE"), nullable=False
    )
    equipment_type: Mapped[str] = mapped_column(String(30), nullable=False)
    count: Mapped[int] = mapped_column(Integer, default=0)
    free_ports: Mapped[int] = mapped_column(Integer, default=0)
    connection_status: Mapped[bool] = mapped_column(Boolean, default=False)
    port_status: Mapped[str] = mapped_column(String(20), default="free")
    ecg_model: Mapped[str | None] = mapped_column(String(100))
    smart_ecg_compatible: Mapped[bool] = mapped_column(Boolean, default=False)
    serial_number: Mapped[str | None] = mapped_column(String(100))
    last_service_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organization: Mapped["MedicalOrganization"] = relationship(  # noqa: F821
        "MedicalOrganization", back_populates="equipment"
    )
