from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.datasets import router as datasets_router
from app.api.v1.generate import router as generate_router
from app.api.v1.stories import router as stories_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(stories_router)
api_router.include_router(datasets_router)
api_router.include_router(generate_router)

