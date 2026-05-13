"""add geom column to regions

Revision ID: 0d7e083e03ea
Revises: e2b3c4d5e6f7
Create Date: 2026-05-13 05:06:24.712780

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2
from sqlalchemy.dialects import postgresql

revision: str = '0d7e083e03ea'
down_revision: Union[str, None] = 'e2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add geom column to regions
    op.add_column('regions', sa.Column('geom', geoalchemy2.types.Geometry(geometry_type='POLYGON', srid=4326, dimension=2, from_text='ST_GeomFromEWKT', name='geometry'), nullable=True))
    op.create_index('idx_regions_spatial_geom', 'regions', ['geom'], unique=False, postgresql_using='gist')
    
    # Populate geom column from geometry_json
    op.execute("UPDATE regions SET geom = ST_GeomFromGeoJSON(geometry_json::text) WHERE geometry_json IS NOT NULL")


def downgrade() -> None:
    op.drop_index('idx_regions_spatial_geom', table_name='regions', postgresql_using='gist')
    op.drop_column('regions', 'geom')
