/**
 * API client functions for scenarios
 */

import type { Scenario, ScenarioListItem, ScenarioStateResponse } from "@/lib/types/scenario";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function getScenarios(category?: string): Promise<ScenarioListItem[]> {
  const url = new URL(`${API_BASE}/scenarios/`);
  if (category) {
    url.searchParams.set("category", category);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch scenarios: ${response.statusText}`);
  }

  return response.json();
}

export async function getScenario(scenarioId: string): Promise<Scenario> {
  const response = await fetch(`${API_BASE}/scenarios/${scenarioId}/`);

  if (!response.ok) {
    throw new Error(`Failed to fetch scenario: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Load driver and vehicle state from scenario
 * IMPORTANT: Returns ONLY driver/vehicle state, NOT stops
 * Stops always come from the selected load
 */
export async function instantiateScenario(
  scenarioId: string
): Promise<ScenarioStateResponse> {
  const response = await fetch(`${API_BASE}/scenarios/${scenarioId}/instantiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to instantiate scenario: ${response.statusText}`);
  }

  return response.json();
}
