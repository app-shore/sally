#!/usr/bin/env python3
"""
Quick test script for intelligent optimization formula.
Tests various scenarios without needing full backend setup.
"""

import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.rest_optimization import (
    RestOptimizationEngine,
    RestOptimizationInput,
    TripRequirement,
)


def print_result(scenario_name: str, result):
    """Print optimization result in readable format."""
    print(f"\n{'='*80}")
    print(f"SCENARIO: {scenario_name}")
    print(f"{'='*80}")
    print(f"Recommendation: {result.recommendation.value.upper()}")
    print(f"Confidence: {result.confidence}%")
    print(f"Driver Can Decline: {result.driver_can_decline}")
    print(f"\nReasoning:")
    print(f"  {result.reasoning}")

    if result.recommended_duration_hours:
        print(f"\nRecommended Duration: {result.recommended_duration_hours}h")

    print(f"\nCurrent Status:")
    print(f"  Drive Hours Remaining: {result.hours_remaining_to_drive:.1f}h")
    print(f"  Duty Hours Remaining: {result.hours_remaining_on_duty:.1f}h")

    if result.hours_after_rest_drive:
        print(f"\nAfter Rest:")
        print(f"  Drive Hours: {result.hours_after_rest_drive:.1f}h")
        print(f"  Duty Hours: {result.hours_after_rest_duty:.1f}h")

    if result.feasibility_analysis:
        fa = result.feasibility_analysis
        print(f"\nFeasibility Analysis:")
        print(f"  Feasible: {fa.feasible}")
        if fa.limiting_factor:
            print(f"  Limiting Factor: {fa.limiting_factor}")
            print(f"  Shortfall: {fa.shortfall_hours:.1f}h")
        print(f"  Total Drive Needed: {fa.total_drive_needed:.1f}h")
        print(f"  Total On-Duty Needed: {fa.total_on_duty_needed:.1f}h")
        print(f"  Drive Margin: {fa.drive_margin:.1f}h")
        print(f"  Duty Margin: {fa.duty_margin:.1f}h")

    if result.opportunity_analysis:
        oa = result.opportunity_analysis
        print(f"\nOpportunity Analysis:")
        print(f"  Score: {oa.score:.0f}/100")
        print(f"    - Dock Score: {oa.dock_score:.0f}")
        print(f"    - Hours Score: {oa.hours_score:.0f}")
        print(f"    - Criticality Score: {oa.criticality_score:.0f}")
        print(f"  Hours Gainable: {oa.hours_gainable:.1f}h")

    if result.cost_analysis:
        ca = result.cost_analysis
        print(f"\nCost Analysis:")
        print(f"  Dock Time Available: {ca.dock_time_available:.1f}h")
        print(f"  Full Rest Extension: {ca.full_rest_extension_hours:.1f}h")
        print(f"  Partial Rest Extension: {ca.partial_rest_extension_hours:.1f}h")


def test_scenario_1_limited_hours_with_dock():
    """Test: Limited hours + dock time available (from spec example)."""
    print("\n" + "="*80)
    print("TEST SCENARIO 1: Limited Hours + Dock Time Available")
    print("="*80)

    engine = RestOptimizationEngine()

    input_data = RestOptimizationInput(
        hours_driven=8.0,
        on_duty_time=7.0,
        hours_since_break=6.0,
        dock_duration_hours=2.0,
        upcoming_trips=[
            TripRequirement(drive_time=2.0, dock_time=2.0, location="Warehouse A"),
            TripRequirement(drive_time=1.5, dock_time=1.0, location="Customer B"),
        ],
    )

    result = engine.recommend_rest(input_data)
    print_result("Limited Hours + Dock Time", result)

    # Assertions
    assert result.recommendation.value == "full_rest", "Should recommend full rest"
    assert result.confidence == 100, "Should have 100% confidence (mandatory)"
    assert not result.driver_can_decline, "Driver cannot decline mandatory rest"
    assert result.feasibility_analysis.feasible == False, "Should not be feasible"
    assert result.feasibility_analysis.limiting_factor == "drive_limit", "Drive limit should be constraint"


