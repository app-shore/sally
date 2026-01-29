# Route Planning System - End-to-End Testing Checklist

## Test Date: 2026-01-23

## Prerequisites
- [ ] Backend running at http://localhost:8000
- [ ] Frontend running at http://localhost:3000
- [ ] Database seeded with 7 scenarios and 7 loads
- [ ] PostgreSQL and Redis containers running

## Test Scenarios

### 1. Load Selection Flow
**Objective**: Verify user can select a load and see stops populated

**Steps**:
1. Navigate to http://localhost:3000/route-planner
2. Click on "Load Selection" section
3. Select "LOAD-001: WMT-45892 - Walmart Distribution"
4. Verify:
   - [ ] Load details card appears showing customer, weight, commodity
   - [ ] Stop count shows "3 stops"
   - [ ] Stops section automatically shows 3 stops
   - [ ] Each stop shows pickup/delivery badge
   - [ ] Green checkmark appears on collapsed "Load Selection" section

**Expected Result**: Load selected successfully, stops auto-populated

---

### 2. Scenario Selection with Auto-Load
**Objective**: Verify scenario selection auto-selects driver and vehicle

**Steps**:
1. In "Load Selection" section, select scenario "SCENARIO-001: Fresh Driver - Plenty of Hours"
2. Verify:
   - [ ] Scenario description appears
   - [ ] Driver dropdown auto-selects "DRV-001"
   - [ ] Vehicle dropdown auto-selects "VEH-001"
   - [ ] Driver state sliders show: Hours Driven: 1.0h, On-Duty: 1.5h, Since Break: 1.0h
   - [ ] Vehicle state shows: Fuel ~180/200 gal (90%), MPG: 6.5
   - [ ] Blue badge "From scenario (editable)" appears on both sections

**Expected Result**: Driver and vehicle auto-selected with scenario state

---

### 3. Manual Driver/Vehicle Entry (No Scenario)
**Objective**: Verify user can manually select driver/vehicle without scenario

**Steps**:
1. Select scenario dropdown → "None (Manual entry)"
2. Verify:
   - [ ] Yellow warning appears: "No scenario selected - you must manually set driver and vehicle state below"
   - [ ] Driver dropdown shows empty with "Select driver..."
   - [ ] Vehicle dropdown shows empty with "Select vehicle..."
3. Select driver "DRV-002 - John Smith"
4. Verify:
   - [ ] Driver state loads actual current state from driver (e.g., 9.0h driven)
   - [ ] Driver sliders update to show driver's current HOS state
5. Select vehicle "VEH-002 - UNIT-002"
6. Verify:
   - [ ] Vehicle state loads actual fuel level (e.g., 100/220 gal)
   - [ ] MPG loads from vehicle record

**Expected Result**: Manual selection loads live driver/vehicle state

---

### 4. Driver State Editing
**Objective**: Verify driver state can be edited

**Steps**:
1. With driver selected, adjust "Hours Driven" slider to 8.5h
2. Adjust "On-Duty Time" slider to 10.0h
3. Adjust "Hours Since Break" slider to 6.0h
4. Verify:
   - [ ] Warning colors appear (yellow when approaching limits)
   - [ ] Values update immediately
   - [ ] Warning messages appear (e.g., "Approaching drive limit")

**Expected Result**: Driver state editable with live warnings

---

### 5. Vehicle State Editing
**Objective**: Verify vehicle state can be edited

**Steps**:
1. With vehicle selected, adjust "Fuel Level" slider to 50 gallons
2. Change "Fuel Economy (MPG)" input to 7.0
3. Verify:
   - [ ] Fuel percentage updates (e.g., 50/200 = 25%)
   - [ ] Low fuel warning appears: "⚠ Low fuel"
   - [ ] Estimated range updates (~350 miles)

**Expected Result**: Vehicle state editable with calculated range

---

### 6. Generate Plan Validation
**Objective**: Verify Generate Plan button validates required fields

**Steps**:
1. Clear all selections (reload page)
2. Click "Generate Plan" button
3. Verify:
   - [ ] Button is disabled
   - [ ] Or alert shows: "Please provide: load with stops, Driver ID, Vehicle ID, driver state, vehicle state"
