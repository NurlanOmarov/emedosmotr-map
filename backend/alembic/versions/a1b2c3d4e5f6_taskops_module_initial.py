"""taskops_module_initial

Revision ID: a1b2c3d4e5f6
Revises: f2b3c4d5e6f7
Create Date: 2026-05-08 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enums (idempotent)
    for stmt in [
        "DO $$ BEGIN CREATE TYPE taskops_estimate_type AS ENUM ('t_shirt', 'hours'); EXCEPTION WHEN duplicate_object THEN null; END $$",
        "DO $$ BEGIN CREATE TYPE taskops_project_member_role AS ENUM ('owner', 'writer', 'reader'); EXCEPTION WHEN duplicate_object THEN null; END $$",
        "DO $$ BEGIN CREATE TYPE taskops_task_status AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$",
        "DO $$ BEGIN CREATE TYPE taskops_task_priority AS ENUM ('p0_urgent', 'p1_high', 'p2_medium', 'p3_low'); EXCEPTION WHEN duplicate_object THEN null; END $$",
        "DO $$ BEGIN CREATE TYPE taskops_dependency_type AS ENUM ('blocks', 'blocked_by', 'relates_to'); EXCEPTION WHEN duplicate_object THEN null; END $$",
    ]:
        op.execute(stmt)

    # taskops_projects
    op.create_table(
        'taskops_projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, server_default='active'),
        sa.Column('is_external', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('estimate_type', sa.String(30), nullable=False, server_default='t_shirt'),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_taskops_projects_owner_id', 'taskops_projects', ['owner_id'])

    # taskops_project_members
    op.create_table(
        'taskops_project_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(20), nullable=False, server_default='reader'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['project_id'], ['taskops_projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'user_id', name='uq_project_member'),
    )

    # taskops_cycles
    op.create_table(
        'taskops_cycles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('is_closed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['project_id'], ['taskops_projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_taskops_cycles_project_id', 'taskops_cycles', ['project_id'])

    # taskops_labels
    op.create_table(
        'taskops_labels',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('color', sa.String(7), nullable=False, server_default='#6366f1'),
        sa.ForeignKeyConstraint(['project_id'], ['taskops_projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'name', name='uq_label_per_project'),
    )

    # taskops_tasks
    op.create_table(
        'taskops_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cycle_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('parent_task_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='backlog'),
        sa.Column('priority', sa.String(20), nullable=False, server_default='p2_medium'),
        sa.Column('assignee_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reporter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('estimate', sa.String(20), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('location_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_external_visible', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['taskops_projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cycle_id'], ['taskops_cycles.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['parent_task_id'], ['taskops_tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assignee_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_taskops_tasks_project_id', 'taskops_tasks', ['project_id'])
    op.create_index('ix_taskops_tasks_assignee_id', 'taskops_tasks', ['assignee_id'])
    op.create_index('ix_taskops_tasks_status', 'taskops_tasks', ['status'])

    # taskops_task_labels (M2M)
    op.create_table(
        'taskops_task_labels',
        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('label_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['taskops_tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['label_id'], ['taskops_labels.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('task_id', 'label_id'),
    )

    # taskops_comments
    op.create_table(
        'taskops_comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['task_id'], ['taskops_tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_taskops_comments_task_id', 'taskops_comments', ['task_id'])

    # taskops_dependencies
    op.create_table(
        'taskops_dependencies',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_task_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_task_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['source_task_id'], ['taskops_tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_task_id'], ['taskops_tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_task_id', 'target_task_id', 'type', name='uq_task_dependency'),
    )


def downgrade() -> None:
    op.drop_table('taskops_dependencies')
    op.drop_table('taskops_task_labels')
    op.drop_table('taskops_comments')
    op.drop_table('taskops_tasks')
    op.drop_table('taskops_labels')
    op.drop_table('taskops_cycles')
    op.drop_table('taskops_project_members')
    op.drop_table('taskops_projects')

    op.execute("DROP TYPE IF EXISTS taskops_dependency_type")
    op.execute("DROP TYPE IF EXISTS taskops_task_priority")
    op.execute("DROP TYPE IF EXISTS taskops_task_status")
    op.execute("DROP TYPE IF EXISTS taskops_project_member_role")
    op.execute("DROP TYPE IF EXISTS taskops_estimate_type")
