from typing import TYPE_CHECKING

from sqlalchemy import Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.task import Task


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(String(255))

    # 1:N — una categoría agrupa muchas tareas.
    tasks: Mapped[list["Task"]] = relationship(back_populates="category")

    def __repr__(self) -> str:
        return f"<Category id={self.id} name={self.name!r}>"


# "Trabajo" y "trabajo" son la misma categoría (RN-07): unicidad case-insensitive.
Index("uq_categories_name_lower", func.lower(Category.name), unique=True)
