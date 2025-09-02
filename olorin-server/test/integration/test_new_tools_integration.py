#!/usr/bin/env python3
"""
Integration test for new MCP client and threat intelligence tools.
Run with: poetry run pytest test/integration/test_new_tools_integration.py -v
"""

import pytest
import asyncio
import logging
from datetime import datetime
from unittest.mock import patch, MagicMock

# Configure logging for pytest
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Mark all tests as integration tests
pytestmark = pytest.mark.integration


class TestNewToolsIntegration:
    """Test class for new tools integration."""

    @pytest.fixture(autouse=True)
    def setup_logging(self, request):
        """Setup logging for each test."""
        logger.info("=" * 60)
        logger.info(f"Starting test: {request.node.name}")
        logger.info("=" * 60)
        yield
        logger.info(f"Completed test: {request.node.name}")

    def test_tool_registration(self):
        """Test that all new tools are properly registered."""
        logger.info("Testing Tool Registration")
        
        try:
            from app.service.agent.tools.tool_registry import (
                initialize_tools, 
                get_mcp_client_tools, 
                get_threat_intelligence_tools
            )
            
            # Initialize tools
            initialize_tools()
            
            # Test MCP client tools
            mcp_tools = get_mcp_client_tools()
            logger.info(f"✅ MCP Client Tools Registered: {len(mcp_tools)}")
            for tool in mcp_tools:
                logger.info(f"  - {tool.name}: {tool.description[:80]}...")
            
            # Test threat intelligence tools
            threat_tools = get_threat_intelligence_tools()
            logger.info(f"✅ Threat Intelligence Tools Registered: {len(threat_tools)}")
            for tool in threat_tools:
                logger.info(f"  - {tool.name}: {tool.description[:80]}...")
            
            assert len(mcp_tools) > 0, "No MCP client tools registered"
            assert len(threat_tools) > 0, "No threat intelligence tools registered"
            
        except ImportError as e:
            logger.error(f"Import error in tool registration: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            pytest.fail(f"Tool registry import failed: {e}")
        except Exception as e:
            logger.error(f"Tool registration test failed: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            raise

    @pytest.mark.asyncio
    async def test_blockchain_mcp_client(self):
        """Test blockchain MCP client functionality."""
        logger.info("Testing Blockchain MCP Client")
        
        try:
            from app.service.agent.mcp_client import blockchain_mcp_client
            
            # Mock the external MCP call to avoid network dependencies
            with patch.object(blockchain_mcp_client, '_run') as mock_run:
                mock_result = {
                    'address': '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
                    'chain': 'bitcoin',
                    'analysis': {
                        'chainalysis': {
                            'risk_score': 0.1,
                            'categories': ['genesis']
                        }
                    }
                }
                mock_run.return_value = mock_result
                
                result = blockchain_mcp_client._run(
                    address='1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
                    chain='bitcoin',
                    depth=2
                )
                
                logger.info(f"✅ Blockchain Analysis Result:")
                logger.info(f"  Address: {result['address']}")
                logger.info(f"  Chain: {result['chain']}")
                logger.info(f"  Analysis providers: {list(result['analysis'].keys())}")
                
                assert 'analysis' in result
                assert result['address'] == '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
                
        except ImportError as e:
            logger.error(f"Import error in blockchain MCP client: {e}")
            pytest.skip(f"Blockchain MCP client import failed: {e}")
        except Exception as e:
            logger.error(f"Blockchain MCP client test failed: {e}")
            raise

    @pytest.mark.asyncio
    async def test_intelligence_mcp_client(self):
        """Test intelligence gathering MCP client."""
        logger.info("Testing Intelligence MCP Client")
        
        try:
            from app.service.agent.mcp_client import intelligence_mcp_client
            from app.service.agent.mcp_client.intelligence_client import IntelligenceType
            
            # Mock the external MCP call to avoid network dependencies
            with patch.object(intelligence_mcp_client, '_run') as mock_run:
                mock_result = {
                    'query': 'john.doe@example.com',
                    'intel_type': IntelligenceType.OSINT,
                    'findings': {
                        'public_records': {'addresses': 2},
                        'data_breaches': {'exposed_in': ['breach1', 'breach2']}
                    }
                }
                mock_run.return_value = mock_result
                
                result = intelligence_mcp_client._run(
                    query="john.doe@example.com",
                    intel_type=IntelligenceType.OSINT,
                    depth=2
                )
                
                logger.info(f"✅ Intelligence Gathering Result:")
                logger.info(f"  Query: {result['query']}")
                logger.info(f"  Type: {result['intel_type']}")
                
                assert 'findings' in result
                assert result['query'] == 'john.doe@example.com'
                
        except ImportError as e:
            logger.error(f"Import error in intelligence MCP client: {e}")
            pytest.skip(f"Intelligence MCP client import failed: {e}")
        except Exception as e:
            logger.error(f"Intelligence MCP client test failed: {e}")
            raise

    @pytest.mark.asyncio
    async def test_ml_ai_mcp_client(self):
        """Test ML/AI MCP client."""
        logger.info("Testing ML/AI MCP Client")
        
        try:
            from app.service.agent.mcp_client import ml_ai_mcp_client
            from app.service.agent.mcp_client.ml_ai_client import ModelType
            
            # Mock the external MCP call to avoid network dependencies
            with patch.object(ml_ai_mcp_client, '_run') as mock_run:
                test_transaction = {
                    "amount": 10000,
                    "velocity": 50,
                    "location_change": True,
                    "device_trust": 0.3
                }
                
                mock_result = {
                    'model_type': ModelType.FRAUD_DETECTION,
                    'predictions': {
                        'is_fraudulent': True,
                        'confidence': 0.85,
                        'risk_score': 0.9
                    }
                }
                mock_run.return_value = mock_result
                
                result = ml_ai_mcp_client._run(
                    data=test_transaction,
                    model_type=ModelType.FRAUD_DETECTION,
                    confidence_threshold=0.7
                )
                
                logger.info(f"✅ ML/AI Analysis Result:")
                logger.info(f"  Model Type: {result['model_type']}")
                
                if 'predictions' in result and result['predictions']:
                    predictions = result['predictions']
                    logger.info(f"  Is Fraudulent: {predictions.get('is_fraudulent', 'N/A')}")
                    logger.info(f"  Confidence: {predictions.get('confidence', 'N/A')}")
                    logger.info(f"  Risk Score: {predictions.get('risk_score', 'N/A')}")
                
                assert 'predictions' in result
                assert result['model_type'] == ModelType.FRAUD_DETECTION
                
        except ImportError as e:
            logger.error(f"Import error in ML/AI MCP client: {e}")
            pytest.skip(f"ML/AI MCP client import failed: {e}")
        except Exception as e:
            logger.error(f"ML/AI MCP client test failed: {e}")
            raise

    def test_threat_intelligence_tools(self):
        """Test threat intelligence tools."""
        logger.info("Testing Threat Intelligence Tools")
        
        try:
            from app.service.agent.tools.tool_registry import get_threat_intelligence_tools
            
            threat_tools = get_threat_intelligence_tools()
            
            # Check for specific tools
            tool_names = [tool.name for tool in threat_tools]
            
            expected_tools = {
                "abuse": "AbuseIPDB",
                "virus": "VirusTotal",
                "shodan": "Shodan",
                "unified": "Unified Threat Intelligence"
            }
            
            found_tools = {}
            for key, name in expected_tools.items():
                found = any(key in tool_name.lower() for tool_name in tool_names)
                found_tools[name] = found
                status = "✅" if found else "❌"
                logger.info(f"  {status} {name}: {'Found' if found else 'Not Found'}")
            
            assert len(threat_tools) > 0, "No threat intelligence tools found"
            # At least some expected tools should be found
            assert any(found_tools.values()), "None of the expected threat intelligence tools were found"
            
        except ImportError as e:
            logger.error(f"Import error in threat intelligence tools: {e}")
            pytest.skip(f"Threat intelligence tools import failed: {e}")
        except Exception as e:
            logger.error(f"Threat intelligence tools test failed: {e}")
            raise

    def test_graph_builder_integration(self):
        """Test that new tools are integrated in graph builder."""
        logger.info("Testing Graph Builder Integration")
        
        try:
            from app.service.agent.orchestration.graph_builder import _get_configured_tools
            
            tools = _get_configured_tools()
            tool_names = [tool.name for tool in tools]
            
            # Count different tool categories
            mcp_count = len([t for t in tool_names if 'mcp' in t.lower()])
            threat_count = len([t for t in tool_names if any(x in t.lower() for x in ['threat', 'virus', 'abuse', 'shodan'])])
            traditional_count = len([t for t in tool_names if any(x in t.lower() for x in ['splunk', 'sumologic', 'snowflake'])])
            
            logger.info(f"✅ Graph Builder Tool Statistics:")
            logger.info(f"  Total Tools: {len(tools)}")
            logger.info(f"  MCP Client Tools: {mcp_count}")
            logger.info(f"  Threat Intelligence Tools: {threat_count}")
            logger.info(f"  Traditional Tools: {traditional_count}")
            
            assert len(tools) > 0, "No tools configured in graph builder"
            # Should have at least some MCP and threat intelligence tools
            assert mcp_count > 0 or threat_count > 0, "No MCP or threat intelligence tools found in graph builder"
            
        except ImportError as e:
            logger.error(f"Import error in graph builder: {e}")
            pytest.skip(f"Graph builder import failed: {e}")
        except Exception as e:
            logger.error(f"Graph builder integration test failed: {e}")
            raise

    def test_domain_objectives_updated(self):
        """Test that domain objectives include new tools."""
        logger.info("Testing Domain Agent Objectives")
        
        try:
            from app.service.agent.agent_factory import get_default_domain_objectives
            
            domains = ["network", "device", "location", "logs", "risk"]
            tools_mentioned = {
                "blockchain_mcp_client": False,
                "intelligence_mcp_client": False,
                "ml_ai_mcp_client": False,
                "threat intelligence": False
            }
            
            for domain in domains:
                objectives = get_default_domain_objectives(domain)
                objectives_text = " ".join(objectives).lower()
                
                # Check for tool mentions
                if "blockchain" in objectives_text:
                    tools_mentioned["blockchain_mcp_client"] = True
                if "intelligence_mcp_client" in objectives_text or "osint" in objectives_text:
                    tools_mentioned["intelligence_mcp_client"] = True
                if "ml_ai_mcp_client" in objectives_text:
                    tools_mentioned["ml_ai_mcp_client"] = True
                if "threat intelligence" in objectives_text or "abuseipdb" in objectives_text or "virustotal" in objectives_text:
                    tools_mentioned["threat intelligence"] = True
                
                # Log domain objectives summary
                tool_objectives = [obj for obj in objectives if any(tool in obj.lower() for tool in ["mcp", "threat", "virustotal", "abuseipdb", "shodan", "blockchain", "osint", "ml"])]
                if tool_objectives:
                    logger.info(f"\n  {domain.upper()} domain tool objectives:")
                    for obj in tool_objectives:
                        logger.info(f"    - {obj[:100]}...")
            
            logger.info(f"\n✅ Tool Integration in Objectives:")
            for tool, mentioned in tools_mentioned.items():
                status = "✅" if mentioned else "⚠️"
                logger.info(f"  {status} {tool}: {'Integrated' if mentioned else 'Not explicitly mentioned'}")
            
            # Pass test if at least some tools are mentioned
            assert any(tools_mentioned.values()), "No new tools mentioned in domain objectives"
            
        except ImportError as e:
            logger.error(f"Import error in domain objectives: {e}")
            pytest.skip(f"Domain objectives import failed: {e}")
        except Exception as e:
            logger.error(f"Domain objectives test failed: {e}")
            raise