import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login_success(client: AsyncClient) -> None:
    # Register new user
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "SecurePassword123",
            "display_name": "New Storyteller",
        },
    )
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    # Login with the created account
    login_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "newuser@example.com",
            "password": "SecurePassword123",
        },
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Verify protected /me endpoint
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    user = me_res.json()
    assert user["email"] == "newuser@example.com"
    assert user["display_name"] == "New Storyteller"


@pytest.mark.asyncio
async def test_duplicate_registration_fails(client: AsyncClient) -> None:
    payload = {
        "email": "duplicate@example.com",
        "password": "Password123!",
        "display_name": "First User",
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invalid_login_credentials(client: AsyncClient) -> None:
    res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "WrongPassword",
        },
    )
    assert res.status_code == 401
