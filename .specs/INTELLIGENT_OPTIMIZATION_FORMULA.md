# Intelligent Rest Optimization Formula

## Overview

This document describes the **intelligent optimization formula** that determines whether a driver should extend their rest period during dock time. The formula considers **all HOS compliance parameters** (drive limit, duty window, break requirements) and **upcoming trip requirements** to make optimal rest recommendations.

---

## Core Philosophy

**Turn unavoidable dock time into compliant rest when it makes sense.**

The system doesn't just check compliance - it **optimizes** rest timing by:
1. Analyzing if upcoming trips are feasible with current hours
2. Calculating the opportunity value of extending rest at dock
3. Weighing the cost (additional time) vs benefit (hours gained)
4. Making an intelligent recommendation with confidence score

---

## Input Parameters

### Driver Current State (HOS)
```python
D_current = {
    'drive_hours_remaining': float,      # 0-11 hours remaining
    'duty_hours_remaining': float,       # 0-14 hours remaining
    'hours_since_break': float,          # Hours driven since last 30-min break
    'hours_driven_total': float,         # Total hours driven in current shift
    'on_duty_total': float,              # Total on-duty hours in current shift
}
```

### Upcoming Trip Requirements
```python
T_next = {
    'trips': [
        {
            'drive_time': float,         # Hours of driving needed
            'dock_time': float,          # Hours at dock (on-duty, not driving)
            'loading_time': float,       # Part of dock time (optional)
            'location': str,             # Destination/dock location
        },
        # ... additional trips
    ]
}
```

### HOS Limits (Constants)
```python
HOS = {
    'MAX_DRIVE': 11,              # 11-hour driving limit
    'MAX_DUTY': 14,               # 14-hour on-duty window
    'BREAK_TRIGGER': 8,           # Break required after 8h driving
    'BREAK_DURATION': 0.5,        # 30-minute break
    'FULL_REST': 10,              # 10-hour minimum rest to reset
    'PARTIAL_REST_LONG': 7,       # 7-hour sleeper berth split
    'PARTIAL_REST_SHORT': 3,      # 3-hour sleeper berth split
}
```

---

## Formula Components

### 1. Feasibility Check

**Determines if driver can complete upcoming trips with current hours.**

```python
def calculate_feasibility(D_current, T_next, HOS):
    """
    Check if trips are feasible with current HOS status.

    Returns:
        feasible: bool - Can complete trips?
        limiting_factor: str - What's the constraint? (drive_limit, duty_window, break)
        shortfall_hours: float - How many hours short?
        drive_margin: float - Extra drive hours after trips
        duty_margin: float - Extra duty hours after trips
    """

    # Sum all trip requirements
    total_drive_needed = sum(trip['drive_time'] for trip in T_next['trips'])
    total_dock_needed = sum(trip['dock_time'] for trip in T_next['trips'])
    total_on_duty_needed = total_drive_needed + total_dock_needed

    # Check if break will be required during trips
    will_need_break = (D_current['hours_since_break'] + total_drive_needed) >= HOS['BREAK_TRIGGER']
    if will_need_break:
        total_on_duty_needed += HOS['BREAK_DURATION']  # Break counts as on-duty time

    # Calculate shortfalls
    drive_shortfall = max(0, total_drive_needed - D_current['drive_hours_remaining'])
    duty_shortfall = max(0, total_on_duty_needed - D_current['duty_hours_remaining'])

    # Determine limiting factor
    if drive_shortfall > 0 or duty_shortfall > 0:
        limiting_factor = 'drive_limit' if drive_shortfall >= duty_shortfall else 'duty_window'
        shortfall_hours = max(drive_shortfall, duty_shortfall)
        feasible = False
    else:
        limiting_factor = None
        shortfall_hours = 0
        feasible = True

    return {
        'feasible': feasible,
        'limiting_factor': limiting_factor,
        'shortfall_hours': shortfall_hours,
        'total_drive_needed': total_drive_needed,
        'total_on_duty_needed': total_on_duty_needed,
        'will_need_break': will_need_break,
        'drive_margin': D_current['drive_hours_remaining'] - total_drive_needed,
        'duty_margin': D_current['duty_hours_remaining'] - total_on_duty_needed,
    }
```

