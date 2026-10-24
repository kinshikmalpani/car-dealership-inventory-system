from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings
from app.database import make_database
from app.models import Base
from app.routes import router


def create_app(database_url: str | None = None, jwt_secret: str | None = None, initialize_database: bool = False):
    settings = Settings()
    secret = jwt_secret or settings.jwt_secret
    if len(secret) < 32 or secret.startswith("replace-with"):
        raise RuntimeError("Set JWT_SECRET to a random value of at least 32 characters in backend/.env")
    engine, factory = make_database(database_url or settings.database_url)
    if initialize_database:
        Base.metadata.create_all(engine)

    @asynccontextmanager
    async def lifespan(app):
        yield
        engine.dispose()

    app = FastAPI(title="Motorroom Inventory API", version="1.0.0", lifespan=lifespan)
    app.state.session_factory = factory
    app.state.jwt_secret = secret
    app.state.token_minutes = settings.access_token_minutes
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Authorization", "Content-Type"])
    app.include_router(router)
    return app