4. Select only load
5. Verify:
   - [ ] Button still disabled (missing driver/vehicle)
6. Select scenario
7. Verify:
   - [ ] Button becomes enabled (all fields populated)

**Expected Result**: Button only enabled when all required fields set

---

### 7. Generate Plan with Scenario
**Objective**: Verify route plan generation and input snapshot

**Steps**:
1. Select LOAD-001 (Walmart, 3 stops)
2. Select SCENARIO-001 (Fresh Driver)
3. Click "Generate Plan"
4. Verify:
   - [ ] Loading state appears: "Generating Plan..."
   - [ ] Right panel shows plan after 2-3 seconds
   - [ ] "Plan Input Summary" card appears at top showing:
     - Load: WMT-45892 - Walmart Distribution
     - Scenario: Fresh Driver - Plenty of Hours
     - Driver: DRV-001 with state (1.0h driven, 1.5h on-duty, 1.0h since break)
     - Vehicle: VEH-001 with state (180/200 gal, 6.5 MPG, ~1170mi range)
     - Optimization: Minimize time
     - Generated timestamp
   - [ ] Route Summary Card shows:
     - Total Distance, Time, Cost
     - Drive/Rest/Fuel segments count
     - Feasibility status: ✓ Feasible
   - [ ] Segments Timeline shows all segments with icons
   - [ ] HOS Compliance section shows compliance status

**Expected Result**: Plan generated with complete input snapshot

---

### 8. Generate Plan without Scenario
**Objective**: Verify plan generation works with manual entry

**Steps**:
1. Select LOAD-002 (Target, 4 stops)
2. Select "None (Manual entry)" for scenario
3. Manually select DRV-003
4. Manually select VEH-003
5. Adjust driver state if needed (e.g., 2.0h driven)
6. Click "Generate Plan"
7. Verify:
   - [ ] Plan generates successfully
   - [ ] Input Summary shows:
     - Load: TGT-12034 - Target Logistics
     - NO scenario section (scenario_id is null)
     - Driver: DRV-003 with manually set state
     - Vehicle: VEH-003 with state
     - Footer note: "Generated with manual driver/vehicle entry (no scenario used)"

**Expected Result**: Plan works without scenario, input snapshot shows manual entry

---

### 9. Scenario Override (Edit Scenario Values)
**Objective**: Verify user can load scenario then edit values

**Steps**:
1. Select LOAD-003 (FedEx)
2. Select SCENARIO-002 (HOS Constrained - driver at 9h driven)
3. Verify driver state shows 9.0h driven (from scenario)
4. Manually adjust driver slider to 7.0h driven
5. Click "Generate Plan"
6. Verify:
   - [ ] Plan generates with EDITED value (7.0h, not 9.0h)
   - [ ] Input snapshot shows 7.0h driven
   - [ ] Scenario name still appears (SCENARIO-002) but with edited values

**Expected Result**: Scenario values are editable before plan generation

---

### 10. Collapsible Sections
**Objective**: Verify sections collapse/expand properly

**Steps**:
1. With all fields filled, click "Load Selection" header
2. Verify:
   - [ ] Section collapses
   - [ ] Green checkmark (✓) appears next to "Load Selection"
   - [ ] Chevron icon rotates
3. Click again to expand
4. Verify:
   - [ ] Section expands
   - [ ] Checkmark disappears (or stays)
   - [ ] Chevron rotates back
5. Repeat for "Driver State", "Vehicle State", "Stops" sections

**Expected Result**: All sections collapsible with visual indicators

---

### 11. Multiple Plan Versions
**Objective**: Verify version tracking when re-generating plans

**Steps**:
1. Generate plan (v1)
2. Change driver state (e.g., increase hours driven from 1h to 5h)
3. Click "Generate Plan" again
4. Verify:
   - [ ] New plan appears (v2)
   - [ ] Version dropdown appears in header: "Version: v2"
   - [ ] Dropdown shows both v1 and v2
