"""taskops_notes: personal private notes per user

Revision ID: a9b0c1d2e3f4
Revises: c3d4e5f6a7b8
Create Date: 2026-05-12 12:00:00.000000
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = 'a9b0c1d2e3f4'
down_revision = 'f9e8d7c6b5a4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'taskops_notes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(300), nullable=False, server_default='Без названия'),
        sa.Column('content', sa.Text, nullable=True),
        sa.Column('is_pinned', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_taskops_notes_user_id', 'taskops_notes', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_taskops_notes_user_id', 'taskops_notes')
    op.drop_table('taskops_notes')
