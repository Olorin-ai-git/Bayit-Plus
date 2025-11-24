"""
Olorin Service Module - Refactored for 200-line compliance.

This module provides the main service orchestration for the Olorin Fraud Detection System.
All functionality has been preserved through modular extraction while maintaining
backward compatibility with existing imports.
"""

import logging
from app.service.logging import get_bridge_logger
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional, List, Dict, Any
from dotenv import load_dotenv

# Load .env file at module level to ensure environment variables are available early
# This ensures variables are loaded before any code that might read them
_env_path = Path(__file__).parent.parent.parent / '.env'
if _env_path.exists():
    load_dotenv(_env_path, override=True)
else:
    # Try alternate path in case we're running from a different location
    _alt_env_path = Path('/Users/gklainert/Documents/olorin/olorin-server/.env')
    if _alt_env_path.exists():
        load_dotenv(_alt_env_path, override=True)

from fastapi import FastAPI, Request, Response
from starlette.datastructures import Headers

from .auth import check_route_allowed
from .config import (
    LocalSettings,
    PRDSettings,
    SvcSettings,
)
from .error_handling import register_error_handlers
from .factory import OlorinApplication
from .logging_helper import RequestFormatter, logging_context
from .performance import initialize_performance_system, shutdown_performance_system

# Import health functionality with fallback
try:
    from pskhealth import add_health_endpoint, lifespan_function
except ImportError:
    # Fallback for when pskhealth is not available (e.g., in tests)
    def add_health_endpoint(app):
        pass

    lifespan_function = None

logger = get_bridge_logger(__name__)
module_name = "olorin"
service_name = "olorin"


async def inject_transaction_id(request: Request, call_next: Callable) -> Response:
    """Middleware that Injects Olorin TID into the request & response

    Something to note is that Gateway automatically injects a tid if there isn't one,
    but it doesn't use UUIDs, it seems to use Amazons Trace ID, which looks like
    '1-61c4fe1f-515d47eb73b71369335f8225'. This has caused issues in the past if you
    assume tid will be a UUID. Consider it a string with any characters allowed.
    """
    # based on https://github.olorin.com/global-core/global-content-service/blob/master/app/api/middleware.py
    olorin_tid = request.headers.get("olorin_tid", str(uuid.uuid4()))
    request.state.olorin_tid = olorin_tid
    with logging_context(olorin_tid=olorin_tid):
        response: Response = await call_next(request)
        response.headers["olorin_tid"] = olorin_tid
        return response


def configure_logger(app):
    """Configure application logging with unified logging integration."""
    # Use unified logging bridge for enhanced functionality
    # while maintaining backward compatibility
    try:
        from .logging.integration_bridge import bridge_configure_logger
        bridge_configure_logger(app)
    except Exception as e:
        # Fallback to legacy logging configuration if bridge fails
        logger.warning(f"Unified logging bridge failed, using legacy configuration: {e}")
        _legacy_configure_logger(app)


