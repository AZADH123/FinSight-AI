from sqlalchemy import text

# Replace this import with your actual module path
from database.connection import get_engine, create_database

create_database()

engine = get_engine()

with engine.connect() as connection:

    result = connection.execute(
        text("SELECT current_database();")
    )

    print("Connection successful")
    print("Database:", result.scalar())

    result = connection.execute(
        text("SELECT version();")
    )

    print("Version:", result.scalar())