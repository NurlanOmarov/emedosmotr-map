import uuid
from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TaskStatus(StrEnum):
    backlog = "backlog"
    todo = "todo"
    in_progress = "in_progress"
    in_review = "in_review"
    done = "done"
    cancelled = "cancelled"


class TaskPriority(StrEnum):
    p0_urgent = "p0_urgent"
    p1_high = "p1_high"
    p2_medium = "p2_medium"
    p3_low = "p3_low"


class DependencyType(StrEnum):
    blocks = "blocks"
    blocked_by = "blocked_by"
    relates_to = "relates_to"


class EstimateType(StrEnum):
    t_shirt = "t_shirt"
    hours = "hours"


class ProjectMemberRole(StrEnum):
    owner = "owner"
    writer = "writer"
    reader = "reader"


taskops_task_labels = Table(
    "taskops_task_labels",
    Base.metadata,
    Column("task_id", UUID(as_uuid=True), ForeignKey("taskops_tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("label_id", UUID(as_uuid=True), ForeignKey("taskops_labels.id", ondelete="CASCADE"), primary_key=True),
)


class TaskopsProject(Base):
    __tablename__ = "taskops_projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    is_external: Mapped[bool] = mapped_column(Boolean, default=False)
    estimate_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default=EstimateType.t_shirt
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_id])  # noqa: F821
    tasks: Mapped[list["TaskopsTask"]] = relationship(
        "TaskopsTask", back_populates="project", foreign_keys="TaskopsTask.project_id"
    )
    cycles: Mapped[list["TaskopsCycle"]] = relationship("TaskopsCycle", back_populates="project")
    members: Mapped[list["TaskopsProjectMember"]] = relationship(
        "TaskopsProjectMember", back_populates="project", cascade="all, delete-orphan"
    )
    labels: Mapped[list["TaskopsLabel"]] = relationship("TaskopsLabel", back_populates="project")


class TaskopsProjectMember(Base):
    __tablename__ = "taskops_project_members"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_project_member"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("taskops_projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=ProjectMemberRole.reader,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["TaskopsProject"] = relationship("TaskopsProject", back_populates="members")
    user: Mapped["User"] = relationship("User")  # noqa: F821


class TaskopsCycle(Base):
    __tablename__ = "taskops_cycles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("taskops_projects.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["TaskopsProject"] = relationship("TaskopsProject", back_populates="cycles")
    tasks: Mapped[list["TaskopsTask"]] = relationship("TaskopsTask", back_populates="cycle")


class TaskopsLabel(Base):
    __tablename__ = "taskops_labels"
    __table_args__ = (UniqueConstraint("project_id", "name", name="uq_label_per_project"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("taskops_projects.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#6366f1")

    project: Mapped["TaskopsProject"] = relationship("TaskopsProject", back_populates="labels")
    tasks: Mapped[list["TaskopsTask"]] = relationship(
        "TaskopsTask", secondary=taskops_task_labels, back_populates="labels"
    )


class TaskopsTask(Base):
    __tablename__ = "taskops_tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("taskops_projects.id", ondelete="CASCADE"), nullable=False
    )
    cycle_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("taskops_cycles.id", ondelete="SET NULL"), nullable=True
    )
    parent_task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("taskops_tasks.id", ondelete="CASCADE"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=TaskStatus.backlog
    )
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False, default=TaskPriority.p2_medium
    )
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reporter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    # estimate: t-shirt XS/S/M/L/XL or hours (float stored as string for flexibility)
    estimate: Mapped[str | None] = mapped_column(String(20))
    start_date: Mapped[date | None] = mapped_column(Date)
    due_date: Mapped[date | None] = mapped_column(Date)
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )
    is_external_visible: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    project: Mapped["TaskopsProject"] = relationship(
        "TaskopsProject", back_populates="tasks", foreign_keys=[project_id]
    )
    cycle: Mapped["TaskopsCycle | None"] = relationship("TaskopsCycle", back_populates="tasks")
    subtasks: Mapped[list["TaskopsTask"]] = relationship(
        "TaskopsTask", back_populates="parent_task", foreign_keys=[parent_task_id]
    )
    parent_task: Mapped["TaskopsTask | None"] = relationship(
        "TaskopsTask", back_populates="subtasks", foreign_keys=[parent_task_id], remote_side="TaskopsTask.id"
    )
    assignee: Mapped["User | None"] = relationship("User", foreign_keys=[assignee_id])  # noqa: F821
    reporter: Mapped["User"] = relationship("User", foreign_keys=[reporter_id])  # noqa: F821
    comments: Mapped[list["TaskopsComment"]] = relationship(
        "TaskopsComment", back_populates="task", cascade="all, delete-orphan"
    )
    labels: Mapped[list["TaskopsLabel"]] = relationship(
        "TaskopsLabel", secondary=taskops_task_labels, back_populates="tasks"
    )
    dependencies_outgoing: Mapped[list["TaskopsDependency"]] = relationship(
        "TaskopsDependency",
        back_populates="source_task",
        foreign_keys="TaskopsDependency.source_task_id",
        cascade="all, delete-orphan",
    )
    dependencies_incoming: Mapped[list["TaskopsDependency"]] = relationship(
        "TaskopsDependency",
        back_populates="target_task",
        foreign_keys="TaskopsDependency.target_task_id",
        cascade="all, delete-orphan",
    )
    attachments: Mapped[list["TaskopsAttachment"]] = relationship(
        "TaskopsAttachment",
        back_populates="task",
        cascade="all, delete-orphan",
    )


class TaskopsComment(Base):
    __tablename__ = "taskops_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("taskops_tasks.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    task: Mapped["TaskopsTask"] = relationship("TaskopsTask", back_populates="comments")
    author: Mapped["User"] = relationship("User")  # noqa: F821


class TaskopsDependency(Base):
    __tablename__ = "taskops_dependencies"
    __table_args__ = (
        UniqueConstraint("source_task_id", "target_task_id", "type", name="uq_task_dependency"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("taskops_tasks.id", ondelete="CASCADE"), nullable=False
    )
    target_task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("taskops_tasks.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    source_task: Mapped["TaskopsTask"] = relationship(
        "TaskopsTask", back_populates="dependencies_outgoing", foreign_keys=[source_task_id]
    )
    target_task: Mapped["TaskopsTask"] = relationship(
        "TaskopsTask", back_populates="dependencies_incoming", foreign_keys=[target_task_id]
    )


class TaskopsAttachment(Base):
    __tablename__ = "taskops_attachments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("taskops_tasks.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(100))
    file_size: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    task: Mapped["TaskopsTask"] = relationship("TaskopsTask", back_populates="attachments")
    user: Mapped["User"] = relationship("User")  # noqa: F821


class TaskopsAuditLog(Base):
    __tablename__ = "taskops_audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    user_name: Mapped[str | None] = mapped_column(String(200))
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    entity_title: Mapped[str | None] = mapped_column(String(200))
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    details: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TaskopsNote(Base):
    __tablename__ = "taskops_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False, default="Без названия")
    content: Mapped[str | None] = mapped_column(Text)
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    owner: Mapped["User"] = relationship("User")  # noqa: F821


class TaskopsGoal(Base):
    __tablename__ = "taskops_goals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    due_date: Mapped[date | None] = mapped_column(Date)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship("User")  # noqa: F821
