"""Add load and scenario models

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6a7
Create Date: 2026-01-23 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create loads table
    op.create_table(
        'loads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('load_id', sa.String(length=50), nullable=False),
        sa.Column('load_number', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('weight_lbs', sa.Float(), nullable=False),
        sa.Column('commodity_type', sa.String(length=100), nullable=False),
        sa.Column('special_requirements', sa.Text(), nullable=True),
        sa.Column('customer_name', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_loads_load_id'), 'loads', ['load_id'], unique=True)
    op.create_index(op.f('ix_loads_status'), 'loads', ['status'], unique=False)

    # Create load_stops table
    op.create_table(
        'load_stops',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('load_id', sa.Integer(), nullable=False),
        sa.Column('stop_id', sa.Integer(), nullable=False),
        sa.Column('sequence_order', sa.Integer(), nullable=False),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('earliest_arrival', sa.Time(), nullable=True),
        sa.Column('latest_arrival', sa.Time(), nullable=True),
        sa.Column('appointment_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('estimated_dock_hours', sa.Float(), nullable=False),
        sa.Column('actual_dock_hours', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['load_id'], ['loads.id'], ),
        sa.ForeignKeyConstraint(['stop_id'], ['stops.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_load_stops_load_id'), 'load_stops', ['load_id'], unique=False)
    op.create_index(op.f('ix_load_stops_stop_id'), 'load_stops', ['stop_id'], unique=False)
    op.create_index(op.f('ix_load_stops_sequence_order'), 'load_stops', ['sequence_order'], unique=False)

    # Create scenarios table
    op.create_table(
        'scenarios',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('scenario_id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('driver_state_template', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('vehicle_state_template', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('stops_template', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('expected_rest_stops', sa.Integer(), nullable=False),
        sa.Column('expected_fuel_stops', sa.Integer(), nullable=False),
        sa.Column('expected_violations', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_scenarios_scenario_id'), 'scenarios', ['scenario_id'], unique=True)
    op.create_index(op.f('ix_scenarios_category'), 'scenarios', ['category'], unique=False)

    # Add load_id foreign key to route_plans table
    op.add_column('route_plans', sa.Column('load_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_route_plans_load_id'), 'route_plans', ['load_id'], unique=False)
    op.create_foreign_key(
        'fk_route_plans_load_id',
        'route_plans',
        'loads',
        ['load_id'],
        ['id']
    )


def downgrade() -> None:
    # Remove load_id from route_plans
    op.drop_constraint('fk_route_plans_load_id', 'route_plans', type_='foreignkey')
    op.drop_index(op.f('ix_route_plans_load_id'), table_name='route_plans')
    op.drop_column('route_plans', 'load_id')

    # Drop scenarios table
    op.drop_index(op.f('ix_scenarios_category'), table_name='scenarios')
    op.drop_index(op.f('ix_scenarios_scenario_id'), table_name='scenarios')
    op.drop_table('scenarios')

    # Drop load_stops table
    op.drop_index(op.f('ix_load_stops_sequence_order'), table_name='load_stops')
    op.drop_index(op.f('ix_load_stops_stop_id'), table_name='load_stops')
    op.drop_index(op.f('ix_load_stops_load_id'), table_name='load_stops')
    op.drop_table('load_stops')

    # Drop loads table
    op.drop_index(op.f('ix_loads_status'), table_name='loads')
    op.drop_index(op.f('ix_loads_load_id'), table_name='loads')
    op.drop_table('loads')
