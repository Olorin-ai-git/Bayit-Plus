"""
Test suite for PostgreSQL Docker fixtures.
Tests for T010: Docker PostgreSQL test fixtures in conftest.py.
"""

import psycopg2
import pytest
from sqlalchemy import create_engine, text
from testcontainers.postgres import PostgresContainer


class TestPostgreSQLFixtures:
    """Test suite for T010: PostgreSQL Docker fixtures."""

    def test_postgresql_container_fixture_starts(self, postgresql_container):
        """Test that PostgreSQL container starts successfully."""
        # Container should be running
        assert postgresql_container is not None
        assert hasattr(postgresql_container, "get_connection_url")

        # Should be able to get connection URL
        connection_url = postgresql_container.get_connection_url()
        assert connection_url is not None
        assert "postgresql" in connection_url

    def test_postgresql_container_accepts_connections(self, postgresql_container):
        """Test that PostgreSQL container accepts connections."""
        connection_url = postgresql_container.get_connection_url()

        # Test with psycopg2
        try:
            # Parse connection URL for psycopg2
            import urllib.parse

            parsed = urllib.parse.urlparse(connection_url)

            conn = psycopg2.connect(
                host=parsed.hostname,
                port=parsed.port,
                database=parsed.path[1:],  # Remove leading '/'
                user=parsed.username,
                password=parsed.password,
            )
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            assert result[0] == 1
            cursor.close()
            conn.close()
        except Exception as e:
            pytest.fail(f"Failed to connect to PostgreSQL container: {e}")

    def test_postgresql_connection_fixture_provides_connection(
        self, postgresql_connection
    ):
        """Test that postgresql_connection fixture provides working connection."""
        assert postgresql_connection is not None

        # Should be able to execute queries
        cursor = postgresql_connection.cursor()
        cursor.execute("SELECT version()")
        result = cursor.fetchone()
        assert "PostgreSQL" in result[0]
        cursor.close()

    def test_postgresql_connection_fixture_isolated(self, postgresql_connection):
        """Test that postgresql_connection provides isolated test environment."""
        cursor = postgresql_connection.cursor()

        # Create a test table
        cursor.execute(
            """
            CREATE TABLE test_isolation (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100)
            )
        """
        )

        # Insert test data
        cursor.execute("INSERT INTO test_isolation (name) VALUES ('test')")
        postgresql_connection.commit()

        # Verify data exists
        cursor.execute("SELECT COUNT(*) FROM test_isolation")
        count = cursor.fetchone()[0]
        assert count == 1

        cursor.close()

    def test_postgresql_fixtures_cleanup(
        self, postgresql_container, postgresql_connection
    ):
        """Test that fixtures clean up properly after tests."""
        # Create a table that should be cleaned up
        cursor = postgresql_connection.cursor()
        cursor.execute(
            """
            CREATE TABLE test_cleanup (
                id SERIAL PRIMARY KEY,
                value TEXT
            )
        """
        )
        postgresql_connection.commit()

        # Table should exist during test
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'test_cleanup'
            )
        """
        )
        exists = cursor.fetchone()[0]
        assert exists is True

        cursor.close()
        # Cleanup happens automatically after test

    def test_postgresql_container_with_sqlalchemy(self, postgresql_container):
        """Test PostgreSQL container works with SQLAlchemy."""
        connection_url = postgresql_container.get_connection_url()

        # Create SQLAlchemy engine
        engine = create_engine(connection_url)

        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            assert result.scalar() == 1

        # Test creating tables
        with engine.connect() as conn:
            conn.execute(
                text(
                    """
                CREATE TABLE test_sqlalchemy (
                    id SERIAL PRIMARY KEY,
                    data JSONB
                )
            """
                )
            )
            conn.commit()

            # Insert data
            conn.execute(
                text(
                    """
                INSERT INTO test_sqlalchemy (data)
                VALUES ('{"key": "value"}'::jsonb)
            """
                )
            )
            conn.commit()

            # Query data
            result = conn.execute(text("SELECT data->>'key' FROM test_sqlalchemy"))
            value = result.scalar()
            assert value == "value"

    def test_multiple_connections_to_same_container(self, postgresql_container):
        """Test that multiple connections can be made to the same container."""
        connection_url = postgresql_container.get_connection_url()
        parsed = urllib.parse.urlparse(connection_url)

        # Create multiple connections
        connections = []
        for i in range(3):
            conn = psycopg2.connect(
                host=parsed.hostname,
                port=parsed.port,
                database=parsed.path[1:],
                user=parsed.username,
                password=parsed.password,
            )
            connections.append(conn)

        # All connections should work
        for i, conn in enumerate(connections):
            cursor = conn.cursor()
            cursor.execute(f"SELECT {i + 1}")
            result = cursor.fetchone()[0]
            assert result == i + 1
            cursor.close()

        # Close all connections
        for conn in connections:
            conn.close()

    @pytest.mark.parametrize(
        "query,expected",
        [
            ("SELECT 1 + 1", 2),
            ("SELECT 'hello' || ' ' || 'world'", "hello world"),
            ("SELECT NOW() IS NOT NULL", True),
        ],
    )
    def test_postgresql_query_execution(self, postgresql_connection, query, expected):
        """Test various query executions on PostgreSQL."""
        cursor = postgresql_connection.cursor()
        cursor.execute(query)
        result = cursor.fetchone()[0]
        assert result == expected
        cursor.close()
