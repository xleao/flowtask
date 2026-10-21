"""Las migraciones son la fuente de verdad del esquema: deben producir exactamente
lo que declaran los modelos, ser reversibles y adoptar bases creadas antes de Alembic."""

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import inspect, text

from app.database import Base, build_engine
from seed import alembic_config, init_db, migrate
from tests.conftest import TEST_DATABASE_URL, reset_database


def _fresh_engine():
    reset_database(TEST_DATABASE_URL)
    return build_engine(TEST_DATABASE_URL)


def test_migrations_match_models():
    engine = _fresh_engine()
    migrate(engine)
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    # Los índices por expresión (lower(name)) no son comparables por autogenerate.
    assert [d for d in diff if "uq_categories_name_lower" not in str(d)] == []


def test_downgrade_to_base_and_upgrade_again():
    engine = _fresh_engine()
    migrate(engine)
    cfg = alembic_config()
    with engine.begin() as conn:
        cfg.attributes["connection"] = conn
        command.downgrade(cfg, "base")
        assert set(inspect(conn).get_table_names()) <= {"alembic_version"}
    migrate(engine)
    assert {"tasks", "categories"} <= set(inspect(engine).get_table_names())


def test_database_created_before_alembic_is_adopted_and_upgraded():
    """Bases creadas con create_all (sin alembic_version) se marcan en 0001 y suben a head."""
    engine = _fresh_engine()
    migrate(engine, "0001")
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE alembic_version"))
        conn.execute(text("INSERT INTO categories (name) VALUES ('Legacy')"))

    init_db(engine)

    columns = {c["name"] for c in inspect(engine).get_columns("tasks")}
    assert "version" in columns
    with engine.connect() as conn:
        assert conn.execute(text("SELECT version_num FROM alembic_version")).scalar() == "0002"
        assert conn.execute(text("SELECT count(*) FROM categories WHERE name = 'Legacy'")).scalar() == 1
