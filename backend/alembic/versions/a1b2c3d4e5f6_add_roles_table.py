"""add roles table

Revision ID: f9e8d7c6b5a4
Revises: c3d4e5f6a7b8
Create Date: 2026-05-12
"""
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

from alembic import op

revision = 'f9e8d7c6b5a4'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'roles',
        sa.Column('name', sa.String(50), primary_key=True),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('color', sa.String(20), nullable=False, server_default='#6B7280'),
        sa.Column('is_system', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('permissions', JSON, nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('roles')