def test_scenario_2_on_duty_window_constraint():
    """Test: On-duty window constraint (not drive limit)."""
    print("\n" + "="*80)
    print("TEST SCENARIO 2: On-Duty Window Constraint")
    print("="*80)

    engine = RestOptimizationEngine()

    input_data = RestOptimizationInput(
        hours_driven=5.0,  # Plenty of drive hours
        on_duty_time=11.0,  # High on-duty time
        hours_since_break=5.0,
        dock_duration_hours=3.0,
        upcoming_trips=[
            TripRequirement(drive_time=2.0, dock_time=3.0, location="Warehouse A"),
        ],
    )

    result = engine.recommend_rest(input_data)
    print_result("On-Duty Window Constraint", result)

    # Check limiting factor is duty window
    assert result.feasibility_analysis.limiting_factor == "duty_window", \
        "Should be constrained by duty window, not drive limit"


def test_scenario_3_break_required():
    """Test: Break requirement (driven 8+ hours)."""
    print("\n" + "="*80)
    print("TEST SCENARIO 3: Break Required")
    print("="*80)

    engine = RestOptimizationEngine()

    input_data = RestOptimizationInput(
        hours_driven=4.0,
        on_duty_time=6.0,
        hours_since_break=8.0,  # Break required!
        dock_duration_hours=2.0,
        upcoming_trips=[
            TripRequirement(drive_time=1.0, dock_time=2.0, location="Warehouse A"),
        ],
    )

    result = engine.recommend_rest(input_data)
    print_result("Break Required", result)

    assert result.confidence == 100, "Break requirement should be mandatory"
    assert not result.driver_can_decline, "Driver cannot decline break"


def test_scenario_4_proactive_optimization():
    """Test: Proactive optimization (feasible but good opportunity)."""
    print("\n" + "="*80)
    print("TEST SCENARIO 4: Proactive Optimization")
    print("="*80)

    engine = RestOptimizationEngine()

    input_data = RestOptimizationInput(
        hours_driven=3.0,  # Low utilization
        on_duty_time=5.0,
        hours_since_break=3.0,
        dock_duration_hours=5.0,  # Good dock time
        upcoming_trips=[
            TripRequirement(drive_time=2.0, dock_time=5.0, location="Warehouse A"),
        ],
    )

    result = engine.recommend_rest(input_data)
    print_result("Proactive Optimization", result)

    # Should be feasible but may recommend optional rest
    assert result.feasibility_analysis.feasible == True, "Should be feasible"


def test_scenario_5_no_rest_needed():
    """Test: No rest needed (plenty of hours, short dock)."""
    print("\n" + "="*80)
    print("TEST SCENARIO 5: No Rest Needed")
    print("="*80)

    engine = RestOptimizationEngine()

    input_data = RestOptimizationInput(
        hours_driven=2.0,  # Plenty of hours
        on_duty_time=3.0,
        hours_since_break=2.0,
        dock_duration_hours=1.0,  # Short dock
        upcoming_trips=[
            TripRequirement(drive_time=1.5, dock_time=1.0, location="Customer A"),
        ],
    )

    result = engine.recommend_rest(input_data)
    print_result("No Rest Needed", result)

    assert result.recommendation.value == "no_rest", "Should not recommend rest"
    assert result.feasibility_analysis.feasible == True, "Should be feasible"
    assert result.driver_can_decline == True, "Should be advisory only"


def main():
    """Run all test scenarios."""
    print("\n" + "="*80)
    print("INTELLIGENT REST OPTIMIZATION - TEST SUITE")
    print("="*80)

    try:
        test_scenario_1_limited_hours_with_dock()
        test_scenario_2_on_duty_window_constraint()
        test_scenario_3_break_required()
        test_scenario_4_proactive_optimization()
        test_scenario_5_no_rest_needed()

        print("\n" + "="*80)
        print("ALL TESTS PASSED! ✓")
        print("="*80)
        print("\nThe intelligent optimization formula is working correctly!")
        print("See .specs/INTELLIGENT_OPTIMIZATION_FORMULA.md for algorithm details.")

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
