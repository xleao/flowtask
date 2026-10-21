"""Esquema inicial: categories 1:N tasks

Revision ID: 0001
Revises:
Create Date: 2026-10-21

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_categories")),
    )
    # Unicidad sin distinguir mayúsculas: "Trabajo" == "trabajo".
    op.create_index("uq_categories_name_lower", "categories", [sa.text("lower(name)")], unique=True)

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="Pendiente", nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('Pendiente', 'En Progreso', 'Completada')", name=op.f("ck_tasks_status_valid")),
        sa.CheckConstraint("length(trim(title)) > 0", name=op.f("ck_tasks_title_not_blank")),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], name=op.f("fk_tasks_category_id_categories"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tasks")),
    )
    op.create_index(op.f("ix_tasks_category_id"), "tasks", ["category_id"])
    op.create_index("ix_tasks_status_due_date", "tasks", ["status", "due_date"])


def downgrade() -> None:
    op.drop_index("ix_tasks_status_due_date", table_name="tasks")
    op.drop_index(op.f("ix_tasks_category_id"), table_name="tasks")
    op.drop_table("tasks")
    op.drop_index("uq_categories_name_lower", table_name="categories")
    op.drop_table("categories")
