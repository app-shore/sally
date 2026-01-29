/**
 * API client functions for loads
 */

import type { Load, LoadListItem, LoadCreate } from "@/lib/types/load";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getLoads(params?: {
  status?: string;
  customer_name?: string;
  limit?: number;
  offset?: number;
}): Promise<LoadListItem[]> {
  const url = new URL(`${API_BASE}/loads/`);

  if (params) {
    if (params.status) url.searchParams.set("status", params.status);
    if (params.customer_name) url.searchParams.set("customer_name", params.customer_name);
    if (params.limit) url.searchParams.set("limit", params.limit.toString());
    if (params.offset) url.searchParams.set("offset", params.offset.toString());
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch loads: ${response.statusText}`);
  }

  return response.json();
}

export async function getLoad(loadId: string): Promise<Load> {
  const response = await fetch(`${API_BASE}/loads/${loadId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch load: ${response.statusText}`);
  }

  return response.json();
}

export async function createLoad(data: LoadCreate): Promise<Load> {
  const response = await fetch(`${API_BASE}/loads/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to create load: ${response.statusText}`);
  }

  return response.json();
}
