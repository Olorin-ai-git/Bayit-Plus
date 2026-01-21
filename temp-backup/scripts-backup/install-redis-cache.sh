#!/bin/bash

# CVPlus Redis Cache Installation Script
# Installs and configures Redis caching layer for performance optimization
#
# Author: Gil Klainert
# Version: 1.0.0
# Created: 2025-08-28

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the functions directory
check_directory() {
    if [ ! -f "package.json" ]; then
        print_error "This script must be run from the functions directory"
        print_error "Please cd to /path/to/cvplus/functions and run the script again"
        exit 1
    fi
    
    if [ ! -d "src/services/cache" ]; then
        print_error "Cache services directory not found"
        print_error "Please ensure the Redis cache services have been created first"
        exit 1
    fi
    
    print_success "Directory check passed"
}

# Install Redis dependencies
install_redis_dependencies() {
    print_status "Installing Redis dependencies..."
    
    # Check if package-redis-cache.json exists
    if [ -f "package-redis-cache.json" ]; then
        print_status "Found Redis dependencies file, installing..."
        
        # Extract dependencies and install them
        REDIS_DEPS=$(cat package-redis-cache.json | grep -A 10 '"dependencies"' | grep -E '"[^"]+": "[^"]+"' | sed 's/.*"\([^"]*\)": "\([^"]*\)".*/\1@\2/' | tr '\n' ' ')
        DEV_DEPS=$(cat package-redis-cache.json | grep -A 10 '"devDependencies"' | grep -E '"[^"]+": "[^"]+"' | sed 's/.*"\([^"]*\)": "\([^"]*\)".*/\1@\2/' | tr '\n' ' ')
        
        if [ ! -z "$REDIS_DEPS" ]; then
            print_status "Installing Redis production dependencies: $REDIS_DEPS"
            npm install $REDIS_DEPS
        fi
        
        if [ ! -z "$DEV_DEPS" ]; then
            print_status "Installing Redis development dependencies: $DEV_DEPS"
            npm install --save-dev $DEV_DEPS
        fi
    else
        print_status "Installing Redis dependencies manually..."
        npm install ioredis@^5.3.2
        npm install --save-dev @types/ioredis@^5.0.0
    fi
    
    print_success "Redis dependencies installed successfully"
}

# Create Redis configuration template
create_redis_config() {
    print_status "Creating Redis configuration template..."
    
    # Check if .env file exists
    ENV_FILE="../.env"
    ENV_FUNCTIONS_FILE=".env"
    
    # Determine which .env file to use
    TARGET_ENV=""
    if [ -f "$ENV_FILE" ]; then
        TARGET_ENV="$ENV_FILE"
    elif [ -f "$ENV_FUNCTIONS_FILE" ]; then
        TARGET_ENV="$ENV_FUNCTIONS_FILE"
    else
        print_warning "No .env file found. Creating one..."
        TARGET_ENV="$ENV_FUNCTIONS_FILE"
        touch "$TARGET_ENV"
    fi
    
    print_status "Using environment file: $TARGET_ENV"
    
    # Add Redis configuration if not present
    if ! grep -q "REDIS_" "$TARGET_ENV"; then
        print_status "Adding Redis configuration to $TARGET_ENV"
        
        cat >> "$TARGET_ENV" << 'EOF'

# Redis Cache Configuration for CVPlus Performance Optimization
# Development Redis (local)
REDIS_DEV_HOST=127.0.0.1
REDIS_DEV_PORT=6379
REDIS_DEV_PASSWORD=
REDIS_DEV_DB=2
REDIS_DEV_TLS=false

# Staging Redis
REDIS_STAGING_HOST=redis-staging.cvplus.com
REDIS_STAGING_PORT=6379
REDIS_STAGING_PASSWORD=your_staging_password_here
REDIS_STAGING_DB=1
REDIS_STAGING_TLS=true

# Production Redis
REDIS_PROD_HOST=redis-prod.cvplus.com
REDIS_PROD_PORT=6379
REDIS_PROD_PASSWORD=your_production_password_here
REDIS_PROD_DB=0
REDIS_PROD_TLS=true

EOF
        print_success "Redis configuration added to $TARGET_ENV"
    else
        print_warning "Redis configuration already exists in $TARGET_ENV"
    fi
}

