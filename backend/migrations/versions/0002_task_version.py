"""tasks.version para bloqueo optimista (ETag / If-Match)

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-21

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # server_default: las filas existentes arrancan en versión 1 sin backfill aparte.
    with op.batch_alter_table("tasks") as batch:
        batch.add_column(sa.Column("version", sa.Integer(), server_default="1", nullable=False))


def downgrade() -> None:
    with op.batch_alter_table("tasks") as batch:
        batch.drop_column("version")
