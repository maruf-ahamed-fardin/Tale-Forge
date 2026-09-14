# API

The backend will expose versioned REST endpoints under `/api/v1`.

Planned groups:

- Auth
- Stories
- Generation
- Datasets
- Training runs
- Models
- History
- Evaluation
- Developer status

Phase 1 includes only health endpoints:

```text
GET /health
GET /api/v1/health
```
