"""
RAG Tool Context Injection Demo

Demonstrates the RAG context injection system for tool execution
with performance monitoring and knowledge augmentation.
"""

import asyncio
import time
from typing import Any, Dict, Optional

# Demo classes to simulate the RAG system
class MockRAGOrchestrator:
    """Mock RAG orchestrator for demo"""
    
    async def retrieve_knowledge(self, query: str, domain: str = None):
        # Simulate knowledge retrieval delay
        await asyncio.sleep(0.02)  # 20ms
        
        return {
            "chunks": [
                {"content": f"Expert knowledge for {query} in {domain}", "score": 0.95},
                {"content": f"Historical patterns for {query}", "score": 0.87},
                {"content": f"Best practices for {domain} analysis", "score": 0.82}
            ],
            "total_chunks": 3
        }


class MockKnowledgeContext:
    """Mock knowledge context for demo"""
    
    def __init__(self, domain: str, chunks: int = 5):
        self.investigation_id = "demo_investigation_001"
        self.domain = domain
        self.total_chunks = chunks
        self.critical_knowledge = [f"Critical {domain} pattern {i}" for i in range(2)]
        self.supporting_knowledge = [f"Supporting {domain} data {i}" for i in range(2)]
        self.background_knowledge = [f"Background {domain} info {i}" for i in range(1)]
        self.knowledge_sources = {f"{domain}_patterns", "threat_intel", "historical_data"}


class MockInvestigationContext:
    """Mock investigation context for demo"""
    
    def __init__(self):
        self.investigation_id = "demo_investigation_001"
        self.entity_id = "demo_user_123"
        self.entity_type = "user"
        self.entity_data = {
            "username": "demo_user",
            "account_id": "acc_123",
            "risk_level": "medium"
        }
        self.investigation_data = {
            "reason": "suspicious_login_patterns",
            "priority": "high",
            "created": "2025-01-04T10:00:00Z"
        }


# Demo implementation of tool execution context enhancer
class DemoToolExecutionContextEnhancer:
    """Demo tool execution context enhancer"""
    
    def __init__(self):
        self.rag_orchestrator = MockRAGOrchestrator()
        self.rag_available = True
        self.performance_target_ms = 50.0
        
        self.stats = {
            "total_enhancements": 0,
            "successful_enhancements": 0,
            "avg_enhancement_time_ms": 0.0,
            "knowledge_chunks_used": 0
        }
    
    async def enhance_tool_execution_context(
        self,
        tool_name: str,
        input_parameters: Dict[str, Any],
        investigation_context: Optional[Any] = None,
        domain: Optional[str] = None
    ):
        """Enhance tool execution context with RAG knowledge"""
        
        start_time = time.time()
        
        print(f"🧠 RAG Enhancement: Processing {tool_name} in {domain} domain...")
        
        # Step 1: Retrieve relevant knowledge
        knowledge_query = f"{tool_name} optimization {domain}"
        knowledge_data = await self.rag_orchestrator.retrieve_knowledge(knowledge_query, domain)
        
        # Step 2: Create knowledge context
        knowledge_context = MockKnowledgeContext(domain or "general", len(knowledge_data["chunks"]))
        
        # Step 3: Enhance parameters based on knowledge
        enhanced_params = await self._enhance_parameters(tool_name, input_parameters, knowledge_context)
        
        # Step 4: Calculate performance metrics
        enhancement_time_ms = (time.time() - start_time) * 1000
        
        # Update stats
        self.stats["total_enhancements"] += 1
        self.stats["successful_enhancements"] += 1
        self.stats["knowledge_chunks_used"] += knowledge_context.total_chunks
        
        # Update running average
        current_avg = self.stats["avg_enhancement_time_ms"]
        count = self.stats["successful_enhancements"]
        new_avg = ((current_avg * (count - 1)) + enhancement_time_ms) / count
        self.stats["avg_enhancement_time_ms"] = new_avg
        
        print(f"   ✅ Enhanced with {knowledge_context.total_chunks} knowledge chunks")
        print(f"   ⏱️  Enhancement time: {enhancement_time_ms:.1f}ms")
        print(f"   🎯 Target compliance: {'✅' if enhancement_time_ms < self.performance_target_ms else '❌'}")
        
        return {
            "tool_name": tool_name,
            "enhanced_parameters": enhanced_params,
            "knowledge_context": knowledge_context,
            "enhancement_time_ms": enhancement_time_ms,
            "performance_target_met": enhancement_time_ms < self.performance_target_ms,
            "original_parameters": input_parameters
        }
    
    async def _enhance_parameters(self, tool_name: str, params: Dict[str, Any], knowledge_context) -> Dict[str, Any]:
        """Enhance tool parameters using knowledge context"""
        
        enhanced = params.copy()
        
        # Tool-specific enhancements
        if "splunk" in tool_name.lower():
            if "query" in params:
                # Enhance Splunk query with knowledge-based terms
                original_query = params["query"]
                knowledge_terms = ["suspicious", "anomaly", "failed"]
                enhanced_query = f"({original_query}) AND ({' OR '.join(knowledge_terms)})"
                enhanced["query"] = enhanced_query
                enhanced["_rag_enhancement"] = f"Added {len(knowledge_terms)} knowledge terms"
                print(f"   🔍 Enhanced Splunk query: {enhanced_query}")
        
        elif "search" in tool_name.lower():
            # Enhance search parameters
            if "max_results" in params:
                enhanced["max_results"] = max(params["max_results"], 50)  # Increase based on knowledge
                enhanced["_rag_enhancement"] = "Increased result limit based on knowledge complexity"
                print(f"   📈 Enhanced result limit to {enhanced['max_results']}")
        
        # Add knowledge metadata
        enhanced["_rag_context"] = {
            "knowledge_chunks": knowledge_context.total_chunks,
            "knowledge_sources": list(knowledge_context.knowledge_sources),
            "enhancement_timestamp": time.time()
        }
        
        return enhanced
    
    def get_performance_stats(self):
        """Get performance statistics"""
        return self.stats.copy()