def _legacy_configure_logger(app):
    """Legacy logging configuration as fallback."""
    handler = logging.StreamHandler()
    formatter = RequestFormatter(
        "[%(asctime)s] %(levelname)s [%(context)s] module=%(module)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    handler.setFormatter(formatter)
    level = getattr(logging, app.state.config.log_level.upper())

    # see logs from other libraries
    root = logging.getLogger()
    # remove handlers created by libraries e.g. mlctl
    # copy the list because this mutates it
    for h in root.handlers[:]:
        root.removeHandler(h)
    root.addHandler(handler)
    root.setLevel(level)

    # Set LangGraph internal logging to DEBUG level to reduce noise
    langgraph_logger = logging.getLogger('langgraph')
    langgraph_logger.setLevel(logging.DEBUG)


_ENV_SETTINGS = {
    "local": LocalSettings,
    "prd": PRDSettings,
}


def _settings_factory() -> SvcSettings:
    """Create service settings based on environment."""
    env = os.getenv("APP_ENV", "local")
    return _ENV_SETTINGS[env]()


async def on_startup(app: FastAPI):
    """
    Application startup handler with performance optimization integration.

    This function is a co-routine and takes only one required argument app.
    It executes at the time of startup of the application.
    Tasks such as establishing a database connection or loading a ML model can be performed here.

    Args:
        app(FastAPI): FastAPI app object.
    """
    # Load .env file to ensure environment variables are available
    env_path = Path(__file__).parent.parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path, override=True)
        logger.info(f"✅ Loaded .env file from {env_path}")
        # Debug: Log the actual value after loading
        retrieve_value = os.getenv('RETRIEVE_RISKY_ENTITIES', 'NOT_SET')
        logger.info(f"📋 RETRIEVE_RISKY_ENTITIES={retrieve_value} (after .env load)")
    else:
        logger.warning(f"⚠️ No .env file found at {env_path}")
    
    import time
    startup_start_time = time.time()
    logger.info("🚀 Starting Olorin application...")

    # Validate log stream configuration early (non-fatal - allow startup to continue)
    logger.info("🔧 Validating log stream configuration...")
    try:
        from app.config.logstream_validator import validate_logstream_config
        is_valid, error_message = validate_logstream_config()
        if not is_valid:
            # Make config validation non-fatal - log error but continue startup
            # Set environment variable SKIP_LOGSTREAM_VALIDATION=true to disable this check
            skip_validation = os.getenv('SKIP_LOGSTREAM_VALIDATION', 'false').lower() == 'true'
            if skip_validation:
                logger.warning(f"⚠️ Log stream configuration validation failed but continuing (SKIP_LOGSTREAM_VALIDATION=true): {error_message}")
                app.state.logstream_config_valid = False
            else:
                logger.error(f"❌ Log stream configuration validation failed: {error_message}")
                logger.error("   Set SKIP_LOGSTREAM_VALIDATION=true to continue startup without log streaming")
                app.state.logstream_config_valid = False
                # Only fail if explicitly configured to be strict
                if os.getenv('STRICT_LOGSTREAM_VALIDATION', 'false').lower() == 'true':
                    from app.config.logstream_validator import fail_fast_on_invalid_config
                    fail_fast_on_invalid_config()
        else:
            app.state.logstream_config_valid = True
    except Exception as e:
        logger.warning(f"⚠️ Log stream configuration validation error (non-fatal): {e}")
        app.state.logstream_config_valid = False

    # Initialize database and create tables
    logger.info("🗄️ Initializing database...")
    try:
        from app.models.investigation_state import InvestigationState
        from app.persistence.database import (
            create_tables, get_db, get_engine, 
            check_postgres_running, ensure_required_tables_exist
        )
        from app.persistence.migrations.runner import run_wizard_state_migrations
        from sqlalchemy import inspect, text

        # Check if PostgreSQL is running BEFORE initializing database
        logger.info("🔍 Checking PostgreSQL server status...")
        postgres_running, error_message = check_postgres_running()
        
        if not postgres_running:
            logger.error("=" * 80)
            logger.error("❌ CRITICAL: PostgreSQL server is not running!")
            logger.error("=" * 80)
            logger.error("")
            logger.error("The Olorin server cannot start without PostgreSQL.")
            logger.error("")
            logger.error("Please ensure PostgreSQL is running:")
            logger.error("  1. Check if PostgreSQL service is running:")
            logger.error("     - macOS: brew services list | grep postgresql")
            logger.error("     - Linux: sudo systemctl status postgresql")
            logger.error("     - Docker: docker ps | grep postgres")
            logger.error("")
            logger.error("  2. Start PostgreSQL if it's not running:")
            logger.error("     - macOS: brew services start postgresql@16")
            logger.error("     - Linux: sudo systemctl start postgresql")
            logger.error("     - Docker: docker-compose up -d olorin-db")
            logger.error("")
            logger.error("  3. Verify connection settings in .env:")
            logger.error("     - POSTGRES_HOST")
            logger.error("     - POSTGRES_PORT")
            logger.error("     - POSTGRES_DATABASE")
            logger.error("     - POSTGRES_USER")
            logger.error("     - POSTGRES_PASSWORD")
            logger.error("")
            logger.error(f"Error details: {error_message}")
            logger.error("")
            logger.error("=" * 80)
            logger.error("Stopping Olorin server...")
            logger.error("=" * 80)
            
            # Stop the server by raising a critical exception
            raise RuntimeError(
                f"PostgreSQL server is not running. Cannot start Olorin server.\n"
                f"Error: {error_message}\n"
                f"Please start PostgreSQL and try again."
            )
        
        logger.info("✅ PostgreSQL server is running")

        # Ensure database is initialized
        try:
            from app.persistence.database import init_database
            init_database()
        except Exception as init_error:
            skip_db_on_failure = os.getenv('SKIP_DB_ON_STARTUP_FAILURE', 'false').lower() == 'true'
            if skip_db_on_failure:
                logger.warning(f"⚠️ Database initialization failed but continuing (SKIP_DB_ON_STARTUP_FAILURE=true): {init_error}")
                app.state.database_available = False
                # Skip rest of database setup
                raise init_error
            else:
                raise

        # Ensure all required tables exist (create if missing)
        logger.info("🔍 Ensuring all required tables exist...")
        try:
            ensure_required_tables_exist()
            logger.info("✅ All required tables verified and created if needed")
        except Exception as ensure_error:
            skip_db_on_failure = os.getenv('SKIP_DB_ON_STARTUP_FAILURE', 'false').lower() == 'true'
            if skip_db_on_failure:
                logger.warning(f"⚠️ Table verification failed but continuing (SKIP_DB_ON_STARTUP_FAILURE=true): {ensure_error}")
                app.state.database_available = False
                raise ensure_error
            else:
                logger.error(f"❌ Failed to ensure required tables exist: {ensure_error}")
                raise

        # Also run create_tables() for backward compatibility (ensures all models are registered)
        try:
            create_tables()
            logger.info("✅ Database tables creation completed")
        except Exception as create_error:
            skip_db_on_failure = os.getenv('SKIP_DB_ON_STARTUP_FAILURE', 'false').lower() == 'true'
            if skip_db_on_failure:
                logger.warning(f"⚠️ Table creation failed but continuing (SKIP_DB_ON_STARTUP_FAILURE=true): {create_error}")
                app.state.database_available = False
                raise create_error
            else:
                raise

        # Verify required tables exist (double-check)
        logger.info("🔍 Verifying required tables...")
        engine = get_engine()
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        required_tables = {
            'investigation_states',
            'detectors',
            'detection_runs',
            'anomaly_events'
        }
        missing_tables = required_tables - existing_tables

        if missing_tables:
            skip_db_on_failure = os.getenv('SKIP_DB_ON_STARTUP_FAILURE', 'false').lower() == 'true'
            if skip_db_on_failure:
                logger.warning(f"⚠️ Missing tables but continuing (SKIP_DB_ON_STARTUP_FAILURE=true): {missing_tables}")
                logger.warning(f"   Existing tables: {existing_tables}")
                app.state.database_available = False
            else:
                logger.error(f"❌ Missing tables: {missing_tables}")
                logger.error(f"   Existing tables: {existing_tables}")
                raise RuntimeError(f"Required tables not created: {missing_tables}")
        else:
            logger.info(f"✅ All required tables verified: {required_tables}")
            
            # Verify indexes exist for anomaly tables
            logger.info("🔍 Verifying database indexes...")
            try:
                from sqlalchemy import text
                with engine.connect() as conn:
                    # Check indexes for detectors table
                    detector_indexes = conn.execute(text("""
                        SELECT indexname FROM pg_indexes 
                        WHERE tablename = 'detectors'
                    """)).fetchall()
                    detector_index_names = {idx[0] for idx in detector_indexes}
                    expected_detector_indexes = {
                        'idx_detectors_type',
                        'idx_detectors_enabled',
                        'idx_detectors_updated'
                    }
                    missing_detector_indexes = expected_detector_indexes - detector_index_names
                    if missing_detector_indexes:
                        logger.warning(f"⚠️ Missing detector indexes: {missing_detector_indexes}")
                    
                    # Check indexes for detection_runs table
                    run_indexes = conn.execute(text("""
                        SELECT indexname FROM pg_indexes 
                        WHERE tablename = 'detection_runs'
                    """)).fetchall()
                    run_index_names = {idx[0] for idx in run_indexes}
                    expected_run_indexes = {
                        'idx_detection_runs_detector',
                        'idx_detection_runs_status',
                        'idx_detection_runs_window',
                        'idx_detection_runs_started'
                    }
                    missing_run_indexes = expected_run_indexes - run_index_names
                    if missing_run_indexes:
                        logger.warning(f"⚠️ Missing detection_runs indexes: {missing_run_indexes}")
                    
                    # Check indexes for anomaly_events table
                    anomaly_indexes = conn.execute(text("""
                        SELECT indexname FROM pg_indexes 
                        WHERE tablename = 'anomaly_events'
                    """)).fetchall()
                    anomaly_index_names = {idx[0] for idx in anomaly_indexes}
                    expected_anomaly_indexes = {
                        'idx_anomaly_events_run',
                        'idx_anomaly_events_detector',
                        'idx_anomaly_events_severity',
                        'idx_anomaly_events_status',
                        'idx_anomaly_events_score',
                        'idx_anomaly_events_window',
                        'idx_anomaly_events_created',
                        'idx_anomaly_events_cohort',
                        'idx_anomaly_events_investigation'
                    }
                    missing_anomaly_indexes = expected_anomaly_indexes - anomaly_index_names
                    if missing_anomaly_indexes:
                        logger.warning(f"⚠️ Missing anomaly_events indexes: {missing_anomaly_indexes}")
                    
                    if not (missing_detector_indexes or missing_run_indexes or missing_anomaly_indexes):
                        logger.info("✅ All database indexes verified")
            except Exception as e:
                # Non-critical - indexes may be created later or DB may not support this query
                logger.debug(f"Index verification skipped: {e}")

        # Verify PostgreSQL database configuration
        logger.info("🔍 Verifying PostgreSQL database configuration...")
        if 'postgresql' in str(engine.url).lower():
            logger.info(f"✅ Using PostgreSQL for investigation state management")
            logger.info(f"   Database host: {engine.url.host}")
            logger.info(f"   Database name: {engine.url.database}")
        else:
            logger.error(f"❌ Unsupported database type: {engine.url}")
            logger.error("   Olorin requires PostgreSQL database")
            raise RuntimeError(f"Unsupported database type. PostgreSQL is required, but found: {engine.url}")

        # Run schema migrations (CRITICAL - must succeed)
        logger.info("🔄 Running database migrations...")
        for db_session in get_db():
            try:
                run_wizard_state_migrations(db_session)
                logger.info("✅ Database migrations completed successfully")
            finally:
                db_session.close()
            break  # Only get first session
    except RuntimeError as migration_error:
        # Migration failures - check if database is optional
        skip_db_on_failure = os.getenv('SKIP_DB_ON_STARTUP_FAILURE', 'false').lower() == 'true'
        if skip_db_on_failure:
            logger.warning(f"⚠️ Database migration failed but continuing (SKIP_DB_ON_STARTUP_FAILURE=true): {migration_error}")
            app.state.database_available = False
        else:
            logger.error(f"❌ CRITICAL: Database migration failed - refusing to start: {migration_error}")
            raise
    except Exception as e:
        # Database initialization failures - check if database is optional
        skip_db_on_failure = os.getenv('SKIP_DB_ON_STARTUP_FAILURE', 'false').lower() == 'true'
        if skip_db_on_failure:
            logger.warning(f"⚠️ Database initialization failed but continuing (SKIP_DB_ON_STARTUP_FAILURE=true): {e}")
            app.state.database_available = False
        else:
            logger.error(f"❌ CRITICAL: Database initialization failed: {e}")
            raise

    # Initialize database provider (Snowflake or PostgreSQL)
    # This is optional - services can run without database provider
    logger.info("🔌 Initializing database provider...")
    try:
        from app.service.agent.tools.database_tool.database_factory import get_database_provider

        # Create database provider based on DATABASE_PROVIDER environment variable
        db_provider = get_database_provider()

        # Store in app state for access throughout the application
        app.state.database_provider = db_provider

        # Log which provider is being used
        provider_type = type(db_provider).__name__
        logger.info(f"✅ Database provider initialized: {provider_type}")

        # Connect to the database (non-blocking - continue if fails)
        try:
            db_provider.connect()
            logger.info(f"✅ Database connection established: {provider_type}")
            app.state.database_provider_connected = True
        except Exception as conn_error:
            logger.warning(f"⚠️ Database provider connection failed (non-critical): {conn_error}")
            logger.warning("   Services will continue but database-dependent features may be unavailable")
            app.state.database_provider_connected = False

    except ValueError as e:
        # Configuration error - make optional
        skip_db_provider = os.getenv('SKIP_DB_PROVIDER_ON_STARTUP_FAILURE', 'true').lower() == 'true'
        if skip_db_provider:
            logger.warning(f"⚠️ Invalid database provider configuration (non-critical): {e}")
            logger.warning("   Services will continue but database-dependent features may be unavailable")
            app.state.database_provider = None
            app.state.database_provider_connected = False
        else:
            logger.error(f"❌ CRITICAL: Invalid database provider configuration: {e}")
            raise
    except Exception as e:
        # Database provider initialization failures - make optional
        skip_db_provider = os.getenv('SKIP_DB_PROVIDER_ON_STARTUP_FAILURE', 'true').lower() == 'true'
        if skip_db_provider:
            logger.warning(f"⚠️ Database provider initialization failed (non-critical): {e}")
            logger.warning("   Services will continue but database-dependent features may be unavailable")
            app.state.database_provider = None
            app.state.database_provider_connected = False
        else:
            logger.error(f"❌ CRITICAL: Database provider initialization failed: {e}")
            raise

    # Validate schema parity if using PostgreSQL (Snowflake is source of truth)
    # Skip schema validation in demo/test mode to avoid real database connections
    test_mode = os.getenv('TEST_MODE', '').lower() in ['demo', 'mock']
    validate_schema = os.getenv('VALIDATE_SCHEMA_PARITY', 'true').lower() == 'true'

    if test_mode:
        logger.info(f"ℹ️ Schema validation skipped (TEST_MODE={os.getenv('TEST_MODE')})")
    elif validate_schema:
        try:
            from app.service.agent.tools.database_tool.schema_validator import SchemaValidator

            logger.info("🔍 Validating database schema parity...")

            # Get both providers for comparison
            current_provider = app.state.database_provider
            provider_name = os.getenv('DATABASE_PROVIDER', 'snowflake').lower()
            use_snowflake = os.getenv('USE_SNOWFLAKE', 'false').lower() == 'true'

            # Only validate if using PostgreSQL AND Snowflake is enabled
            if provider_name == 'postgresql' and use_snowflake:
                # Get Snowflake provider for comparison
                snowflake_provider = get_database_provider('snowflake')
                snowflake_provider.connect()

                # Validate schema parity
                validator = SchemaValidator()
                result = validator.validate_parity(snowflake_provider, current_provider)

                # Clean up Snowflake connection
                snowflake_provider.disconnect()

                # Fail fast if schemas don't match
                if not result.is_valid:
                    error_msg = (
                        f"❌ CRITICAL: Schema parity validation FAILED!\n"
                        f"  {result.summary}\n"
                        f"  Missing columns: {len(result.missing_columns)}\n"
                        f"  Type mismatches: {len(result.type_mismatches)}\n"
                        f"  Nullability mismatches: {len(result.nullability_mismatches)}\n"
                        f"  Refusing to start with schema mismatch."
                    )
                    logger.error(error_msg)
                    raise RuntimeError(error_msg)
                else:
                    logger.info(f"✅ Schema parity validated: {result.summary}")
            else:
                logger.info("ℹ️ Schema validation skipped (using Snowflake as source of truth)")

        except RuntimeError:
            # Re-raise schema validation failures
            raise
        except Exception as e:
            logger.warning(f"⚠️ Schema validation error (non-fatal): {e}")
            # Don't fail startup for schema validation issues unless explicitly configured
            if os.getenv('STRICT_SCHEMA_VALIDATION', 'false').lower() == 'true':
                raise

    # Initialize performance optimization system
    await initialize_performance_system(app)

    # Initialize the agent system (optional - continue if fails)
    logger.info("🤖 Initializing agent system...")
    try:
        from .agent_init import initialize_agent
        await initialize_agent(app)
        logger.info("✅ Agent system initialized successfully")
        app.state.agent_system_available = True
    except Exception as e:
        skip_agent_on_failure = os.getenv('SKIP_AGENT_ON_STARTUP_FAILURE', 'true').lower() == 'true'
        if skip_agent_on_failure:
            logger.warning(f"⚠️ Agent system initialization failed (non-critical): {e}")
            logger.warning("   Services will continue but agent-dependent features may be unavailable")
            app.state.agent_system_available = False
            app.state.graph_parallel = None
            app.state.graph_sequential = None
        else:
            logger.error(f"❌ CRITICAL: Agent system initialization failed: {e}")
            raise
    
    # Initialize RAG system
    logger.info("🚀 Initializing RAG system...")
    use_rag_service = os.getenv("USE_RAG_SERVICE", "true").lower() == "true"
    try:
        from app.service.rag.startup_integration import initialize_rag_for_olorin
        rag_initialized = await initialize_rag_for_olorin(skip_on_failure=True)
        if rag_initialized:
            logger.info("✅ RAG system initialized successfully")
        else:
            # If RAG is disabled via flag, use INFO level; otherwise WARNING for actual failures
            if not use_rag_service:
                logger.info("ℹ️  RAG system initialization skipped (USE_RAG_SERVICE=false)")
            else:
                logger.warning("⚠️ RAG system initialization failed - continuing without RAG")
    except Exception as e:
        # If RAG is disabled via flag, use INFO level; otherwise WARNING for actual errors
        if not use_rag_service:
            logger.info(f"ℹ️  RAG initialization skipped (USE_RAG_SERVICE=false): {e}")
        else:
            logger.warning(f"⚠️ RAG initialization error (non-fatal): {e}")
        import traceback
        logger.debug(f"RAG initialization traceback: {traceback.format_exc()}")
    
    # Initialize state for risk entities and auto-comparisons
    app.state.top_risk_entities = None
    app.state.risk_entities_loaded = False
    app.state.auto_comparison_completed = False
    app.state.auto_comparison_results = []
    
    # Check if we should retrieve risky entities from Snowflake
    retrieve_risky_entities_raw = os.getenv('RETRIEVE_RISKY_ENTITIES', 'false')
    retrieve_risky_entities = retrieve_risky_entities_raw.lower() == 'true'
    logger.info(f"🔍 RETRIEVE_RISKY_ENTITIES check: raw='{retrieve_risky_entities_raw}', parsed={retrieve_risky_entities}")
    
    # Check if we should run startup analysis flow (investigations and comparisons)
    auto_run_startup_analysis = os.getenv('AUTO_RUN_STARTUP_ANALYSIS', 'false').lower() == 'true'
    
    if not retrieve_risky_entities:
        logger.info("⏭️  Skipping risky entities retrieval (RETRIEVE_RISKY_ENTITIES=false)")
        logger.info("   Set RETRIEVE_RISKY_ENTITIES=true in .env to enable Snowflake connection and entity retrieval")
    else:
        logger.info("🔄 Loading top risk entities from Snowflake synchronously during startup...")
        
        # Load risk entities synchronously during startup (blocking)
        try:
            logger.info("📦 Importing risk analyzer...")
            from app.service.analytics.risk_analyzer import get_risk_analyzer

            logger.info("🏭 Creating risk analyzer instance...")
            analyzer = get_risk_analyzer()

            logger.info("🔌 Attempting to connect to Snowflake and fetch top risk entities...")
            # Add timeout to prevent hanging - execute_query() is synchronous and can block
            import asyncio
            try:
                results = await asyncio.wait_for(
                    analyzer.get_top_risk_entities(),
                    timeout=120.0  # 120 seconds (2 minutes) max for Snowflake query
                )
            except asyncio.TimeoutError:
                logger.warning("⏱️ Risk entity query timed out after 120 seconds - continuing without risk entities")
                logger.warning("   Server will start without risk entities loaded")
                app.state.top_risk_entities = None
                app.state.risk_entities_loaded = False
            except Exception as e:
                logger.error(f"❌ Failed to fetch risk entities: {e}", exc_info=True)
                app.state.top_risk_entities = None
                app.state.risk_entities_loaded = False
            else:
                logger.info(f"📊 Risk analyzer returned results: {type(results)} with keys: {list(results.keys()) if isinstance(results, dict) else 'Not a dict'}")

                # Handle schema authorization errors gracefully
                if results.get('status') == 'error' and results.get('error_type') == 'schema_authorization_error':
                    logger.warning("⚠️ Risk analysis failed due to schema authorization error - continuing without risk entities")
                    logger.warning(f"   Error: {results.get('error')}")
                    logger.warning(f"   Suggestion: {results.get('error_details', {}).get('suggestion', 'Check schema permissions')}")
                    app.state.risk_entities = []
                    app.state.risk_entities_loaded = False
                elif results.get('status') == 'success':
                    entity_count = len(results.get('entities', []))
                    logger.info(f"✅ Successfully loaded {entity_count} top risk entities from Snowflake")

                    # Store in app state for quick access
                    app.state.top_risk_entities = results
                    app.state.risk_entities_loaded_at = results.get('timestamp')
                    app.state.risk_entities_loaded = True
                    logger.info("💾 Stored risk entities in app state")
                    
                    # Verify Snowflake read path once at startup
                    try:
                        from app.service.investigation.snowflake_config import verify_snowflake_read_path
                        logger.info("🔍 Running Snowflake read path verification...")
                        verification_result = await verify_snowflake_read_path()
                        logger.info(f"✅ Snowflake read path verified: {verification_result.get('transaction_count', 0):,} transactions in test window")
                        app.state.snowflake_read_path_verified = True
                        app.state.snowflake_read_path_info = verification_result
                    except Exception as e:
                        logger.error(f"❌ Snowflake read path verification failed: {e}", exc_info=True)
                        logger.error("   Server startup will continue, but confusion matrix calculations may fail")
                        app.state.snowflake_read_path_verified = False
                    
                    # Always run auto-comparisons for top N riskiest entities when AUTO_RUN_STARTUP_ANALYSIS is enabled
                    # Number of entities is configured via STARTUP_ANALYSIS_TOP_N_ENTITIES (default: 3)
                    # This ensures consistent evaluation regardless of other conditions
                    if auto_run_startup_analysis:
                        # Automatically run comparisons for top N riskiest entities (unconditional execution)
                        # Run synchronously during startup
                        try:
                            # Create reports directory (same as in run_startup_analysis_flow)
                            reports_dir = Path("artifacts/comparisons/auto_startup")
                            reports_dir.mkdir(parents=True, exist_ok=True)
                            
                            # Run startup analysis flow synchronously with timeout
                            # This will block startup until analysis completes or times out
                            import asyncio
                            
                            # Get timeout from environment (default: 30 minutes, max: 30 minutes)
                            startup_timeout_seconds = float(os.getenv('STARTUP_ANALYSIS_TIMEOUT_SECONDS', '1800.0'))
                            startup_timeout_seconds = min(max(startup_timeout_seconds, 30.0), 1800.0)  # Clamp between 30s and 30min (30 minutes)
                            
                            logger.info(f"⏱️ Starting startup analysis with {startup_timeout_seconds}s timeout...")
                            
                            # Get number of top entities to investigate from environment (default: 3)
                            top_n_entities = int(os.getenv('STARTUP_ANALYSIS_TOP_N_ENTITIES', '3'))
                            top_n_entities = max(1, min(top_n_entities, 10))  # Clamp between 1 and 10
                            logger.info(f"📊 Will investigate top {top_n_entities} riskiest entities")
                            
                            # CRITICAL: Initialize comparison_results BEFORE try block to avoid UnboundLocalError
                            # Python treats assignment inside try block as local variable, so must initialize first
                            comparison_results = None
                            
                            try:
                                comparison_results = await asyncio.wait_for(
                                    run_startup_analysis_flow(
                                        app=app,
                                        risk_analyzer_results=results,
                                        top_n=top_n_entities
                                    ),
                                    timeout=startup_timeout_seconds
                                )
                                # Update app state with results
                                app.state.auto_comparison_results = comparison_results
                                app.state.auto_comparison_completed = True
                                logger.info("✅ Startup analysis completed successfully")
                            except asyncio.TimeoutError:
                                logger.warning(f"⏱️ Startup analysis timed out after {startup_timeout_seconds}s - continuing server startup")
                                logger.warning("   NOTE: Investigations that were already started will continue running as background tasks.")
                                logger.warning("   However, their results will NOT be collected automatically - they will complete independently.")
                                logger.warning("   To increase timeout, set STARTUP_ANALYSIS_TIMEOUT_SECONDS in .env")
                                logger.warning("   Note: Complex investigations may take longer than the timeout")
                                # CRITICAL FIX: comparison_results is guaranteed to be None here on timeout
                                # because the await was cancelled before assignment could complete
                                # The investigations that were started will continue running, but we won't wait for them
                                # They will complete independently and can be checked via the investigation API
                                logger.info("⚠️ Startup analysis timed out - investigations may still be running independently")
                                logger.info("   You can check investigation status via the API or wait for them to complete")
                                app.state.auto_comparison_results = []
                                app.state.auto_comparison_completed = False
                            except asyncio.CancelledError:
                                logger.warning("⚠️ Startup analysis was cancelled - continuing server startup")
                                app.state.auto_comparison_results = []
                                app.state.auto_comparison_completed = False
                            except Exception as e:
                                logger.error(f"❌ Startup analysis failed: {e}", exc_info=True)
                                app.state.auto_comparison_results = []
                                app.state.auto_comparison_completed = False
                            
                        except Exception as e:
                            logger.error(f"❌ Failed to run auto-comparisons: {e}", exc_info=True)
                            app.state.auto_comparison_results = []
                            app.state.auto_comparison_completed = False
                    else:
                        logger.info("⏭️  Skipping startup analysis flow (AUTO_RUN_STARTUP_ANALYSIS=false)")
                        logger.info("   Set AUTO_RUN_STARTUP_ANALYSIS=true in .env to enable automatic comparisons and report generation")
                else:
                    error_msg = results.get('error', 'Unknown error')
                    logger.warning(f"⚠️ Failed to load risk entities: {error_msg}")
                    logger.warning(f"📄 Full results: {results}")
                    app.state.top_risk_entities = None
                    app.state.risk_entities_loaded = False
        except Exception as e:
            error_msg = str(e)
            # Check for schema authorization errors in exception message
            if "does not exist or not authorized" in error_msg or "02000" in error_msg:
                logger.warning(f"⚠️ Risk analysis failed due to schema authorization error (non-fatal): {e}")
                logger.warning("   Application will continue without risk entities loaded")
                logger.warning("   To fix: Verify SNOWFLAKE_SCHEMA and SNOWFLAKE_DATABASE environment variables")
                logger.warning("   and ensure the user has USAGE and SELECT privileges on the schema")
            else:
                logger.error(f"❌ Error loading risk entities: {e}")
                logger.error(f"🔍 Exception type: {type(e).__name__}")
                import traceback
                logger.error(f"📜 Full traceback: {traceback.format_exc()}")
            app.state.top_risk_entities = None
            app.state.risk_entities_loaded = False
        
        logger.info("✅ Risk entities loading completed - server startup continuing")
    

