import os

import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

load_dotenv()


def get_engine(database: str | None = None):
    """
    Create a connection to local Docker PostgreSQL.
    """

    if database is None:
        database = os.getenv("POSTGRES_DATABASE")

    connection_url = URL.create(
        drivername="postgresql+psycopg2",
        username=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        database=database,
        query={"sslmode": "disable"}
    )

    return create_engine(
        connection_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10
    )


def create_database() -> None:
    """
    Create the target PostgreSQL database if it does not exist.
    """

    target_db = os.getenv("POSTGRES_DATABASE")

    conn = None

    try:
        conn = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=os.getenv("POSTGRES_PORT", "5432"),
            database="postgres",
            user=os.getenv("POSTGRES_USER"),
            password=os.getenv("POSTGRES_PASSWORD"),
            sslmode="disable"
        )

        conn.autocommit = True

        with conn.cursor() as cursor:

            cursor.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (target_db,)
            )

            if not cursor.fetchone():

                print(f"Creating database '{target_db}'...")

                cursor.execute(
                    sql.SQL("CREATE DATABASE {}").format(
                        sql.Identifier(target_db)
                    )
                )

                print(f"Database '{target_db}' created successfully.")

            else:
                print(f"Database '{target_db}' already exists.")

    except Exception as exc:
        print(f"Failed to create database: {exc}")
        raise

    finally:
        if conn is not None:
            conn.close()