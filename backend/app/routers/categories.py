from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Category
from app.schemas import CategoryRead
from app.services import CategoryService

router = APIRouter(prefix="/categories", tags=["categories"])


def get_category_service(db: Annotated[Session, Depends(get_db)]) -> CategoryService:
    return CategoryService(db)


@router.get("", response_model=list[CategoryRead], summary="Listar categorías")
def list_categories(service: Annotated[CategoryService, Depends(get_category_service)]) -> list[Category]:
    return service.list_categories()