# Module-level function for startup analysis flow (can be called from startup or API endpoint)
async def run_startup_analysis_flow(
    app: FastAPI,
    risk_analyzer_results: Optional[Dict[str, Any]] = None,
    top_n: int = 1,
    force_refresh: bool = False
) -> List[Dict[str, Any]]:
    """
    Run the startup analysis flow: load risk entities and run comparisons.
    
    This function can be called from startup or from an API endpoint.
    
    Args:
        app: FastAPI app instance
        risk_analyzer_results: Optional pre-loaded risk analyzer results. If None, will fetch fresh.
        top_n: Number of top entities to process (default: 1)
        force_refresh: If True, force refresh risk entities even if cached
        
    Returns:
        List of comparison results
    """
    from app.service.analytics.risk_analyzer import get_risk_analyzer
    from app.service.investigation.auto_comparison import run_auto_comparisons_for_top_entities
    
    try:
        # Get risk analyzer results if not provided
        if risk_analyzer_results is None or force_refresh:
            logger.info("📋 Loading top risk entities from Snowflake...")
            analyzer = get_risk_analyzer()
            results = await analyzer.get_top_risk_entities()
            
            # Handle errors
            if results.get('status') == 'error':
                error_msg = results.get('error', 'Unknown error')
                logger.error(f"❌ Failed to load risk entities: {error_msg}")
                return []
            
            if results.get('status') != 'success':
                logger.warning(f"⚠️ Risk analyzer returned non-success status: {results.get('status')}")
                return []
            
            risk_analyzer_results = results
            
            # Store in app state
            app.state.top_risk_entities = results
            app.state.risk_entities_loaded_at = results.get('timestamp')
            app.state.risk_entities_loaded = True
            logger.info("💾 Stored risk entities in app state")
            results = risk_analyzer_results
        else:
            results = risk_analyzer_results
        
        # Run comparisons for top N entities
        logger.info(f"🚀 Starting automatic comparisons for top {top_n} riskiest entities (unconditional execution)...")
        
        # Create reports directory
        reports_dir = Path("artifacts/comparisons/auto_startup")
        reports_dir.mkdir(parents=True, exist_ok=True)
        
        # Run comparisons unconditionally for top N entities (or all available if fewer than N)
        comparison_results = await run_auto_comparisons_for_top_entities(
            risk_analyzer_results=results,
            top_n=top_n,
            reports_dir=reports_dir
        )
        
        # Store comparison results in app state
        app.state.auto_comparison_results = comparison_results
        
        # Verify all investigations are completed before marking as complete
        completed_count = sum(1 for r in comparison_results if r.get('status') == 'success' and r.get('investigation_id'))
        total_count = len(comparison_results)
        
        if completed_count == total_count and total_count > 0:
            # All investigations completed, mark as complete
            app.state.auto_comparison_completed = True
            logger.info(f"✅ Auto-comparisons completed: {len(comparison_results)} reports generated")
            
            # Calculate confusion matrices for all investigated entities
            import time
            confusion_start_time = time.time()
            logger.info("📊 Calculating confusion matrices for investigated entities...")
            try:
                from app.service.investigation.comparison_service import (
                    calculate_confusion_matrix, aggregate_confusion_matrices
                )
                from app.service.investigation.investigation_transaction_mapper import (
                    map_investigation_to_transactions, get_investigation_by_id
                )
                from datetime import datetime
                import os
                
                risk_threshold = float(os.getenv("RISK_THRESHOLD_DEFAULT", "0.3"))
                confusion_matrices = []
                
                for result in comparison_results:
                    if result.get('status') != 'success' or not result.get('investigation_id'):
                        logger.warning(f"⚠️ Skipping failed investigation: {result.get('entity', 'unknown')}")
                        continue
                    
                    investigation_id = result.get('investigation_id')
                    entity_type = result.get('entity_type', 'email')
                    entity_id = result.get('entity', '')
                    
                    # Get investigation details
                    investigation = get_investigation_by_id(investigation_id)
                    if not investigation:
                        logger.warning(f"⚠️ Investigation {investigation_id} not found, skipping confusion matrix calculation (continuing with remaining entities)")
                        continue
                    
                    # Get investigation window
                    window_start = investigation.get('from_date')
                    window_end = investigation.get('to_date')
                    if not window_start or not window_end:
                        logger.warning(f"⚠️ Investigation {investigation_id} missing window dates, skipping (continuing with remaining entities)")
                        continue
                    
                    # Parse dates if strings and normalize to UTC
                    import pytz
                    utc = pytz.UTC
                    if isinstance(window_start, str):
                        window_start = datetime.fromisoformat(window_start.replace('Z', '+00:00'))
                    if isinstance(window_end, str):
                        window_end = datetime.fromisoformat(window_end.replace('Z', '+00:00'))
                    
                    # Ensure timezone normalization (UTC) for all timestamp comparisons
                    if window_start.tzinfo is None:
                        window_start = utc.localize(window_start)
                    else:
                        window_start = window_start.astimezone(utc)
                    if window_end.tzinfo is None:
                        window_end = utc.localize(window_end)
                    else:
                        window_end = window_end.astimezone(utc)
                    
                    # Map investigation to transactions (includes APPROVED filter and IS_FRAUD_TX query)
                    transactions, source, investigation_risk_score = await map_investigation_to_transactions(
                        investigation=investigation,
                        window_start=window_start,
                        window_end=window_end,
                        entity_type=entity_type,
                        entity_id=entity_id
                    )
                    
                    if not transactions:
                        logger.warning(f"⚠️ No transactions found for {entity_type}:{entity_id}, skipping confusion matrix (continuing with remaining entities)")
                        continue
                    
                    # Calculate confusion matrix for this entity
                    confusion_matrix = calculate_confusion_matrix(
                        transactions=transactions,
                        risk_threshold=risk_threshold,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        investigation_id=investigation_id,
                        window_start=window_start,
                        window_end=window_end,
                        investigation_risk_score=investigation_risk_score
                    )
                    
                    confusion_matrices.append(confusion_matrix)
                
                # CRITICAL: Always generate aggregated confusion matrix, even if empty
                # This ensures confusion table is always displayed in the report
                if confusion_matrices:
                    aggregated_matrix = aggregate_confusion_matrices(
                        matrices=confusion_matrices,
                        risk_threshold=risk_threshold
                    )
                    
                    confusion_duration = time.time() - confusion_start_time
                    logger.info(
                        f"✅ Calculated and aggregated confusion matrices for {len(confusion_matrices)} entities "
                        f"in {confusion_duration:.2f} seconds"
                    )
                    logger.info(
                        f"📊 Aggregated metrics: TP={aggregated_matrix.total_TP}, FP={aggregated_matrix.total_FP}, "
                        f"TN={aggregated_matrix.total_TN}, FN={aggregated_matrix.total_FN}, "
                        f"Excluded={aggregated_matrix.total_excluded}"
                    )
                    
                    if confusion_duration > 5.0:
                        logger.warning(
                            f"⚠️ Confusion matrix calculation took {confusion_duration:.2f} seconds "
                            f"(target: <5 seconds)"
                        )
                else:
                    # CRITICAL FIX: Always create empty aggregated confusion matrix instead of None
                    # This ensures confusion table section is always displayed in the report
                    logger.warning(
                        f"⚠️ No confusion matrices calculated: "
                        f"processed {len(comparison_results)} comparison results, "
                        f"but no successful investigations with transactions found. "
                        f"Creating empty aggregated confusion matrix to ensure confusion table is always generated."
                    )
                    from app.service.investigation.comparison_service import aggregate_confusion_matrices
                    # Create empty aggregated matrix (aggregate_confusion_matrices handles empty list)
                    aggregated_matrix = aggregate_confusion_matrices(
                        matrices=[],  # Empty list creates zero-filled matrix
                        risk_threshold=risk_threshold
                    )
                    confusion_duration = time.time() - confusion_start_time
                    logger.info(
                        f"✅ Created empty aggregated confusion matrix in {confusion_duration:.2f} seconds"
                    )
                
                # CRITICAL: Always set aggregated_confusion_matrix, never None
                app.state.aggregated_confusion_matrix = aggregated_matrix
                logger.info(
                    f"📊 Confusion table will be generated with aggregated matrix: "
                    f"TP={aggregated_matrix.total_TP}, FP={aggregated_matrix.total_FP}, "
                    f"TN={aggregated_matrix.total_TN}, FN={aggregated_matrix.total_FN}"
                )
                    
            except Exception as e:
                confusion_duration = time.time() - confusion_start_time
                logger.warning(
                    f"⚠️ Failed to calculate confusion matrices after {confusion_duration:.2f} seconds: {e}",
                    exc_info=True
                )
                # CRITICAL FIX: Always create empty aggregated confusion matrix on error
                # This ensures confusion table is always generated, even if calculation fails
                logger.info("📊 Creating empty aggregated confusion matrix due to error to ensure confusion table is always generated")
                try:
                    from app.service.investigation.comparison_service import aggregate_confusion_matrices
                    import os
                    risk_threshold = float(os.getenv("RISK_THRESHOLD_DEFAULT", "0.3"))
                    aggregated_matrix = aggregate_confusion_matrices(
                        matrices=[],  # Empty list creates zero-filled matrix
                        risk_threshold=risk_threshold
                    )
                    app.state.aggregated_confusion_matrix = aggregated_matrix
                    logger.info("✅ Created empty aggregated confusion matrix after error")
                except Exception as fallback_error:
                    logger.error(f"❌ Failed to create empty confusion matrix: {fallback_error}", exc_info=True)
                    # Last resort: set to None, but report generator will handle this gracefully
                    app.state.aggregated_confusion_matrix = None
            
            # CRITICAL FIX: Generate startup report ONLY after all investigations complete
            logger.info("📊 Generating startup analysis report after all investigations completed...")
            try:
                from app.service.reporting.startup_report_generator import generate_startup_report
                startup_duration = getattr(app.state, 'startup_duration_seconds', None)
                report_path = generate_startup_report(
                    app_state=app.state,
                    startup_duration_seconds=startup_duration,
                    reports_dir=reports_dir  # Pass reports_dir so report can find comparison data
                )
                logger.info(f"📊 Startup analysis report generated: {report_path}")
                app.state.startup_report_path = str(report_path)
            except Exception as e:
                logger.warning(f"⚠️ Failed to generate startup report: {e}", exc_info=True)
                app.state.startup_report_path = None
            
            # Trigger post-startup zip creation with startup report
            await _create_startup_zip_package(app, comparison_results, reports_dir)
        else:
            # Some investigations still running, wait for them and create package later
            logger.info(f"⏳ Auto-comparisons initiated: {completed_count}/{total_count} completed. Waiting for remaining investigations...")
            app.state.auto_comparison_completed = False
            
            # Create background task to wait for completion and create package
            import asyncio
            asyncio.create_task(_wait_and_create_final_zip_package(
                app, comparison_results, reports_dir
            ))
        
        return comparison_results
        
    except Exception as e:
        logger.error(f"❌ Failed to run startup analysis flow: {e}", exc_info=True)
        app.state.auto_comparison_results = []
        app.state.auto_comparison_completed = False
        return []