**Key Insight:** We must check **both** drive limit and duty window. Even with plenty of drive hours, the 14-hour duty window (which includes dock time) can be the limiting factor.

---

### 2. Opportunity Score

**Calculates the value/opportunity of extending rest at dock (0-100 scale).**

```python
def calculate_rest_opportunity(D_current, T_next, HOS):
    """
    Score the opportunity value of taking rest at dock.

    Scoring Factors:
        - Dock Time Availability (0-30 points)
        - Hours Gainable (0-30 points)
        - Current Hours Criticality (0-40 points)

    Returns:
        score: 0-100 - Overall opportunity score
        breakdown: Individual factor scores
    """

    first_trip = T_next['trips'][0]
    dock_time_available = first_trip['dock_time']

    # Factor 1: Dock Time Availability (0-30 points)
    # More dock time = better opportunity to leverage for rest
    if dock_time_available >= HOS['FULL_REST']:
        dock_score = 30  # Perfect - already have 10h at dock
    elif dock_time_available >= HOS['PARTIAL_REST_LONG']:
        dock_score = 20  # Good - can do 7h partial rest
    elif dock_time_available >= 2:
        dock_score = 10  # Marginal - some opportunity
    else:
        dock_score = 0   # Too short to be useful

    # Factor 2: Hours Gainable (0-30 points)
    # How many hours would driver gain from taking full rest?
    if dock_time_available >= HOS['FULL_REST'] or dock_time_available >= 2:
        drive_gainable = HOS['MAX_DRIVE'] - D_current['drive_hours_remaining']
        duty_gainable = HOS['MAX_DUTY'] - D_current['duty_hours_remaining']
        hours_gainable = max(drive_gainable, duty_gainable)

        # Normalize to 0-30 scale (max gain is 11 hours)
        hours_score = min(30, (hours_gainable / HOS['MAX_DRIVE']) * 30)
    else:
        hours_gainable = 0
        hours_score = 0

    # Factor 3: Current Hours Criticality (0-40 points)
    # How badly does driver need rest? (highest weight)
    drive_utilization = D_current['hours_driven_total'] / HOS['MAX_DRIVE']
    duty_utilization = D_current['on_duty_total'] / HOS['MAX_DUTY']
    max_utilization = max(drive_utilization, duty_utilization)

    if max_utilization >= 0.9:
        criticality_score = 40  # Critical - nearly exhausted
    elif max_utilization >= 0.75:
        criticality_score = 30  # High - should rest soon
    elif max_utilization >= 0.5:
        criticality_score = 15  # Moderate
    else:
        criticality_score = 5   # Low - plenty of hours left

    # Total opportunity score
    opportunity_score = dock_score + hours_score + criticality_score

    return {
        'score': opportunity_score,
        'dock_score': dock_score,
        'hours_score': hours_score,
        'criticality_score': criticality_score,
        'dock_time_available': dock_time_available,
        'hours_gainable': hours_gainable,
    }
```