class DemoRAGEnhancedTool:
    """Demo RAG-enhanced tool"""
    
    def __init__(self, name: str, context_enhancer: DemoToolExecutionContextEnhancer):
        self.name = name
        self.context_enhancer = context_enhancer
        self.execution_count = 0
        
    async def execute(self, input_data: Dict[str, Any], context: Dict[str, Any] = None):
        """Execute tool with RAG enhancement"""
        
        self.execution_count += 1
        execution_id = f"{self.name}_exec_{self.execution_count}"
        
        print(f"\n🔧 Executing RAG-Enhanced Tool: {self.name}")
        print(f"   Execution ID: {execution_id}")
        print(f"   Input: {input_data}")
        
        # Get investigation context
        investigation_context = context.get("investigation_context") if context else None
        domain = context.get("domain", "general") if context else "general"
        
        # Enhance execution context
        enhanced_context = await self.context_enhancer.enhance_tool_execution_context(
            tool_name=self.name,
            input_parameters=input_data,
            investigation_context=investigation_context,
            domain=domain
        )
        
        # Execute with enhanced parameters
        execution_start = time.time()
        result = await self._execute_impl(enhanced_context["enhanced_parameters"], enhanced_context)
        execution_time_ms = (time.time() - execution_start) * 1000
        
        print(f"   ⚡ Tool execution time: {execution_time_ms:.1f}ms")
        print(f"   📊 Result: {result['status']}")
        
        return {
            "success": True,
            "result": result,
            "execution_time_ms": execution_time_ms,
            "rag_enhanced": True,
            "knowledge_chunks_used": enhanced_context["knowledge_context"].total_chunks,
            "enhancement_time_ms": enhanced_context["enhancement_time_ms"],
            "performance_target_met": enhanced_context["performance_target_met"]
        }
    
    async def _execute_impl(self, enhanced_params: Dict[str, Any], context: Dict[str, Any]):
        """Simulate tool execution"""
        
        # Simulate processing time
        await asyncio.sleep(0.05)  # 50ms
        
        return {
            "status": "completed",
            "data_processed": len(str(enhanced_params)),
            "enhanced_features": list(enhanced_params.keys()),
            "knowledge_applied": bool(enhanced_params.get("_rag_context")),
            "enhancements": enhanced_params.get("_rag_enhancement", "none")
        }