async def _wait_and_create_final_zip_package(
    app: FastAPI,
    comparison_results: List[Dict[str, Any]],
    reports_dir: Path,
    max_wait_seconds: int = 600  # 10 minutes max wait
) -> None:
    """
    Wait for all investigations to complete, then create final zip package.
    
    This function polls investigation status and creates the zip package only
    after all investigations have completed successfully.
    
    Args:
        app: FastAPI app instance
        comparison_results: Initial comparison results (may have incomplete investigations)
        reports_dir: Directory to save zip file
        max_wait_seconds: Maximum time to wait for investigations to complete
    """
    import asyncio
    from datetime import datetime
    from app.service.investigation_state_service import InvestigationStateService
    from app.persistence.database import get_db
    
    logger.info("⏳ Waiting for all investigations to complete before creating final zip package...")
    
    start_time = datetime.now()
    poll_interval = 10  # Check every 10 seconds
    all_completed = False
    
    # Extract investigation IDs from results
    investigation_ids = [
        r.get('investigation_id') 
        for r in comparison_results 
        if r.get('status') == 'success' and r.get('investigation_id')
    ]
    
    if not investigation_ids:
        logger.warning("⚠️ No investigation IDs found in comparison results - creating package with available data")
        await _create_startup_zip_package(app, comparison_results, reports_dir)
        return
    
    logger.info(f"📋 Monitoring {len(investigation_ids)} investigations for completion...")
    
    while (datetime.now() - start_time).total_seconds() < max_wait_seconds:
        await asyncio.sleep(poll_interval)
        
        # Check status of all investigations
        completed_count = 0
        failed_count = 0
        
        db_gen = get_db()
        db = next(db_gen)
        try:
            service = InvestigationStateService(db)
            
            for inv_id in investigation_ids:
                try:
                    state = service.get_state_with_auth(
                        investigation_id=inv_id,
                        user_id="auto-comparison-system"
                    )
                    
                    status = state.status
                    lifecycle_stage = state.lifecycle_stage
                    
                    if status == "COMPLETED" and lifecycle_stage == "COMPLETED":
                        completed_count += 1
                    elif status in ["ERROR", "FAILED", "CANCELLED"]:
                        failed_count += 1
                        logger.warning(f"⚠️ Investigation {inv_id} failed with status: {status}")
                        
                except Exception as e:
                    logger.debug(f"⚠️ Error checking investigation {inv_id}: {e}")
                    continue
            
            elapsed = (datetime.now() - start_time).total_seconds()
            logger.info(f"⏳ Progress: {completed_count}/{len(investigation_ids)} completed, {failed_count} failed ({elapsed:.0f}s elapsed)")
            
            # Check if all investigations are done (completed or failed)
            if completed_count + failed_count == len(investigation_ids):
                all_completed = True
                logger.info(f"✅ All investigations finished: {completed_count} completed, {failed_count} failed")
                break
                
        finally:
            db.close()
    
    if not all_completed:
        elapsed = (datetime.now() - start_time).total_seconds()
        logger.warning(f"⏱️ Not all investigations completed within {max_wait_seconds}s. Creating package with available data (elapsed: {elapsed:.0f}s)")
    
    # Update comparison results with latest investigation status
    # Re-fetch investigation data to ensure we have complete information
    updated_results = []
    db_gen = get_db()
    db = next(db_gen)
    try:
        service = InvestigationStateService(db)
        
        for result in comparison_results:
            inv_id = result.get('investigation_id')
            if inv_id:
                try:
                    state = service.get_state_with_auth(
                        investigation_id=inv_id,
                        user_id="auto-comparison-system"
                    )
                    
                    # Update result with latest status
                    if state.status == "COMPLETED" and state.lifecycle_stage == "COMPLETED":
                        result['status'] = 'success'
                        result['investigation_completed'] = True
                    else:
                        result['investigation_completed'] = False
                        result['investigation_status'] = state.status
                        
                except Exception as e:
                    logger.warning(f"⚠️ Error updating result for {inv_id}: {e}")
            
            updated_results.append(result)
    finally:
        db.close()
    
    # Mark as completed
    app.state.auto_comparison_results = updated_results
    app.state.auto_comparison_completed = True
    
    # CRITICAL FIX: Generate startup report ONLY after all investigations are complete
    logger.info("📊 Generating startup analysis report after all investigations completed...")
    try:
        from app.service.reporting.startup_report_generator import generate_startup_report
        startup_duration = getattr(app.state, 'startup_duration_seconds', None)
        report_path = generate_startup_report(
            app_state=app.state,
            startup_duration_seconds=startup_duration,
            reports_dir=reports_dir  # Pass reports_dir so report can find comparison data
        )
        logger.info(f"📊 Startup analysis report generated: {report_path}")
        app.state.startup_report_path = str(report_path)
    except Exception as e:
        logger.warning(f"⚠️ Failed to generate startup report: {e}", exc_info=True)
        app.state.startup_report_path = None
    
    # Create final zip package with completed investigation data and startup report
    logger.info("📦 Creating final zip package with completed investigation data...")
    await _create_startup_zip_package(app, updated_results, reports_dir)