5. Select v1 from dropdown
6. Verify:
   - [ ] Plan v1 displays
   - [ ] Input snapshot shows original values (1h driven)
7. Select v2
8. Verify:
   - [ ] Plan v2 displays
   - [ ] Input snapshot shows new values (5h driven)

**Expected Result**: Multiple versions tracked with separate input snapshots

---

### 12. Scenario Without Linked Driver/Vehicle
**Objective**: Test scenario that has null driver_id/vehicle_id (edge case)

**Pre-setup**: Create scenario in DB with null driver_id
**Steps**:
1. Select scenario with null driver_id
2. Verify:
   - [ ] Driver dropdown shows: "Select driver..."
   - [ ] Helper message: "This scenario doesn't specify a driver - please select one manually"
   - [ ] Driver state sliders show scenario template values
3. Manually select driver
4. Verify:
   - [ ] Driver state updates to scenario template (NOT driver's current state)
   - [ ] Can still edit state before generating plan

**Expected Result**: Scenarios without driver_id require manual selection but keep template state

---

### 13. API Error Handling
**Objective**: Verify error messages display properly

**Steps**:
1. Stop backend (docker-compose stop backend)
2. Try to generate plan
3. Verify:
   - [ ] Error message appears: "Failed to fetch..." or similar
   - [ ] Red error card shows below Generate Plan button
   - [ ] Button returns to "Generate Plan" (not stuck on loading)
4. Restart backend (docker-compose start backend)
5. Verify app recovers

**Expected Result**: Graceful error handling with user-friendly messages

---

### 14. Stop Management
**Objective**: Verify stops can be viewed and understand load data

**Steps**:
1. Select LOAD-004 (Amazon, 5 stops)
2. Expand "Stops" section
3. Verify:
   - [ ] All 5 stops displayed
   - [ ] Each stop shows:
     - City, State
     - Pickup/Delivery badge
     - Estimated dock hours
     - Distance from previous (if applicable)
   - [ ] Stops in correct sequence order

**Expected Result**: Stops display complete information from load

---

### 15. HOS Compliance Validation
**Objective**: Verify plans respect HOS limits

**Steps**:
1. Select LOAD-005 (Caterpillar, long route ~900 miles)
2. Select SCENARIO-002 (driver at 9h driven already)
3. Generate plan
4. Verify:
   - [ ] Plan inserts rest stop(s)
   - [ ] HOS Compliance section shows:
     - Drive hours ≤ 11h
     - On-duty hours ≤ 14h
     - 30-min break after 8h driving
   - [ ] Compliance status: ✓ Compliant
   - [ ] No violations listed

**Expected Result**: Plan is HOS-compliant with rest stops inserted

---

### 16. Fuel Stop Detection
**Objective**: Verify fuel stops inserted when needed

**Steps**:
1. Select LOAD-006 (CVS, long route)
2. Select SCENARIO-003 (Low Fuel - only 40 gallons)
3. Generate plan
4. Verify:
   - [ ] Plan includes fuel stop segment
   - [ ] Fuel segment shows:
     - Segment type: 🔴 FUEL
     - Location (fuel station name)
     - Gallons to add
     - Estimated cost
   - [ ] Summary shows "Fuel Stops: 1 (or more)"

**Expected Result**: Fuel stops inserted when vehicle can't reach destination

---

### 17. Split Sleeper Berth Recommendation
**Objective**: Verify 7/3 or 8/2 split recommended for long dock times

**Steps**:
1. Select LOAD-007 (Home Depot)
2. Select SCENARIO-004 (Mid-Shift - Split Sleeper Candidate)
3. Generate plan
4. Verify:
   - [ ] Plan may suggest partial rest (7h or 8h) at dock
   - [ ] Rest segment shows:
     - Rest type: "partial_rest_7_3" or "partial_rest_8_2"
     - Duration: 7h or 8h
     - Reason mentions dock time opportunity

**Expected Result**: Split sleeper used when dock time allows

---

### 18. Version Comparison
**Objective**: Verify version comparison view

**Steps**:
1. Generate plan v1
2. Change driver hours, generate v2
3. Click "Compare Versions" button (if multiple versions exist)
4. Verify:
   - [ ] Side-by-side view appears
   - [ ] v1 on left, v2 on right
   - [ ] Differences highlighted:
     - Changed values in blue
     - Additions in green
     - ↑/↓ arrows for metric changes
   - [ ] Can see which segments changed

**Expected Result**: Clear visual comparison between versions

---

## API Endpoint Tests

### GET /api/v1/scenarios
```bash
curl http://localhost:8000/api/v1/scenarios/ | jq
```
**Verify**:
- [ ] Returns 7 scenarios
- [ ] Each has scenario_id, name, description, category
- [ ] driver_id and vehicle_id fields present

### GET /api/v1/loads
```bash
curl http://localhost:8000/api/v1/loads/ | jq
```
**Verify**:
- [ ] Returns 7 loads
- [ ] Each has load_id, load_number, customer_name, stop_count

### GET /api/v1/loads/{load_id}
```bash
curl http://localhost:8000/api/v1/loads/LOAD-001 | jq
```
**Verify**:
- [ ] Returns load details with stops array
- [ ] Stops have sequence_order, action_type, city, state

### GET /api/v1/drivers
```bash
curl http://localhost:8000/api/v1/drivers/ | jq
```
**Verify**:
- [ ] Returns list of drivers
- [ ] Each has driver_id, name, hours_driven_today, current_duty_status

### GET /api/v1/vehicles
```bash
curl http://localhost:8000/api/v1/vehicles/ | jq
```
**Verify**:
- [ ] Returns list of vehicles
- [ ] Each has vehicle_id, unit_number, fuel_capacity_gallons, current_fuel_gallons, mpg

### POST /api/v1/scenarios/{scenario_id}/instantiate
```bash
curl -X POST http://localhost:8000/api/v1/scenarios/SCENARIO-001/instantiate | jq
```
**Verify**:
- [ ] Returns driver_id: "DRV-001"
- [ ] Returns vehicle_id: "VEH-001"
- [ ] Returns driver_state with hours_driven, on_duty_time, hours_since_break
- [ ] Returns vehicle_state with fuel_capacity_gallons, current_fuel_gallons, mpg

---

## Edge Cases

### Driver at Limit
- [ ] Driver with 11h driven cannot drive more (plan should be infeasible)
- [ ] Warning shown in UI

### Vehicle Out of Fuel
- [ ] Vehicle with 0 gallons shows critical warning
- [ ] Plan requires immediate fuel stop

### Zero is Valid
- [ ] Driver with 0h driven (fresh start) accepted
- [ ] Vehicle with 0 MPG shows warning but doesn't crash

### No Stops
- [ ] Plan generation disabled when no stops
- [ ] Clear error message shown

---

## Performance Benchmarks

### Route Planning
- [ ] 2-stop route: <1s
- [ ] 5-stop route: <3s
- [ ] 10-stop route: <5s

### Page Load
- [ ] Initial page load: <1s
- [ ] Load selection: <500ms
- [ ] Scenario selection: <500ms

---

## Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Accessibility
- [ ] Keyboard navigation works (Tab through form)
- [ ] Screen reader labels present (aria-labels)
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators visible

---

## Mobile Responsiveness (Optional)
- [ ] Layout adapts on tablet (iPad)
- [ ] Buttons large enough for touch (44px min)
- [ ] Scrolling works on small screens

---

## Summary

**Total Tests**: 18 scenarios + 6 API tests + 4 edge cases = 28 tests
**Pass Rate**: ___ / 28
**Critical Failures**: ___
**Non-Critical Issues**: ___

**Tested By**: ___________
**Test Date**: 2026-01-23
**Build Version**: v1.0.0-alpha

---

## Notes

- Database was seeded with 7 scenarios and 7 realistic loads
- All scenarios now have linked driver_id and vehicle_id
- Input snapshot feature captures exact values used for plan generation
- Collapsible sections help organize the multi-step workflow
- Driver/vehicle selection auto-loads current state from database
