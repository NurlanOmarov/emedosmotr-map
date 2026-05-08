import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MedicalResearch(Base):
    __tablename__ = "medical_researches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("medical_organizations.id", ondelete="CASCADE"), nullable=False
    )
    
    # Research type (e.g., 'lab_oak', 'lab_oam', 'lab_micro', 'ecg', 'fluro', 'usound', 'echo_kg')
    research_type: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Input info
    input_method: Mapped[str] = mapped_column(String(20), default="manual")  # manual, auto
    integration_type: Mapped[str | None] = mapped_column(String(50))  # e.g., 'relay', 'direct', 'pacs'
    
    # Specialist info
    specialist_name: Mapped[str | None] = mapped_column(String(200))
    specialist_position: Mapped[str | None] = mapped_column(String(200))
    room_number: Mapped[str | None] = mapped_column(String(20))
    phone: Mapped[str | None] = mapped_column(String(20))
    
    # Equipment connection
    equipment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("medical_equipment.id", ondelete="SET NULL")
    )
    
    # Status and feedback
    status: Mapped[str] = mapped_column(String(20), default="critical")
    
    # Detailed connectivity status
    is_connected: Mapped[bool] = mapped_column(Boolean, default=False)
    staff_trained: Mapped[bool] = mapped_column(Boolean, default=False)
    has_data_stream: Mapped[bool] = mapped_column(Boolean, default=False)
    
    notes: Mapped[str | None] = mapped_column(Text)
    problems: Mapped[str | None] = mapped_column(Text)
    
    # Data stream monitoring
    has_image: Mapped[bool] = mapped_column(Boolean, default=False)
    image_source: Mapped[str | None] = mapped_column(String(50))  # 'equipment', 'pacs', 'manual'
    
    has_conclusion: Mapped[bool] = mapped_column(Boolean, default=False)
    conclusion_source: Mapped[str | None] = mapped_column(String(50))  # 'ui', 'automatic'
    
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Lifecycle
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organization: Mapped["MedicalOrganization"] = relationship("MedicalOrganization", back_populates="researches")
    equipment: Mapped["MedicalEquipment | None"] = relationship("MedicalEquipment")