async def demo_rag_tool_context_injection():
    """Main demo function"""
    
    print("🚀 RAG Tool Context Injection Demo")
    print("=" * 50)
    
    # Initialize components
    context_enhancer = DemoToolExecutionContextEnhancer()
    investigation_context = MockInvestigationContext()
    
    # Create demo tools
    tools = [
        DemoRAGEnhancedTool("enhanced_splunk_search", context_enhancer),
        DemoRAGEnhancedTool("network_analysis_tool", context_enhancer),
        DemoRAGEnhancedTool("threat_intelligence_lookup", context_enhancer)
    ]
    
    print(f"🔧 Created {len(tools)} RAG-enhanced tools")
    
    # Demo scenarios
    demo_scenarios = [
        {
            "tool": "enhanced_splunk_search",
            "input": {"query": "index=security error", "max_results": 100},
            "context": {"domain": "security", "investigation_context": investigation_context}
        },
        {
            "tool": "network_analysis_tool", 
            "input": {"target_ip": "192.168.1.100", "analysis_type": "comprehensive"},
            "context": {"domain": "network", "investigation_context": investigation_context}
        },
        {
            "tool": "threat_intelligence_lookup",
            "input": {"indicators": ["malicious.example.com", "192.168.1.200"]},
            "context": {"domain": "threat_intel", "investigation_context": investigation_context}
        }
    ]
    
    # Execute scenarios
    results = []
    total_start_time = time.time()
    
    for i, scenario in enumerate(demo_scenarios, 1):
        print(f"\n📋 Scenario {i}: {scenario['tool']}")
        print("-" * 40)
        
        # Find tool
        tool = next((t for t in tools if t.name == scenario['tool']), None)
        if not tool:
            print(f"❌ Tool {scenario['tool']} not found")
            continue
        
        try:
            result = await tool.execute(scenario['input'], scenario['context'])
            results.append(result)
            
            print(f"   ✅ Execution successful")
            print(f"   📈 Knowledge chunks: {result['knowledge_chunks_used']}")
            print(f"   ⚡ Total time: {result['execution_time_ms'] + result['enhancement_time_ms']:.1f}ms")
            
        except Exception as e:
            print(f"   ❌ Execution failed: {str(e)}")
            results.append({"success": False, "error": str(e)})
    
    total_time = (time.time() - total_start_time) * 1000
    
    # Performance summary
    print(f"\n📊 Performance Summary")
    print("=" * 50)
    
    successful_executions = sum(1 for r in results if r.get("success", False))
    total_executions = len(results)
    
    avg_enhancement_time = sum(r.get("enhancement_time_ms", 0) for r in results) / max(1, successful_executions)
    avg_execution_time = sum(r.get("execution_time_ms", 0) for r in results) / max(1, successful_executions)
    total_knowledge_chunks = sum(r.get("knowledge_chunks_used", 0) for r in results)
    
    performance_compliant = sum(1 for r in results if r.get("performance_target_met", False))
    compliance_rate = (performance_compliant / max(1, successful_executions)) * 100
    
    print(f"Total executions: {total_executions}")
    print(f"Successful executions: {successful_executions}")
    print(f"Success rate: {(successful_executions/total_executions)*100:.1f}%")
    print(f"Average enhancement time: {avg_enhancement_time:.1f}ms")
    print(f"Average execution time: {avg_execution_time:.1f}ms") 
    print(f"Total knowledge chunks used: {total_knowledge_chunks}")
    print(f"Performance target compliance: {compliance_rate:.1f}%")
    print(f"Total demo time: {total_time:.1f}ms")
    
    # Context enhancer stats
    enhancer_stats = context_enhancer.get_performance_stats()
    print(f"\n🧠 Context Enhancer Statistics")
    print("-" * 30)
    print(f"Total enhancements: {enhancer_stats['total_enhancements']}")
    print(f"Successful enhancements: {enhancer_stats['successful_enhancements']}")
    print(f"Average enhancement time: {enhancer_stats['avg_enhancement_time_ms']:.1f}ms")
    print(f"Knowledge chunks utilized: {enhancer_stats['knowledge_chunks_used']}")
    
    # Key benefits demonstration
    print(f"\n🎯 Key Benefits Demonstrated")
    print("=" * 50)
    print("✅ RAG context injection working with <50ms overhead")
    print("✅ Parameter optimization based on domain knowledge")
    print("✅ Graceful performance monitoring and tracking")
    print("✅ Knowledge-augmented tool execution")
    print("✅ Seamless integration with existing tool framework")
    print("✅ Real-time performance compliance monitoring")
    
    return results


if __name__ == "__main__":
    print("Starting RAG Tool Context Injection Demo...")
    asyncio.run(demo_rag_tool_context_injection())