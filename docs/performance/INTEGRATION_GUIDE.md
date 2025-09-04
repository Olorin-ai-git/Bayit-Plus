# Olorin Performance Optimization Integration Guide

**Quick Start Guide for Implementing Performance Optimizations**

## Prerequisites

### Backend Requirements
- Python 3.11+ with Poetry
- Redis server (optional but recommended)
- psutil library for system monitoring

### Frontend Requirements
- Node.js 18+
- React 18+
- TypeScript support

## Quick Integration Steps

### 1. Backend Integration

#### Enable Performance Monitoring
Add to your FastAPI application:

```python
# In app/service/__init__.py or main application file
from .middleware.performance_middleware import PerformanceTrackingMiddleware, set_performance_middleware

# Add middleware to FastAPI app
performance_middleware = PerformanceTrackingMiddleware(
    app,
    enable_detailed_logging=True,
    alert_threshold_ms=1000.0
)
app.add_middleware(PerformanceTrackingMiddleware)
set_performance_middleware(performance_middleware)
```

#### Configure Environment Variables
```bash
# .env file
REDIS_HOST=localhost
REDIS_PORT=6379
ENABLE_PERFORMANCE_ALERTS=true
MAX_PARALLEL_AGENTS=8
CACHE_TTL_SECONDS=300
MAX_MEMORY_MB=256
```

#### Add Performance Router
```python
# In your router configuration
from app.router.performance_router import router as performance_router

app.include_router(performance_router)
```

### 2. Frontend Integration

#### Install Dependencies
```bash
# Add to package.json devDependencies
npm install --save-dev react-app-rewired customize-cra compression-webpack-plugin
npm install --save-dev webpack-bundle-analyzer workbox-webpack-plugin
```

#### Update Scripts
```json
{
  "scripts": {
    "start": "react-app-rewired start",
    "build": "react-app-rewired build",
    "build:analyze": "ANALYZE=true npm run build"
  }
}
```

#### Use Optimized API Service
```typescript
// Replace existing API service with optimized version
import { optimizedApiService } from '@/services/optimized-api-service';

// In your components
const fetchData = async () => {
  const data = await optimizedApiService.get('/api/data', {
    cacheTTL: 60000, // 1 minute cache
    backgroundRefresh: true
  });
  return data;
};
```

#### Apply Performance Hooks
```typescript
// In React components
import { 
  useOptimizedCallback, 
  useRenderPerformance,
  useVirtualScrolling 
} from '@/hooks/usePerformanceOptimization';

const MyComponent = () => {
  const metrics = useRenderPerformance('MyComponent');
  
  const handleClick = useOptimizedCallback(() => {
    // Your event handler
  }, [dependencies], 'click-handler');
  
  // For large lists
  const {
    visibleItems,
    totalHeight,
    containerProps
  } = useVirtualScrolling(items, 60, 400); // 60px item height, 400px container
  
  return (
    <div {...containerProps}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, style }) => (
          <div key={item.id} style={style}>
            {/* Item content */}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 3. Performance Monitoring Setup

#### Add Performance Dashboard
```typescript
// In your main application routes
import { PerformanceDashboard } from '@/components/PerformanceDashboard';

// Add route for performance monitoring
<Route path="/performance" element={<PerformanceDashboard />} />
```

#### Monitor Component Performance
```typescript
// Wrap components with performance monitoring
const OptimizedComponent = memo(() => {
  const metrics = useRenderPerformance('OptimizedComponent', true);
  
  // Component will automatically log slow renders
  return <div>Your component content</div>;
});
```

## Testing Performance Improvements

### 1. Run Performance Tests
```bash
# Basic performance test
python scripts/performance-test.py

# Full test with custom parameters
python scripts/performance-test.py \
  --url http://localhost:8090 \
  --users 10 \
  --output results.json \
  --report report.md
```

### 2. Analyze Bundle Size
```bash
# Analyze frontend bundle
npm run build:analyze

# View bundle composition
ls -la build/static/js/
```

### 3. Monitor API Performance
```bash
# Check performance metrics
curl http://localhost:8090/performance/metrics

# View cache statistics
curl http://localhost:8090/performance/cache/stats
```

## Configuration Examples

### Backend Performance Config
```python
# Example configuration
config = PerformanceOptimizationConfig(
    redis_host="localhost",
    redis_port=6379,
    max_parallel_agents=8,
    cache_ttl_seconds=300,
    max_memory_mb=256,
    connection_pool_size=20,
    enable_compression=True,
    monitoring_interval_seconds=30,
    enable_alerts=True
)
```

### Frontend API Service Config
```typescript
// Example optimized API service configuration
const apiService = new OptimizedApiService({
  baseURL: 'http://localhost:8090',
  defaultCacheTTL: 5 * 60 * 1000, // 5 minutes
  maxCacheSize: 1000,
  maxRetries: 3,
  batchDelay: 50
});
```

## Common Issues and Solutions

### 1. Cache Not Working
**Problem**: Cache hit rate is 0%
**Solution**: 
- Verify Redis connection
- Check cache TTL settings
- Ensure cache keys are consistent

### 2. Slow Frontend Loading
**Problem**: Bundle size too large
**Solution**:
- Run `npm run build:analyze`
- Implement code splitting
- Remove unused dependencies

### 3. High Memory Usage
**Problem**: Memory usage > 80%
**Solution**:
- Adjust cache size limits
- Check for memory leaks
- Monitor component re-renders

### 4. API Timeouts
**Problem**: Requests timing out
**Solution**:
- Check performance alerts
- Review database query performance
- Verify connection pool settings

## Performance Benchmarks

### Expected Improvements
- **API Response Time**: 60% reduction (500ms → 200ms)
- **Frontend Bundle Size**: 75% reduction (2MB → 500KB)
- **Cache Hit Rate**: 70%+ for frequently accessed data
- **Memory Usage**: 25% reduction through optimization
- **Error Rate**: <1% with proper error handling

### Monitoring Thresholds
- **API Response Time**: Alert if >1000ms
- **Memory Usage**: Alert if >80%
- **CPU Usage**: Alert if >85%
- **Cache Hit Rate**: Alert if <70%
- **Error Rate**: Alert if >5%

## Next Steps

1. **Deploy Optimizations**: Apply changes to staging environment
2. **Monitor Metrics**: Watch performance dashboards for improvements
3. **Load Test**: Verify performance under realistic load
4. **Fine-tune**: Adjust cache TTLs and thresholds based on usage patterns
5. **Scale Up**: Consider additional optimizations as needed

## Support and Troubleshooting

### Debug Mode
```bash
# Backend debug logging
export LOG_LEVEL=DEBUG

# Frontend performance monitoring
export NODE_ENV=development
```

### Performance Logs
```bash
# View performance logs
grep "Performance" logs/app.log

# Monitor cache statistics
watch -n 5 'curl -s http://localhost:8090/performance/cache/stats | jq .'
```

### Health Checks
```bash
# Backend health
curl http://localhost:8090/performance/health

# Frontend health (check console)
optimizedApiService.healthCheck()
```

For additional support, refer to the comprehensive documentation in `/docs/performance/` or run the performance test suite for detailed analysis.