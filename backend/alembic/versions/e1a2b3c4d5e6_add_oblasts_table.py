"""add_oblasts_table

Revision ID: e1a2b3c4d5e6
Revises: 8f371b85393b
Create Date: 2026-05-08 10:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 'e1a2b3c4d5e6'
down_revision: str | None = '8f371b85393b'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'oblasts',
        sa.Column('oblast_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=True),
        sa.PrimaryKeyConstraint('oblast_id'),
        sa.UniqueConstraint('code'),
    )
    op.add_column('regions', sa.Column('oblast_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_regions_oblast_id',
        'regions', 'oblasts',
        ['oblast_id'], ['oblast_id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_regions_oblast_id', 'regions', type_='foreignkey')
    op.drop_column('regions', 'oblast_id')
    op.drop_table('oblasts')
