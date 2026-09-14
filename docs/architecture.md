# Architecture

TaleForge is planned as a monorepo with separated responsibilities.

```text
Browser
   |
   v
apps/web  Next.js, TypeScript, Tailwind, shadcn/ui
   |
   v
apps/api  FastAPI, Pydantic, SQLAlchemy, Alembic
   |
   +-- PostgreSQL
   +-- Local file storage
   +-- AI provider abstraction
          |
          +-- Local Transformers provider
          +-- Future Ollama, vLLM, or external providers
```

The backend owns authentication, authorization, data validation, upload processing, dataset creation, training job orchestration, model registry, generation history, and evaluation records.

The AI folders remain separate so extraction, validation, inference, and training can evolve without turning the API into a monolithic ML script.