async def _create_startup_zip_package(
    app: FastAPI,
    comparison_results: List[Dict[str, Any]],
    reports_dir: Path
) -> None:
    """
    Post-startup task to create zip package with comparison results and startup report.
    
    This function waits for the startup report to be available (with retries) before
    creating the zip file, ensuring the startup report is always included.
    
    Args:
        app: FastAPI app instance
        comparison_results: List of comparison result dictionaries
        reports_dir: Directory to save zip file
    """
    from app.service.investigation.auto_comparison import package_comparison_results
    import asyncio
    
    # Wait for startup report to be generated (with retries)
    # In most cases, startup report is already generated since on_startup() completes first,
    # but we wait with retries to handle edge cases where background task finishes very quickly
    max_wait_seconds = 30
    wait_interval = 1
    waited = 0
    
    startup_report_path = getattr(app.state, 'startup_report_path', None)
    if startup_report_path and Path(startup_report_path).exists():
        logger.info(f"📦 Startup report ready, creating zip package...")
    else:
        # Wait for startup report with retries
        logger.info(f"⏳ Waiting for startup report to be generated...")
        while waited < max_wait_seconds:
            startup_report_path = getattr(app.state, 'startup_report_path', None)
            if startup_report_path and Path(startup_report_path).exists():
                logger.info(f"📦 Startup report ready, creating zip package...")
                break
            logger.debug(f"⏳ Waiting for startup report... ({waited}s/{max_wait_seconds}s)")
            await asyncio.sleep(wait_interval)
            waited += wait_interval
        
        # Final check (already set in loop above)
        if not startup_report_path:
            startup_report_path = getattr(app.state, 'startup_report_path', None)
    
    # Create zip package
    try:
        zip_path = await package_comparison_results(
            comparison_results=comparison_results,
            output_dir=reports_dir,
            startup_report_path=startup_report_path
        )
        app.state.auto_comparison_zip_path = str(zip_path)
        logger.info(f"📦 Startup package created: {zip_path}")
    except Exception as e:
        logger.error(f"❌ Failed to create startup package: {e}", exc_info=True)
        app.state.auto_comparison_zip_path = None


