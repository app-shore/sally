# Continuous Monitoring - Implementation Status

**Last Updated:** 2026-01-30
**Status:** ❌ **PLANNED** (Not Implemented)

---

## Overview

Background service that monitors active routes every 60 seconds, detects 14 types of triggers across 5 categories, and generates alerts when dispatcher intervention is needed.

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Monitoring Service | ❌ | Not implemented |
| Trigger Evaluators | ❌ | Not implemented |
| Background Scheduler | ❌ | Not implemented |
| Alert Integration | ❌ | Not implemented |
| Database Models | ⚠️ | Event model exists, monitoring logs missing |

---

## What's Missing (Everything)

### Backend
- [ ] **Monitoring Service** - Background daemon to check routes
- [ ] **Trigger Evaluators** - Logic for 14 trigger types
- [ ] **Scheduler** - Run checks every 60 seconds
- [ ] **Alert Integration** - Generate alerts when triggers fire
- [ ] **Event Logging** - Audit trail of all triggers
- [ ] **Trigger Configuration** - Customizable thresholds
- [ ] **Performance Optimization** - Efficient batch queries

### Frontend
- [ ] **Monitoring Dashboard** - View monitoring status
- [ ] **Trigger History** - See past triggers
- [ ] **Configuration UI** - Adjust monitoring settings

---

## Planned Trigger Types (14 Total)

### Category 1: HOS Compliance (3 triggers)
| Trigger | Condition | Priority | Action |
|---------|-----------|----------|--------|
| HOS_VIOLATION | Active violation detected | CRITICAL | Force rest |
| HOS_APPROACHING_LIMIT | <1h drive time left | MEDIUM | Alert dispatcher |
| BREAK_REQUIRED | 8h since last break | MEDIUM | Insert break |

### Category 2: Driver Behavior (2 triggers)
| Trigger | Condition | Priority | Action |
|---------|-----------|----------|--------|
| DRIVER_NOT_MOVING | No movement 2+ hours during drive | HIGH | Call driver |
| UNEXPECTED_STOP | Stopped at non-planned location | MEDIUM | Check status |

### Category 3: Route Progress (3 triggers)
| Trigger | Condition | Priority | Action |
|---------|-----------|----------|--------|
| DOCK_TIME_EXCEEDED | Actual > estimated by 1h+ | HIGH | Re-plan route |
| ROUTE_DELAY | ETA delay > 30min | MEDIUM | Update customer |
| MISSED_APPOINTMENT | Missed time window | CRITICAL | Notify customer |

### Category 4: Vehicle State (2 triggers)
| Trigger | Condition | Priority | Action |
|---------|-----------|----------|--------|
| FUEL_LOW | Fuel < 20% capacity | HIGH | Insert fuel stop |
| MAINTENANCE_DUE | Maintenance overdue | MEDIUM | Schedule service |

### Category 5: External Conditions (4 triggers)
| Trigger | Condition | Priority | Action |
|---------|-----------|----------|--------|
| WEATHER_ALERT | Severe weather on route | HIGH | Adjust route |
| TRAFFIC_DELAY | Unexpected traffic delay | MEDIUM | Re-calculate ETA |
| ROAD_CLOSURE | Road closed on route | HIGH | Re-route |
| FUEL_PRICE_SPIKE | Significant price increase | LOW | Adjust fuel stops |

**All 14 triggers planned, none implemented.**

---

## Monitoring Architecture (Planned)

```
Background Service (runs every 60s)
    ↓
Fetch all active routes
    ↓
FOR EACH route:
    ├── Evaluate HOS triggers (3 types)
    ├── Evaluate driver behavior triggers (2 types)
    ├── Evaluate route progress triggers (3 types)
    ├── Evaluate vehicle state triggers (2 types)
    └── Evaluate external condition triggers (4 types)
    ↓
IF trigger detected:
    ├── Log event to database
    ├── Generate alert (if threshold met)
    ├── Decide: Re-plan needed? (threshold-based)
    └── Notify dispatcher (if critical)
```

---

## Trigger Evaluation Logic (Example)

### HOS Approaching Limit

