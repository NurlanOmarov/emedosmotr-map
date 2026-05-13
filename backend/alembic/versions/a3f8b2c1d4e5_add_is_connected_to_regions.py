"""add is_connected to regions

Revision ID: a3f8b2c1d4e5
Revises: 0d7e083e03ea
Create Date: 2026-05-13

"""
from typing import Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a3f8b2c1d4e5'
down_revision: Union[str, None] = '0d7e083e03ea'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'regions',
        sa.Column('is_connected', sa.Boolean(), nullable=False, server_default='false'),
    )


def downgrade() -> None:
    op.drop_column('regions', 'is_connected')
