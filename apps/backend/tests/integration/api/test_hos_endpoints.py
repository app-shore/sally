"""Integration tests for HOS Rule endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_hos_check_compliant(client: AsyncClient):
    """Test HOS compliance check with compliant status."""
    payload = {
        "driver_id": "DRV-TEST-001",
        "hours_driven": 5.0,
        "on_duty_time": 7.0,
        "hours_since_break": 4.0,
    }

    response = await client.post("/api/v1/hos-rules/check", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["is_compliant"] is True
    assert data["status"] == "compliant"
    assert data["hours_remaining_to_drive"] == 6.0
    assert data["break_required"] is False
    assert data["rest_required"] is False


@pytest.mark.asyncio
async def test_hos_check_non_compliant(client: AsyncClient):
    """Test HOS compliance check with non-compliant status."""
    payload = {
        "driver_id": "DRV-TEST-002",
        "hours_driven": 12.0,
        "on_duty_time": 13.0,
        "hours_since_break": 12.0,
    }

    response = await client.post("/api/v1/hos-rules/check", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["is_compliant"] is False
    assert data["status"] == "non_compliant"
    assert len(data["violations"]) > 0
    assert data["rest_required"] is True


@pytest.mark.asyncio
async def test_hos_check_invalid_input(client: AsyncClient):
    """Test HOS compliance check with invalid input."""
    payload = {
        "driver_id": "DRV-TEST-003",
        "hours_driven": -5.0,  # Invalid negative value
        "on_duty_time": 7.0,
        "hours_since_break": 4.0,
    }

    response = await client.post("/api/v1/hos-rules/check", json=payload)
    assert response.status_code == 422  # Validation error
