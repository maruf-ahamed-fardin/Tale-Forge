# Deployment

Phase 1 provides Docker Compose scaffolding for:

- PostgreSQL
- FastAPI backend
- Next.js frontend

The API and web services are behind the `app` profile until their implementation is expanded in later phases.

```powershell
docker compose up postgres
docker compose --profile app up --build
```