```typescript
function evaluateHOSApproaching(route: RoutePlan): Trigger | null {
  const currentSegment = getCurrentSegment(route);
  const driver = getDriver(route.driverId);

  const hoursRemaining = 11 - driver.hours_driven_today;
  const hoursNeeded = calculateRemainingHours(route, currentSegment);

  if (hoursRemaining < 1 && hoursNeeded > hoursRemaining) {
    return {
      type: 'HOS_APPROACHING_LIMIT',
      priority: 'MEDIUM',
      title: 'Driver approaching HOS limit',
      message: `${driver.name} has ${hoursRemaining}h drive time left, needs ${hoursNeeded}h`,
      recommendedAction: 'Monitor driver, ensure rest stop is upcoming'
    };
  }

  return null;
}
```

### Dock Time Exceeded

```typescript
function evaluateDockTimeExceeded(route: RoutePlan): Trigger | null {
  const currentSegment = getCurrentSegment(route);

  if (currentSegment.type === 'dock') {
    const elapsed = Date.now() - currentSegment.startTime;
    const estimated = currentSegment.duration;
    const overtime = elapsed - estimated;

    if (overtime > 60) { // 1 hour overtime
      return {
        type: 'DOCK_TIME_EXCEEDED',
        priority: 'HIGH',
        title: 'Dock time exceeded',
        message: `Stop at ${currentSegment.location} took ${elapsed}h (estimated ${estimated}h)`,
        recommendedAction: 'Re-plan remaining route to update ETAs'
      };
    }
  }

  return null;
}
```

---

## Re-Plan Decision Logic (Planned)

```
Trigger detected
    ↓
Calculate impact (time delay, HOS consumption)
    ↓
IF impact > threshold:
    → YES, trigger re-plan (call Route Planning Engine)
ELSE:
    → NO, just update ETAs
    ↓
Log decision in audit trail
Notify dispatcher
```

**Thresholds:**
- ETA delay > 30min: Re-plan
- HOS shortfall: Re-plan
- Dock time variance > 1h: Re-plan
- Traffic delay > 20min: Re-plan
- Weather alert: Re-plan (if severe)

---

## Database Schema (Planned)

**MonitoringLog** (new table needed)
```prisma
model MonitoringLog {
  id              Int       @id @default(autoincrement())
  routePlanId     Int
  triggerType     String
  triggerDetails  Json
  actionTaken     String?   // re_plan, alert_only, eta_update
  createdAt       DateTime  @default(now())
}
```

**Event** (exists, needs enhancement)
```prisma
model Event {
  id              Int       @id @default(autoincrement())
  tenantId        Int
  eventType       String    // trigger_detected, re_plan_initiated, etc.
  entityType      String    // route_plan, driver, vehicle
  entityId        String
  eventData       Json
  createdAt       DateTime  @default(now())
}
```

---

## Performance Considerations

| Concern | Target | Strategy |
|---------|--------|----------|
| Query efficiency | <100ms per route | Batch fetch, index on status + tenantId |
| Monitoring frequency | 60s | Background job, not API-triggered |
| Alert deduplication | Zero duplicates | Track last alert time per trigger type |
| Scalability | 1000+ active routes | Parallel processing, Redis cache |

---

## Testing Strategy (Planned)

- [ ] Unit tests for each trigger evaluator
- [ ] Integration tests for monitoring service
- [ ] Load tests (1000 routes monitored)
- [ ] E2E tests for trigger → alert → re-plan flow

---

## References

- **Feature Spec:** [FEATURE_SPEC.md](./FEATURE_SPEC.md)
- **Trigger Types:** [TRIGGER_TYPES.md](./TRIGGER_TYPES.md)
- **Related:** [../04-alerts/](../04-alerts/) - Alert system
- **Related:** [../01-route-planning/](../01-route-planning/) - Re-planning logic

---

## Next Steps (Phase 2)

1. **Create Monitoring Service** - Background daemon framework
2. **Implement HOS Triggers** - 3 trigger evaluators
3. **Implement Behavior Triggers** - 2 trigger evaluators
4. **Implement Progress Triggers** - 3 trigger evaluators
5. **Connect to Alert System** - Generate alerts from triggers
6. **Add Re-Plan Logic** - Threshold-based decision making
7. **Add Event Logging** - Audit trail of all triggers
8. **Add Configuration** - Customizable thresholds per tenant
9. **Optimize Performance** - Batch queries, caching
10. **Build Monitoring Dashboard** - UI to view monitoring status

**Estimated Effort:** 2-3 weeks (Phase 2 priority)