async def on_shutdown(app: FastAPI):
    """
    Application shutdown handler with performance system cleanup.
    
    This function is a co-routine and takes only one required argument app.
    It executes at the time of shutdown of the application.
    Tasks such as closing database connection can be performed here.

    Args:
        app(FastAPI): FastAPI app object.
    """
    import asyncio
    
    logger.info("Shutting down Olorin application...")

    # Disconnect database provider
    try:
        if hasattr(app.state, 'database_provider') and app.state.database_provider:
            logger.info("🔌 Disconnecting database provider...")
            provider = app.state.database_provider
            
            # If it's a Snowflake provider, we need to properly await the async disconnect
            if hasattr(provider, '_client') and hasattr(provider._client, 'disconnect'):
                try:
                    # Directly call the async disconnect method with timeout
                    await asyncio.wait_for(provider._client.disconnect(), timeout=5.0)
                    logger.info("✅ Database provider disconnected")
                except asyncio.TimeoutError:
                    logger.warning("⚠️ Database disconnect timed out - connection may not be fully closed")
                except asyncio.CancelledError:
                    logger.info("⚠️ Database disconnect cancelled during shutdown - this is normal")
                except Exception as e:
                    logger.warning(f"⚠️ Async disconnect failed, trying sync: {e}")
                    # Fallback to sync disconnect
                    try:
                        provider.disconnect()
                    except Exception as sync_e:
                        logger.warning(f"⚠️ Sync disconnect also failed: {sync_e}")
            else:
                # For other providers, use sync disconnect
                try:
                    provider.disconnect()
                    logger.info("✅ Database provider disconnected")
                except Exception as e:
                    logger.warning(f"⚠️ Database provider disconnect failed: {e}")
    except asyncio.CancelledError:
        logger.info("⚠️ Database provider cleanup cancelled during shutdown - this is normal")
    except Exception as e:
        logger.warning(f"⚠️ Database provider cleanup failed: {e}")

    # Cleanup async HTTP clients to prevent unclosed session warnings
    try:
        from app.service.agent.tools.async_client_manager import cleanup_async_clients
        await asyncio.wait_for(cleanup_async_clients(), timeout=3.0)
        logger.info("✅ Async client cleanup completed")
    except asyncio.CancelledError:
        logger.info("⚠️ Async client cleanup cancelled during shutdown - this is normal")
    except asyncio.TimeoutError:
        logger.warning("⚠️ Async client cleanup timed out")
    except Exception as e:
        logger.warning(f"⚠️ Async client cleanup failed: {e}")
    
    # Cleanup RAG system
    try:
        from app.service.rag.startup_integration import cleanup_rag_for_olorin
        await asyncio.wait_for(cleanup_rag_for_olorin(), timeout=3.0)
        logger.info("✅ RAG system cleanup completed")
    except asyncio.CancelledError:
        logger.info("⚠️ RAG cleanup cancelled during shutdown - this is normal")
    except asyncio.TimeoutError:
        logger.warning("⚠️ RAG cleanup timed out")
    except Exception as e:
        logger.warning(f"⚠️ RAG cleanup failed: {e}")

    # Shutdown detection scheduler
    try:
        if hasattr(app.state, 'detection_scheduler') and app.state.detection_scheduler:
            logger.info("⏰ Stopping detection scheduler...")
            await asyncio.wait_for(app.state.detection_scheduler.stop(), timeout=3.0)
            logger.info("✅ Detection scheduler stopped")
    except asyncio.CancelledError:
        logger.info("⚠️ Detection scheduler shutdown cancelled during shutdown - this is normal")
    except asyncio.TimeoutError:
        logger.warning("⚠️ Detection scheduler shutdown timed out")
    except Exception as e:
        logger.warning(f"⚠️ Detection scheduler shutdown failed: {e}")

    # Shutdown performance optimization system
    try:
        await asyncio.wait_for(shutdown_performance_system(app), timeout=3.0)
    except asyncio.CancelledError:
        logger.info("⚠️ Performance system shutdown cancelled during shutdown - this is normal")
    except asyncio.TimeoutError:
        logger.warning("⚠️ Performance system shutdown timed out")
    except Exception as e:
        logger.warning(f"⚠️ Performance system shutdown failed: {e}")
    
    logger.info("Olorin application shutdown completed")


