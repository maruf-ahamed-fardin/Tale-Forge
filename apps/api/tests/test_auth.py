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


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(client: AsyncClient) -> None:
    # Protected endpoint without Authorization header must return 401
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert "not authenticated" in res.json()["detail"].lower() or "required" in res.json()["detail"].lower()

    # Protected story endpoint without Authorization header must also return 401
    stories_res = await client.get("/api/v1/stories")
    assert stories_res.status_code == 401


@pytest.mark.asyncio
async def test_malformed_token_rejected(client: AsyncClient) -> None:
    res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.token.value"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_rate_limiting_on_login(client: AsyncClient) -> None:
    # 10 attempts allowed per minute; 11th must trigger 429
    last_status = 200
    for i in range(11):
        res = await client.post(
            "/api/v1/auth/login",
            json={
                "email": f"brute_force_{i}@example.com",
                "password": "WrongPassword123",
            },
        )
        last_status = res.status_code

    assert last_status == 429
    assert "retry-after" in res.headers


