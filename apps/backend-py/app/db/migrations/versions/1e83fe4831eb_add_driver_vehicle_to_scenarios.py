"""add_driver_vehicle_to_scenarios

Revision ID: 1e83fe4831eb
Revises: c3d4e5f6g7h8
Create Date: 2026-01-23 11:50:01.485096

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e83fe4831eb'
down_revision: Union[str, None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add driver_id and vehicle_id columns to scenarios table
    op.add_column('scenarios', sa.Column('driver_id', sa.String(length=50), nullable=True))
    op.add_column('scenarios', sa.Column('vehicle_id', sa.String(length=50), nullable=True))


def downgrade() -> None:
    # Remove driver_id and vehicle_id columns from scenarios table
    op.drop_column('scenarios', 'vehicle_id')
    op.drop_column('scenarios', 'driver_id')