def create_app(
    test_config: Optional[SvcSettings] = None, lifespan: Optional[Callable] = None
) -> FastAPI:
    """
    Factory function to create the FastAPI app via OlorinApplication.
    
    Args:
        test_config: Optional test configuration override
        lifespan: Optional custom lifespan function
        
    Returns:
        Configured FastAPI application instance
    """
    return OlorinApplication(
        test_config=test_config, 
        lifespan=lifespan,
        settings_factory=_settings_factory
    ).app


# Dummy implementations for backward compatibility and test patching
def expose_metrics(app):
    """Dummy metrics exposure for backward compatibility."""
    pass


def add_actuator_endpoints(app):
    """Dummy actuator endpoints for backward compatibility."""
    pass


def get_app_kwargs(*args, **kwargs):
    """Dummy function for backward compatibility."""
    return {}


# Preserve all original exports for backward compatibility
__all__ = [
    # Configuration classes
    "LocalSettings", 
    "PRDSettings",
    "SvcSettings",
    # Factory functions
    "_settings_factory",
    "create_app",
    # Core classes
    "OlorinApplication",
    # Lifecycle functions
    "on_startup",
    "on_shutdown",
    # Middleware and utilities
    "inject_transaction_id",
    "configure_logger",
    # Backward compatibility
    "expose_metrics",
    "add_actuator_endpoints",
    "get_app_kwargs",
]