**Opportunity Thresholds:**
- **0-30**: Low opportunity (don't recommend rest)
- **31-60**: Moderate opportunity (consider if feasibility marginal)
- **61-100**: High opportunity (strong recommendation)

---

### 3. Rest Extension Cost

**Calculates the "cost" (additional time) needed to extend dock time to full rest.**

```python
def calculate_rest_cost(D_current, T_next, HOS):
    """
    Calculate how much additional time is needed to extend rest.

    Returns:
        full_rest_extension_hours: Additional time for 10h full rest
        partial_rest_extension_hours: Additional time for 7h partial rest
    """

    first_trip = T_next['trips'][0]
    dock_time_available = first_trip['dock_time']

    # Cost for full rest (10 hours)
    if dock_time_available >= HOS['FULL_REST']:
        full_rest_extension = 0  # No additional time needed!
    else:
        full_rest_extension = HOS['FULL_REST'] - dock_time_available

    # Cost for partial rest (7 hours)
    if dock_time_available >= HOS['PARTIAL_REST_LONG']:
        partial_rest_extension = 0
    else:
        partial_rest_extension = HOS['PARTIAL_REST_LONG'] - dock_time_available

    return {
        'full_rest_extension_hours': full_rest_extension,
        'partial_rest_extension_hours': partial_rest_extension,
        'dock_time_available': dock_time_available,
    }
```

**Cost Thresholds:**
- **0h**: Free - dock time already covers rest
- **1-3h**: Low cost - minimal extension
- **4-6h**: Moderate cost
- **7+h**: High cost - may not be worth it

---

### 4. Optimization Decision Engine

**Combines all factors to make the intelligent recommendation.**

```python
def optimize_rest_decision(D_current, T_next, HOS):
    """
    Main optimization formula: Decide whether to extend rest.

    Returns:
        recommendation: str - Action to take
        confidence: int - Confidence level (0-100)
        reasoning: str - Human-readable explanation
    """

    # Calculate all factors
    feasibility = calculate_feasibility(D_current, T_next, HOS)
    opportunity = calculate_rest_opportunity(D_current, T_next, HOS)
    cost = calculate_rest_cost(D_current, T_next, HOS)


    # ========================================
    # DECISION LOGIC (Priority Order)
    # ========================================


    # PRIORITY 1: MANDATORY REST (Compliance Issue)
    # --------------------------------------------
    if not feasibility['feasible']:
        if cost['dock_time_available'] >= 2:
            # Can leverage dock time toward mandatory rest
            recommendation = "EXTEND_DOCK_TO_FULL_REST"
            confidence = 100  # Mandatory
            reasoning = (
                f"Trip not feasible with current hours. "
                f"Shortfall: {feasibility['shortfall_hours']:.1f}h ({feasibility['limiting_factor']}). "
                f"Extending dock time ({cost['dock_time_available']:.1f}h) to full 10h rest "
                f"will reset all hours and enable trip completion."
            )
        else:
            # Dock time too short - must rest elsewhere
            recommendation = "FULL_REST_REQUIRED"
            confidence = 100
            reasoning = (
                f"Trip not feasible. Must take full 10h rest. "
                f"Dock time ({cost['dock_time_available']:.1f}h) too short to leverage."
            )


    # PRIORITY 2: BREAK REQUIREMENT OVERRIDE
    # --------------------------------------------
    elif D_current['hours_since_break'] >= HOS['BREAK_TRIGGER']:
        # 30-minute break required immediately
        recommendation = "TAKE_BREAK_AT_DOCK"
        confidence = 100
        reasoning = (
            f"30-minute break required (driven {D_current['hours_since_break']:.1f}h without break). "
            f"Take off-duty break during dock time before continuing."
        )


    # PRIORITY 3: FEASIBLE BUT MARGINAL (Risk Management)
    # --------------------------------------------
    elif feasibility['drive_margin'] < 2 or feasibility['duty_margin'] < 2:
        # Can complete trips but with tight margins

        if opportunity['score'] >= 50 and cost['full_rest_extension_hours'] <= 5:
            # Good opportunity + reasonable cost = recommend rest
            recommendation = "EXTEND_DOCK_TO_FULL_REST"
            confidence = 75
            reasoning = (
                f"Trip feasible but marginal (margin: {feasibility['drive_margin']:.1f}h drive, "
                f"{feasibility['duty_margin']:.1f}h duty). "
                f"Opportunity score: {opportunity['score']}/100. "
                f"Extending rest by {cost['full_rest_extension_hours']:.1f}h provides "
                f"{opportunity['hours_gainable']:.1f}h gain and better safety margin."
            )

        elif opportunity['score'] >= 40 and cost['partial_rest_extension_hours'] <= 3:
            # Moderate opportunity - suggest partial rest
            recommendation = "PARTIAL_REST_OPTION"
            confidence = 65
            reasoning = (
                f"Trip marginal. Consider 7-hour partial rest (7/3 split). "
                f"Extension needed: {cost['partial_rest_extension_hours']:.1f}h. "
                f"Provides some recovery while preserving schedule."
            )

        else:
            # Low opportunity or high cost - proceed but monitor
            recommendation = "NO_REST_BUT_MONITOR"
            confidence = 60
            reasoning = (
                f"Trip feasible but with tight margins (drive: {feasibility['drive_margin']:.1f}h, "
                f"duty: {feasibility['duty_margin']:.1f}h). "
                f"Monitor closely. Plan for rest after delivery."
            )


    # PRIORITY 4: FEASIBLE WITH GOOD MARGIN (Optimization)
    # --------------------------------------------
    elif feasibility['drive_margin'] >= 2 and feasibility['duty_margin'] >= 2:
        # Trips easily feasible - check if rest is still beneficial

        if opportunity['score'] >= 60 and cost['full_rest_extension_hours'] <= 5:
            # High opportunity + low cost = optional optimization
            recommendation = "OPTIONAL_FULL_REST"
            confidence = 55
            reasoning = (
                f"Trip easily feasible. However, dock time ({cost['dock_time_available']:.1f}h) "
                f"presents good rest opportunity (score: {opportunity['score']}/100). "
                f"Extending by {cost['full_rest_extension_hours']:.1f}h would gain "
                f"{opportunity['hours_gainable']:.1f}h for next shift. Optional optimization."
            )

        else:
            # Low opportunity or not worth the cost
            recommendation = "NO_REST_NEEDED"
            confidence = 80
            reasoning = (
                f"Trip easily feasible with {feasibility['drive_margin']:.1f}h drive margin "
                f"and {feasibility['duty_margin']:.1f}h duty margin. "
                f"No rest needed. Continue as planned."
            )


    return {
        'recommendation': recommendation,
        'confidence': confidence,
        'reasoning': reasoning,
        'feasibility': feasibility,
        'opportunity': opportunity,
        'cost': cost,
        'metrics': {
            'opportunity_score': opportunity['score'],
            'extension_hours': cost['full_rest_extension_hours'],
            'hours_gainable': opportunity.get('hours_gainable', 0),
            'trip_feasible': feasibility['feasible'],
        }
    }
```

---

## Recommendation Types

### 1. EXTEND_DOCK_TO_FULL_REST
- **When:** Trip not feasible OR marginal with high opportunity
- **Action:** Extend dock time to 10 hours for full rest
- **Confidence:** 75-100%
- **Driver can decline:** Only if not mandatory (confidence < 100)

### 2. FULL_REST_REQUIRED
- **When:** Trip not feasible and dock time too short
- **Action:** Take 10-hour rest (not at dock)
- **Confidence:** 100%
- **Driver can decline:** No (compliance issue)

### 3. TAKE_BREAK_AT_DOCK
- **When:** 30-minute break required
- **Action:** Take off-duty break during dock time
- **Confidence:** 100%
- **Driver can decline:** No (compliance requirement)

### 4. PARTIAL_REST_OPTION
- **When:** Marginal feasibility, moderate opportunity
- **Action:** Consider 7-hour partial rest (7/3 split)
- **Confidence:** 60-70%
- **Driver can decline:** Yes

### 5. OPTIONAL_FULL_REST
- **When:** Feasible but good opportunity for optimization
- **Action:** Consider extending for full reset
- **Confidence:** 50-60%
- **Driver can decline:** Yes

### 6. NO_REST_BUT_MONITOR
- **When:** Marginal feasibility, low opportunity
- **Action:** Continue but monitor closely
- **Confidence:** 60-70%
- **Driver can decline:** N/A (advisory)

### 7. NO_REST_NEEDED
- **When:** Easily feasible, low opportunity
- **Action:** Continue as planned
- **Confidence:** 75-85%
- **Driver can decline:** N/A (no action needed)

---

## Example Scenarios

### Scenario 1: Limited Hours + Dock Time Available

**Input:**
```json
{
  "driver_state": {
    "drive_hours_remaining": 3.0,
    "duty_hours_remaining": 7.0,
    "hours_since_break": 6.0,
    "hours_driven_total": 8.0,
    "on_duty_total": 7.0
  },
  "upcoming_trips": [
    {"drive_time": 2.0, "dock_time": 2.0, "location": "Warehouse A"},
    {"drive_time": 1.5, "dock_time": 1.0, "location": "Customer B"}
  ]
}
```

**Formula Execution:**

1. **Feasibility Check:**
   - Total drive needed: 2.0 + 1.5 = 3.5h
   - Total on-duty needed: 3.5 + 3.0 = 6.5h
   - Drive shortfall: 3.5 - 3.0 = **0.5h** ❌
   - Feasible: **NO** (drive_limit)

2. **Opportunity Score:**
   - Dock time: 2h → dock_score = 10
   - Hours gainable: 11 - 3 = 8h → hours_score = 22
   - Criticality: 73% → criticality_score = 30
   - **Total: 62/100**

3. **Cost:**
   - Full rest extension: 10 - 2 = **8h**

4. **Decision:**
   - **Recommendation:** EXTEND_DOCK_TO_FULL_REST
   - **Confidence:** 100%
   - **Reasoning:** "Trip not feasible with current hours. Shortfall: 0.5h (drive_limit). Extending dock time (2.0h) to full 10h rest will reset all hours and enable trip completion."

---

### Scenario 2: On-Duty Window Constraint

**Input:**
```json
{
  "driver_state": {
    "drive_hours_remaining": 6.0,
    "duty_hours_remaining": 3.0,
    "hours_since_break": 5.0,
    "hours_driven_total": 5.0,
    "on_duty_total": 11.0
  },
  "upcoming_trips": [
    {"drive_time": 2.0, "dock_time": 3.0, "location": "Warehouse A"}
  ]
}
```

**Formula Execution:**

1. **Feasibility Check:**
   - Total drive needed: 2.0h
   - Total on-duty needed: 2.0 + 3.0 = 5.0h
   - Drive shortfall: 0 ✅
   - Duty shortfall: 5.0 - 3.0 = **2.0h** ❌
   - Feasible: **NO** (duty_window)

2. **Decision:**
   - **Recommendation:** EXTEND_DOCK_TO_FULL_REST
   - **Confidence:** 100%
   - **Limiting Factor:** 14-hour duty window (critical insight!)

---

### Scenario 3: Proactive Optimization

**Input:**
```json
{
  "driver_state": {
    "drive_hours_remaining": 8.0,
    "duty_hours_remaining": 9.0,
    "hours_since_break": 3.0,
    "hours_driven_total": 3.0,
    "on_duty_total": 5.0
  },
  "upcoming_trips": [
    {"drive_time": 2.0, "dock_time": 5.0, "location": "Warehouse A"}
  ]
}
```

**Formula Execution:**

1. **Feasibility Check:**
   - Fully feasible ✅
   - Drive margin: 6.0h
   - Duty margin: 4.0h

2. **Opportunity Score:**
   - Dock time: 5h → dock_score = 20
   - Hours gainable: 3h → hours_score = 8
   - Criticality: 27% → criticality_score = 5
   - **Total: 33/100** (low)

3. **Decision:**
   - **Recommendation:** NO_REST_NEEDED
   - **Confidence:** 80%
   - Opportunity too low to justify extension

---

## API Integration

### Endpoint: `POST /api/v1/optimization/recommend`

**Request:**
```json
{
  "hours_driven": 8.0,
  "on_duty_time": 7.0,
  "hours_since_break": 6.0,
  "dock_duration_hours": 2.0,
  "post_load_drive_hours": 3.5,
  "upcoming_trips": [
    {"drive_time": 2.0, "dock_time": 2.0},
    {"drive_time": 1.5, "dock_time": 1.0}
  ]
}
```

**Response:**
```json
{
  "recommendation": "EXTEND_DOCK_TO_FULL_REST",
  "confidence": 100,
  "priority": "mandatory",
  "reasoning": "Trip not feasible with current hours. Shortfall: 0.5h (drive_limit). Extending dock time (2.0h) to full 10h rest will reset all hours and enable trip completion.",

  "action": {
    "type": "extend_rest",
    "current_dock_time": 2.0,
    "extend_to": 10.0,
    "additional_hours": 8.0,
    "rest_type": "full_sleeper_berth"
  },

  "before_rest": {
    "drive_hours_remaining": 3.0,
    "duty_hours_remaining": 7.0,
    "can_complete_trips": false
  },

  "after_rest": {
    "drive_hours_remaining": 11.0,
    "duty_hours_remaining": 14.0,
    "can_complete_trips": true,
    "hours_gained": 8.0
  },

  "metrics": {
    "opportunity_score": 62,
    "extension_hours": 8.0,
    "hours_gainable": 8.0,
    "trip_feasible": false
  },

  "feasibility_analysis": {
    "feasible": false,
    "limiting_factor": "drive_limit",
    "shortfall_hours": 0.5,
    "total_drive_needed": 3.5,
    "total_on_duty_needed": 6.5,
    "drive_margin": -0.5,
    "duty_margin": 0.5,
    "will_need_break": false
  },

  "opportunity_analysis": {
    "score": 62,
    "dock_score": 10,
    "hours_score": 22,
    "criticality_score": 30,
    "dock_time_available": 2.0,
    "hours_gainable": 8.0
  },

  "cost_analysis": {
    "full_rest_extension_hours": 8.0,
    "partial_rest_extension_hours": 5.0,
    "dock_time_available": 2.0
  },

  "compliance": {
    "is_compliant": true,
    "driver_can_decline": false,
    "mandatory": true
  }
}
```

---

## Key Advantages

### 1. Comprehensive Analysis
- Considers **all HOS parameters** (drive, duty, break)
- Looks at **multiple upcoming trips**, not just next stop
- Identifies **limiting factor** (drive vs duty vs break)

### 2. Intelligent Scoring
- **Opportunity score** (0-100) quantifies rest value
- **Cost calculation** shows time investment needed
- **Confidence level** indicates recommendation strength

### 3. Compliance-First
- **Mandatory recommendations** (confidence 100%) cannot be declined
- **Optional optimizations** (confidence <100%) are suggestions
- Full **audit trail** with reasoning for every decision

### 4. Future ML-Ready
- Current formula is **rule-based** and interpretable
- Structured to feed into **ML model** later
- Opportunity score can become **ML confidence score**

---

## Future Enhancements

### Phase 1 (Current - Rule-Based)
- ✅ Multi-factor scoring (dock time, hours gainable, criticality)
- ✅ Feasibility analysis across all HOS limits
- ✅ Cost-benefit calculation
- ✅ Confidence-based recommendations

### Phase 2 (ML Integration)
- 🔄 Historical data: Learn from past accepted/declined recommendations
- 🔄 Driver preferences: Personalize recommendations per driver
- 🔄 Lane-specific patterns: Learn optimal rest points per route
- 🔄 Dynamic thresholds: Adjust scoring based on outcomes

### Phase 3 (Advanced)
- 🔄 Multi-trip optimization: Plan rest across entire route
- 🔄 Appointment constraints: Factor in delivery deadlines
- 🔄 Traffic predictions: Adjust drive time estimates
- 🔄 Weather impacts: Account for speed reductions

---

## Implementation Notes

### Code Location
- **Formula:** `/apps/backend/app/services/rest_optimization.py`
- **API:** `/apps/backend/app/api/v1/endpoints/optimization.py`
- **Constants:** `/apps/backend/app/core/constants.py`

### Testing Strategy
- Unit tests for each formula component
- Integration tests with real-world scenarios
- Edge case testing (zero hours, multiple trips, etc.)
- Compliance validation tests

### Performance
- Formula executes in **<10ms** (simple calculations)
- No external API calls needed
- Cacheable for repeated queries with same parameters

---

## Conclusion

This intelligent optimization formula transforms REST-OS from a simple compliance checker into a **proactive decision-making system**. It doesn't just tell drivers what they *can't* do - it tells them what they *should* do to maximize efficiency while staying compliant.

**The driver always has final say** (except for mandatory compliance issues), but now they have **data-driven recommendations** to guide their decisions.
