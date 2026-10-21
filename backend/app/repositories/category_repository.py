from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Category


class CategoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> list[Category]:
        return list(self.db.scalars(select(Category).order_by(Category.name)))

    def get(self, category_id: int) -> Category | None:
        return self.db.get(Category, category_id)

    def get_by_name(self, name: str) -> Category | None:
        return self.db.scalar(select(Category).where(func.lower(Category.name) == name.lower()))

    def add(self, category: Category) -> Category:
        self.db.add(category)
        self.db.flush()
        return category
