"""taskops_audit_log

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-12 11:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = 'c3d4e5f6a7b8'
down_revision: str | None = 'b2c3d4e5f6a7'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'taskops_audit_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('user_name', sa.String(200), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('entity_title', sa.String(200), nullable=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('details', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_taskops_audit_log_project_id', 'taskops_audit_log', ['project_id'])
    op.create_index('ix_taskops_audit_log_entity_id', 'taskops_audit_log', ['entity_id'])
    op.create_index('ix_taskops_audit_log_user_id', 'taskops_audit_log', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_taskops_audit_log_user_id', table_name='taskops_audit_log')
    op.drop_index('ix_taskops_audit_log_entity_id', table_name='taskops_audit_log')
    op.drop_index('ix_taskops_audit_log_project_id', table_name='taskops_audit_log')
    op.drop_table('taskops_audit_log')
