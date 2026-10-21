from sqlalchemy.orm import Session

from app.models import Category
from app.repositories import CategoryRepository

DEFAULT_CATEGORIES: tuple[tuple[str, str], ...] = (
    ("Trabajo", "Actividades laborales y del equipo"),
    ("Personal", "Pendientes personales y del día a día"),
    ("Urgente", "Requiere atención inmediata"),
    ("Proyectos", "Iniciativas de mediano plazo por área"),
)


class CategoryService:
    def __init__(self, db: Session):
        self.db = db
        self.categories = CategoryRepository(db)

    def list_categories(self) -> list[Category]:
        return self.categories.list_all()

    def seed_defaults(self) -> int:
        """Inserta las categorías base que falten. Idempotente: correrlo N veces
        deja exactamente las mismas filas. Devuelve cuántas creó."""
        created = 0
        for name, description in DEFAULT_CATEGORIES:
            if self.categories.get_by_name(name) is None:
                self.categories.add(Category(name=name, description=description))
                created += 1
        self.db.commit()
        return created
