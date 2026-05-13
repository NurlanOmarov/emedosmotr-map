"""district_accounts_use_settlement_id

Revision ID: f2b3c4d5e6f7
Revises: e1a2b3c4d5e6
Create Date: 2026-05-08 11:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 'f2b3c4d5e6f7'
down_revision: str | None = 'e1a2b3c4d5e6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('district_accounts', sa.Column('settlement_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_district_accounts_settlement_id',
        'district_accounts', 'settlements',
        ['settlement_id'], ['settlement_id'],
        ondelete='CASCADE',
    )
    op.drop_constraint('district_accounts_region_id_fkey', 'district_accounts', type_='foreignkey')
    op.drop_column('district_accounts', 'region_id')
    # make settlement_id NOT NULL after data migration (no existing rows, safe)
    op.alter_column('district_accounts', 'settlement_id', nullable=False)


def downgrade() -> None:
    op.add_column('district_accounts', sa.Column('region_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'district_accounts_region_id_fkey',
        'district_accounts', 'regions',
        ['region_id'], ['region_id'],
        ondelete='CASCADE',
    )
    op.drop_constraint('fk_district_accounts_settlement_id', 'district_accounts', type_='foreignkey')
    op.drop_column('district_accounts', 'settlement_id')
