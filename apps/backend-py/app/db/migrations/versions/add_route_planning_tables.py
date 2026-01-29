"""Add route planning tables

Revision ID: b2c3d4e5f6a7
Revises: 8bd08b6f4a36
Create Date: 2026-01-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = '8bd08b6f4a36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create stops table
    op.create_table(
        'stops',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('stop_id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('address', sa.String(length=500), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=50), nullable=True),
        sa.Column('zip_code', sa.String(length=20), nullable=True),
        sa.Column('lat_lon', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('location_type', sa.String(length=50), nullable=False),
        sa.Column('earliest_arrival', sa.Time(), nullable=True),
        sa.Column('latest_arrival', sa.Time(), nullable=True),
        sa.Column('average_dock_time_hours', sa.Float(), nullable=True),
        sa.Column('dock_notes', sa.Text(), nullable=True),
        sa.Column('fuel_price_per_gallon', sa.Float(), nullable=True),
        sa.Column('last_price_update', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_stops_stop_id'), 'stops', ['stop_id'], unique=True)
    op.create_index(op.f('ix_stops_location_type'), 'stops', ['location_type'], unique=False)

    # Create route_plans table
    op.create_table(
        'route_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.String(length=50), nullable=False),
        sa.Column('route_id', sa.Integer(), nullable=True),
        sa.Column('driver_id', sa.Integer(), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), nullable=False),
        sa.Column('plan_version', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('optimization_priority', sa.String(length=50), nullable=False),
        sa.Column('total_distance_miles', sa.Float(), nullable=False),
        sa.Column('total_drive_time_hours', sa.Float(), nullable=False),
        sa.Column('total_on_duty_time_hours', sa.Float(), nullable=False),
        sa.Column('total_cost_estimate', sa.Float(), nullable=True),
        sa.Column('is_feasible', sa.Boolean(), nullable=False),
        sa.Column('feasibility_issues', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('compliance_report', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['route_id'], ['routes.id'], ),
        sa.ForeignKeyConstraint(['driver_id'], ['drivers.id'], ),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_route_plans_plan_id'), 'route_plans', ['plan_id'], unique=True)
    op.create_index(op.f('ix_route_plans_driver_id'), 'route_plans', ['driver_id'], unique=False)
    op.create_index(op.f('ix_route_plans_vehicle_id'), 'route_plans', ['vehicle_id'], unique=False)
    op.create_index(op.f('ix_route_plans_is_active'), 'route_plans', ['is_active'], unique=False)
    op.create_index(op.f('ix_route_plans_status'), 'route_plans', ['status'], unique=False)

    # Create route_segments table
    op.create_table(
        'route_segments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('segment_id', sa.String(length=50), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('sequence_order', sa.Integer(), nullable=False),
        sa.Column('from_location', sa.String(length=255), nullable=True),
        sa.Column('to_location', sa.String(length=255), nullable=True),
        sa.Column('from_lat_lon', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('to_lat_lon', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('from_stop_id', sa.Integer(), nullable=True),
        sa.Column('to_stop_id', sa.Integer(), nullable=True),
        sa.Column('segment_type', sa.String(length=50), nullable=False),
        sa.Column('distance_miles', sa.Float(), nullable=True),
        sa.Column('drive_time_hours', sa.Float(), nullable=True),
        sa.Column('expected_speed_mph', sa.Float(), nullable=True),
        sa.Column('rest_type', sa.String(length=50), nullable=True),
        sa.Column('rest_duration_hours', sa.Float(), nullable=True),
        sa.Column('rest_reason', sa.Text(), nullable=True),
        sa.Column('fuel_gallons', sa.Float(), nullable=True),
        sa.Column('fuel_cost_estimate', sa.Float(), nullable=True),
        sa.Column('fuel_station_name', sa.String(length=255), nullable=True),
        sa.Column('dock_duration_hours', sa.Float(), nullable=True),
        sa.Column('customer_name', sa.String(length=255), nullable=True),
        sa.Column('appointment_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('hos_state_after', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('estimated_arrival', sa.DateTime(timezone=True), nullable=True),
        sa.Column('estimated_departure', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_arrival', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_departure', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['plan_id'], ['route_plans.id'], ),
        sa.ForeignKeyConstraint(['from_stop_id'], ['stops.id'], ),
        sa.ForeignKeyConstraint(['to_stop_id'], ['stops.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_route_segments_segment_id'), 'route_segments', ['segment_id'], unique=True)
    op.create_index(op.f('ix_route_segments_plan_id'), 'route_segments', ['plan_id'], unique=False)
    op.create_index(op.f('ix_route_segments_sequence_order'), 'route_segments', ['sequence_order'], unique=False)
    op.create_index(op.f('ix_route_segments_segment_type'), 'route_segments', ['segment_type'], unique=False)
    op.create_index(op.f('ix_route_segments_status'), 'route_segments', ['status'], unique=False)

    # Create route_plan_updates table
    op.create_table(
        'route_plan_updates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('update_id', sa.String(length=50), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('update_type', sa.String(length=50), nullable=False),
        sa.Column('triggered_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('triggered_by', sa.String(length=50), nullable=False),
        sa.Column('trigger_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('replan_triggered', sa.Boolean(), nullable=False),
        sa.Column('replan_reason', sa.Text(), nullable=True),
        sa.Column('previous_plan_version', sa.Integer(), nullable=False),
        sa.Column('new_plan_version', sa.Integer(), nullable=True),
        sa.Column('impact_summary', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['plan_id'], ['route_plans.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_route_plan_updates_update_id'), 'route_plan_updates', ['update_id'], unique=True)
    op.create_index(op.f('ix_route_plan_updates_plan_id'), 'route_plan_updates', ['plan_id'], unique=False)
    op.create_index(op.f('ix_route_plan_updates_update_type'), 'route_plan_updates', ['update_type'], unique=False)
    op.create_index(op.f('ix_route_plan_updates_triggered_at'), 'route_plan_updates', ['triggered_at'], unique=False)

    # Add new columns to existing tables

    # Add to drivers table
    op.add_column('drivers', sa.Column('current_plan_id', sa.Integer(), nullable=True))
    op.add_column('drivers', sa.Column('current_location_lat_lon', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.create_foreign_key('fk_drivers_current_plan', 'drivers', 'route_plans', ['current_plan_id'], ['id'])
    op.create_index(op.f('ix_drivers_current_plan_id'), 'drivers', ['current_plan_id'], unique=False)

    # Add to vehicles table
    op.add_column('vehicles', sa.Column('fuel_capacity_gallons', sa.Float(), nullable=True))
    op.add_column('vehicles', sa.Column('current_fuel_gallons', sa.Float(), nullable=True))
    op.add_column('vehicles', sa.Column('mpg', sa.Float(), nullable=True))

    # Add to routes table
    op.add_column('routes', sa.Column('active_plan_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_routes_active_plan', 'routes', 'route_plans', ['active_plan_id'], ['id'])
    op.create_index(op.f('ix_routes_active_plan_id'), 'routes', ['active_plan_id'], unique=False)

    # Add to recommendations table
    op.add_column('recommendations', sa.Column('plan_id', sa.Integer(), nullable=True))
    op.add_column('recommendations', sa.Column('segment_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_recommendations_plan', 'recommendations', 'route_plans', ['plan_id'], ['id'])
    op.create_foreign_key('fk_recommendations_segment', 'recommendations', 'route_segments', ['segment_id'], ['id'])
    op.create_index(op.f('ix_recommendations_plan_id'), 'recommendations', ['plan_id'], unique=False)
    op.create_index(op.f('ix_recommendations_segment_id'), 'recommendations', ['segment_id'], unique=False)


def downgrade() -> None:
    # Remove foreign keys and columns from recommendations
    op.drop_index(op.f('ix_recommendations_segment_id'), table_name='recommendations')
    op.drop_index(op.f('ix_recommendations_plan_id'), table_name='recommendations')
    op.drop_constraint('fk_recommendations_segment', 'recommendations', type_='foreignkey')
    op.drop_constraint('fk_recommendations_plan', 'recommendations', type_='foreignkey')
    op.drop_column('recommendations', 'segment_id')
    op.drop_column('recommendations', 'plan_id')

    # Remove from routes
    op.drop_index(op.f('ix_routes_active_plan_id'), table_name='routes')
    op.drop_constraint('fk_routes_active_plan', 'routes', type_='foreignkey')
    op.drop_column('routes', 'active_plan_id')

    # Remove from vehicles
    op.drop_column('vehicles', 'mpg')
    op.drop_column('vehicles', 'current_fuel_gallons')
    op.drop_column('vehicles', 'fuel_capacity_gallons')

    # Remove from drivers
    op.drop_index(op.f('ix_drivers_current_plan_id'), table_name='drivers')
    op.drop_constraint('fk_drivers_current_plan', 'drivers', type_='foreignkey')
    op.drop_column('drivers', 'current_location_lat_lon')
    op.drop_column('drivers', 'current_plan_id')

    # Drop tables
    op.drop_index(op.f('ix_route_plan_updates_triggered_at'), table_name='route_plan_updates')
    op.drop_index(op.f('ix_route_plan_updates_update_type'), table_name='route_plan_updates')
    op.drop_index(op.f('ix_route_plan_updates_plan_id'), table_name='route_plan_updates')
    op.drop_index(op.f('ix_route_plan_updates_update_id'), table_name='route_plan_updates')
    op.drop_table('route_plan_updates')

    op.drop_index(op.f('ix_route_segments_status'), table_name='route_segments')
    op.drop_index(op.f('ix_route_segments_segment_type'), table_name='route_segments')
    op.drop_index(op.f('ix_route_segments_sequence_order'), table_name='route_segments')
    op.drop_index(op.f('ix_route_segments_plan_id'), table_name='route_segments')
    op.drop_index(op.f('ix_route_segments_segment_id'), table_name='route_segments')
    op.drop_table('route_segments')

    op.drop_index(op.f('ix_route_plans_status'), table_name='route_plans')
    op.drop_index(op.f('ix_route_plans_is_active'), table_name='route_plans')
    op.drop_index(op.f('ix_route_plans_vehicle_id'), table_name='route_plans')
    op.drop_index(op.f('ix_route_plans_driver_id'), table_name='route_plans')
    op.drop_index(op.f('ix_route_plans_plan_id'), table_name='route_plans')
    op.drop_table('route_plans')

    op.drop_index(op.f('ix_stops_location_type'), table_name='stops')
    op.drop_index(op.f('ix_stops_stop_id'), table_name='stops')
    op.drop_table('stops')