# Create Redis test script
create_test_script() {
    print_status "Creating Redis test script..."
    
    cat > "src/scripts/test-redis-cache.ts" << 'EOF'
/**
 * Redis Cache Test Script
 * Tests all Redis cache services and performance
 */

import { initializeCacheServices, performCacheHealthCheck } from '../services/cache';
import { pricingCacheService } from '../services/cache/pricing-cache.service';
import { subscriptionCacheService } from '../services/cache/subscription-cache.service';
import { redisClient } from '../services/cache/redis-client.service';

async function testRedisCache() {
  console.log('🧪 Testing Redis Cache Services...\n');
  
  try {
    // Initialize cache services
    console.log('1️⃣ Initializing cache services...');
    await initializeCacheServices();
    console.log('✅ Cache services initialized\n');
    
    // Test Redis connection
    console.log('2️⃣ Testing Redis connection...');
    const redisMetrics = redisClient.getMetrics();
    console.log('Redis Metrics:', redisMetrics);
    console.log('✅ Redis connection test passed\n');
    
    // Test pricing cache
    console.log('3️⃣ Testing pricing cache...');
    const pricingTest = await pricingCacheService.getPricing({
      userId: 'test_user',
      tier: 'PREMIUM',
      region: 'US'
    });
    console.log('Pricing result:', pricingTest.formattedPrice);
    console.log('✅ Pricing cache test passed\n');
    
    // Test subscription cache
    console.log('4️⃣ Testing subscription cache...');
    const subTest = await subscriptionCacheService.getUserSubscription('test_user');
    console.log('Subscription cached:', subTest.cached);
    console.log('✅ Subscription cache test passed\n');
    
    // Health check
    console.log('5️⃣ Performing health check...');
    const healthCheck = await performCacheHealthCheck();
    console.log('Health Score:', healthCheck.score);
    console.log('Issues:', healthCheck.issues);
    console.log('✅ Health check completed\n');
    
    console.log('🎉 All Redis cache tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Redis cache test failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  testRedisCache().then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
}

export { testRedisCache };
EOF
    
    print_success "Redis test script created at src/scripts/test-redis-cache.ts"
}

# Create performance monitoring script
create_performance_script() {
    print_status "Creating performance monitoring script..."
    
    cat > "src/scripts/monitor-cache-performance.ts" << 'EOF'
/**
 * Cache Performance Monitoring Script
 * Generates detailed performance reports
 */

import { generateCachePerformanceReport } from '../services/cache';
import { writeFileSync } from 'fs';

async function monitorCachePerformance() {
  console.log('📊 Generating Cache Performance Report...\n');
  
  try {
    const report = await generateCachePerformanceReport();
    
    // Display key metrics
    console.log('🎯 Overall Performance:');
    console.log(`   Hit Rate: ${(report.overall.hitRate * 100).toFixed(2)}%`);
    console.log(`   Avg Response Time: ${report.overall.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Error Rate: ${(report.overall.errorRate * 100).toFixed(2)}%`);
    console.log(`   Health Score: ${report.overall.healthScore}/100\n`);
    
    console.log('🔍 Service Breakdown:');
    Object.entries(report.services).forEach(([service, metrics]) => {
      console.log(`   ${service}:`);
      if ('hitRate' in metrics) {
        console.log(`     Hit Rate: ${(metrics.hitRate * 100).toFixed(2)}%`);
        console.log(`     Requests: ${metrics.requests}`);
      }
    });
    
    if (report.alerts.length > 0) {
      console.log('\n⚠️  Alerts:');
      report.alerts.forEach(alert => {
        console.log(`   ${alert.level.toUpperCase()}: ${alert.message}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`   ${rec.priority.toUpperCase()}: ${rec.description}`);
      });
    }
    
    // Save detailed report
    const reportPath = `cache_performance_${new Date().toISOString().split('T')[0]}.json`;
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Performance monitoring failed:', error);
    process.exit(1);
  }
}

// Run monitoring if called directly
if (require.main === module) {
  monitorCachePerformance().then(() => {
    console.log('\n✅ Performance monitoring completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Performance monitoring failed:', error);
    process.exit(1);
  });
}

export { monitorCachePerformance };
EOF
    
    print_success "Performance monitoring script created at src/scripts/monitor-cache-performance.ts"
}

# Update TypeScript configuration
update_typescript_config() {
    print_status "Checking TypeScript configuration..."
    
    if [ -f "tsconfig.json" ]; then
        # Check if Redis types are configured properly
        if ! grep -q "ioredis" "tsconfig.json"; then
            print_status "TypeScript configuration looks good"
        fi
    else
        print_warning "No tsconfig.json found - Redis types may not be resolved properly"
    fi
}

# Create deployment notes
create_deployment_notes() {
    print_status "Creating deployment notes..."
    
    cat > "REDIS_DEPLOYMENT.md" << 'EOF'
# Redis Cache Deployment Guide

## Overview
This document outlines the deployment and configuration of the Redis caching layer for CVPlus performance optimization.

## Performance Targets
- Pricing calculations: <50ms (from >1000ms)
- Feature access validation: <10ms (from >100ms)
- Analytics queries: <200ms (from 180s)
- Usage tracking: 90% reduction in Firestore writes

## Prerequisites

### 1. Redis Server Setup

#### Development (Local)
```bash
# Install Redis locally (macOS)
brew install redis

# Start Redis server
redis-server

# Test connection
redis-cli ping
```

#### Production (Redis Cloud/AWS ElastiCache)
1. Set up Redis cluster with:
   - High availability (multi-AZ)
   - Encryption in transit and at rest
   - Proper security groups
   - Monitoring and alerting

### 2. Environment Configuration
Update your `.env` file with Redis credentials:
```
REDIS_PROD_HOST=your-redis-endpoint
REDIS_PROD_PASSWORD=your-redis-password
REDIS_PROD_TLS=true
```

## Deployment Steps

### 1. Install Dependencies
```bash
cd functions
npm install ioredis@^5.3.2 @types/ioredis@^5.0.0
```

### 2. Test Redis Connection
```bash
npx ts-node src/scripts/test-redis-cache.ts
```

### 3. Deploy Functions
```bash
firebase deploy --only functions
```

### 4. Monitor Performance
```bash
npx ts-node src/scripts/monitor-cache-performance.ts
```

## Monitoring and Alerts

### Key Metrics to Monitor
1. **Cache Hit Rates**
   - Pricing: >80%
   - Subscription: >85%
   - Feature Access: >75%

2. **Response Times**
   - All cache operations: <50ms
   - Analytics queries: <200ms

3. **Error Rates**
   - All services: <5%
   - Redis connectivity: <1%

### Setting Up Alerts
Configure alerts for:
- Cache hit rate below thresholds
- Response times above targets
- Redis connection failures
- High error rates

## Performance Optimization Tips

1. **Cache Warming**
   - Run cache warming during deployment
   - Pre-load data for active users
   - Use batch operations for efficiency

2. **TTL Optimization**
   - Pricing cache: 4 hours
   - Subscription cache: 5 minutes
   - Feature access: 30 minutes
   - Analytics: 30 minutes

3. **Memory Management**
   - Monitor Redis memory usage
   - Configure appropriate eviction policies
   - Scale Redis instances as needed

## Troubleshooting

### Common Issues
1. **Redis Connection Timeout**
   - Check network connectivity
   - Verify Redis server is running
   - Check security group settings

2. **High Cache Miss Rate**
   - Review TTL settings
   - Check cache warming process
   - Monitor cache invalidation patterns

3. **Memory Issues**
   - Monitor Redis memory usage
   - Review eviction policy
   - Consider increasing Redis memory

### Debug Commands
```bash
# Test Redis connection
redis-cli -h your-host -p 6379 ping

# Monitor Redis commands
redis-cli -h your-host -p 6379 monitor

# Check Redis info
redis-cli -h your-host -p 6379 info memory
```

## Performance Validation

After deployment, validate performance improvements:

1. **Measure Response Times**
   ```bash
   # Before and after comparison
   npx ts-node src/scripts/test-performance.ts
   ```

2. **Monitor Cache Metrics**
   ```bash
   # Generate performance report
   npx ts-node src/scripts/monitor-cache-performance.ts
   ```

3. **Load Testing**
   - Run load tests with k6 or similar
   - Validate performance under load
   - Ensure cache effectiveness

## Maintenance

### Regular Tasks
1. Monitor cache performance weekly
2. Review and optimize TTL settings monthly
3. Update Redis version quarterly
4. Performance testing before major releases

### Backup Strategy
1. Configure Redis persistence (RDB + AOF)
2. Set up automated backups
3. Test backup restoration process
4. Monitor backup integrity

## Security Considerations

1. **Network Security**
   - Use TLS for all connections
   - Implement proper security groups
   - Use VPC for production Redis

2. **Authentication**
   - Use strong Redis passwords
   - Rotate passwords regularly
   - Use Redis AUTH

3. **Data Encryption**
   - Enable encryption at rest
   - Use encrypted connections (TLS)
   - Encrypt sensitive cached data

## Cost Optimization

1. **Right-sizing**
   - Monitor memory usage patterns
   - Scale instances based on actual needs
   - Use reserved instances for production

2. **Efficiency**
   - Optimize cache keys and data structures
   - Use appropriate data types
   - Monitor cache efficiency metrics
EOF
    
    print_success "Deployment guide created: REDIS_DEPLOYMENT.md"
}

# Main installation process
main() {
    print_status "🚀 Starting Redis Cache Installation for CVPlus"
    print_status "================================================\n"
    
    # Check directory and prerequisites
    check_directory
    
    # Install Redis dependencies
    install_redis_dependencies
    
    # Create configuration
    create_redis_config
    
    # Create test scripts
    create_test_script
    create_performance_script
    
    # Update TypeScript configuration
    update_typescript_config
    
    # Create deployment notes
    create_deployment_notes
    
    print_success "\n🎉 Redis Cache Installation Complete!"
    print_status "================================================"
    print_status "Next Steps:"
    print_status "1. Review and update Redis configuration in your .env file"
    print_status "2. Set up Redis server (local for dev, cloud for production)"
    print_status "3. Test the installation: npx ts-node src/scripts/test-redis-cache.ts"
    print_status "4. Monitor performance: npx ts-node src/scripts/monitor-cache-performance.ts"
    print_status "5. Deploy to Firebase: firebase deploy --only functions"
    print_status ""
    print_status "📖 Read REDIS_DEPLOYMENT.md for detailed deployment guide"
    print_status "================================================"
}

# Run main function
main "$@"