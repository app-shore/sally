"""Repository for route plan CRUD operations."""

import logging
from typing import List, Optional

from sqlalchemy import and_, desc
from sqlalchemy.orm import Session, joinedload

from app.models import Driver, RoutePlan, RouteSegment, Vehicle

logger = logging.getLogger(__name__)


class RoutePlanRepository:
    """Repository for managing route plans."""

    def __init__(self, db: Session):
        """Initialize repository with database session."""
        self.db = db

    def create(self, route_plan: RoutePlan) -> RoutePlan:
        """Create a new route plan."""
        self.db.add(route_plan)
        self.db.commit()
        self.db.refresh(route_plan)
        logger.info(f"Created route plan: {route_plan.plan_id}")
        return route_plan

    def get_by_id(self, plan_id: str) -> Optional[RoutePlan]:
        """Get route plan by plan_id."""
        return (
            self.db.query(RoutePlan)
            .options(joinedload(RoutePlan.segments), joinedload(RoutePlan.driver))
            .filter(RoutePlan.plan_id == plan_id)
            .first()
        )

    def get_by_driver(self, driver_id: int, limit: int = 10) -> List[RoutePlan]:
        """Get route plans for a driver (most recent first)."""
        return (
            self.db.query(RoutePlan)
            .filter(RoutePlan.driver_id == driver_id)
            .order_by(desc(RoutePlan.created_at))
            .limit(limit)
            .all()
        )

    def get_active_by_driver(self, driver_id: int) -> Optional[RoutePlan]:
        """Get active route plan for a driver."""
        return (
            self.db.query(RoutePlan)
            .options(joinedload(RoutePlan.segments))
            .filter(
                and_(RoutePlan.driver_id == driver_id, RoutePlan.is_active == True)
            )
            .first()
        )

    def get_all_active(self) -> List[RoutePlan]:
        """Get all active route plans."""
        return (
            self.db.query(RoutePlan)
            .options(joinedload(RoutePlan.segments), joinedload(RoutePlan.driver))
            .filter(RoutePlan.is_active == True)
            .all()
        )

    def update(self, plan_id: str, **kwargs) -> Optional[RoutePlan]:
        """Update route plan fields."""
        plan = self.get_by_id(plan_id)
        if not plan:
            return None

        for key, value in kwargs.items():
            if hasattr(plan, key):
                setattr(plan, key, value)

        self.db.commit()
        self.db.refresh(plan)
        logger.info(f"Updated route plan: {plan_id}")
        return plan

    def activate(self, plan_id: str) -> Optional[RoutePlan]:
        """Activate a route plan and deactivate others for same driver."""
        plan = self.get_by_id(plan_id)
        if not plan:
            return None

        # Deactivate all other plans for this driver
        self.db.query(RoutePlan).filter(
            and_(RoutePlan.driver_id == plan.driver_id, RoutePlan.id != plan.id)
        ).update({"is_active": False})

        # Activate this plan
        plan.is_active = True
        plan.status = "active"

        self.db.commit()
        self.db.refresh(plan)
        logger.info(f"Activated route plan: {plan_id}")
        return plan

    def complete(self, plan_id: str) -> Optional[RoutePlan]:
        """Mark route plan as completed."""
        from datetime import datetime, timezone

        plan = self.get_by_id(plan_id)
        if not plan:
            return None

        plan.status = "completed"
        plan.is_active = False
        plan.completed_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(plan)
        logger.info(f"Completed route plan: {plan_id}")
        return plan

    def delete(self, plan_id: str) -> bool:
        """Delete a route plan (soft delete by marking as cancelled)."""
        plan = self.get_by_id(plan_id)
        if not plan:
            return False

        plan.status = "cancelled"
        plan.is_active = False

        self.db.commit()
        logger.info(f"Deleted route plan: {plan_id}")
        return True

    def add_segment(self, plan_id: str, segment: RouteSegment) -> RouteSegment:
        """Add a segment to a route plan."""
        segment.plan_id = self.db.query(RoutePlan).filter(
            RoutePlan.plan_id == plan_id
        ).first().id

        self.db.add(segment)
        self.db.commit()
        self.db.refresh(segment)
        return segment

    def get_current_segment(self, plan_id: str) -> Optional[RouteSegment]:
        """Get current segment being executed."""
        plan_db_id = self.db.query(RoutePlan.id).filter(
            RoutePlan.plan_id == plan_id
        ).scalar()

        if not plan_db_id:
            return None

        return (
            self.db.query(RouteSegment)
            .filter(
                and_(
                    RouteSegment.plan_id == plan_db_id,
                    RouteSegment.status == "in_progress",
                )
            )
            .first()
        )

    def get_remaining_segments(self, plan_id: str) -> List[RouteSegment]:
        """Get remaining segments in route plan."""
        plan_db_id = self.db.query(RoutePlan.id).filter(
            RoutePlan.plan_id == plan_id
        ).scalar()

        if not plan_db_id:
            return []

        current_segment = self.get_current_segment(plan_id)
        current_order = (
            current_segment.sequence_order if current_segment else 0
        )

        return (
            self.db.query(RouteSegment)
            .filter(
                and_(
                    RouteSegment.plan_id == plan_db_id,
                    RouteSegment.sequence_order > current_order,
                    RouteSegment.status.in_(["planned", "in_progress"]),
                )
            )
            .order_by(RouteSegment.sequence_order)
            .all()
        )
