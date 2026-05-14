"""add chief fields to location

Revision ID: ddf80770875e
Revises: a3f8b2c1d4e5
Create Date: 2026-05-14 10:49:21.312715

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


revision: str = 'ddf80770875e'
down_revision: Union[str, None] = 'a3f8b2c1d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('locations', sa.Column('chief_name', sa.String(length=255), nullable=True))
    op.add_column('locations', sa.Column('chief_phone', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('locations', 'chief_name')
    op.drop_column('locations', 'chief_phone')
