# CVPlus Security Test Suite

**Date**: September 15, 2025
**Author**: Gil Klainert
**Security Specialist**: @security-specialist
**Purpose**: Comprehensive security validation post-authentication restoration

## Test Suite Overview

This test suite validates the security posture of the CVPlus platform after restoring proper authentication functions. It covers authentication, authorization, data access controls, and security rule validation.

## Authentication Security Tests

### AS-001: Unauthenticated Request Rejection

**Purpose**: Verify all protected endpoints reject unauthenticated requests

**Test Cases**:
```typescript
describe('Authentication: Unauthenticated Access', () => {
  const protectedEndpoints = [
    '/api/cv/generate',
    '/api/user/profile',
    '/api/premium/features',
    '/api/admin/users',
    '/api/analytics/dashboard'
  ];

  protectedEndpoints.forEach(endpoint => {
    test(`${endpoint} should reject requests without token`, async () => {
      const response = await request(app)
        .get(endpoint)
        .expect(401);

      expect(response.body.error).toContain('Authentication required');
    });
  });
});
```

### AS-002: Invalid Token Rejection

**Purpose**: Verify invalid authentication tokens are properly rejected

**Test Cases**:
```typescript
describe('Authentication: Invalid Tokens', () => {
  const invalidTokens = [
    'invalid-token',
    'Bearer malformed.jwt.token',
    'Bearer expired.token.here',
    '',
    null,
    undefined
  ];

  invalidTokens.forEach(token => {
    test(`Should reject invalid token: ${token}`, async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', token || '')
        .expect(401);

      expect(response.body.error).toMatch(/authentication|token/i);
    });
  });
});
```

### AS-003: Valid Token Acceptance

**Purpose**: Verify valid Firebase ID tokens are properly accepted and processed

**Test Cases**:
```typescript
describe('Authentication: Valid Tokens', () => {
  let validToken: string;

  beforeAll(async () => {
    // Generate valid Firebase ID token for test user
    validToken = await generateTestUserToken();
  });

  test('Should accept valid Firebase ID token', async () => {
    const response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.userId).toBeDefined();
    expect(response.body.email).toBeDefined();
  });

  test('Should set proper user context', async () => {
    const response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('uid');
    expect(response.body).toHaveProperty('email');
    expect(response.body).toHaveProperty('role');
    expect(response.body).toHaveProperty('verified');
  });
});
```

## Authorization Security Tests

### AZ-001: Role-Based Access Control

**Purpose**: Verify role-based access controls are properly enforced

**Test Cases**:
```typescript
describe('Authorization: Role-Based Access', () => {
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    userToken = await generateUserToken('user');
    adminToken = await generateUserToken('admin');
  });

  test('Regular user cannot access admin endpoints', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    expect(response.body.error).toContain('Admin access required');
  });

  test('Admin user can access admin endpoints', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.users).toBeDefined();
  });
});
```

### AZ-002: Premium Feature Access Control

**Purpose**: Verify premium feature access is properly controlled

**Test Cases**:
```typescript
describe('Authorization: Premium Features', () => {
  let freeUserToken: string;
  let premiumUserToken: string;

  beforeAll(async () => {
    freeUserToken = await generateUserToken('user', { subscription: 'free' });
    premiumUserToken = await generateUserToken('user', { subscription: 'premium' });
  });

  test('Free user cannot access premium features', async () => {
    const response = await request(app)
      .post('/api/cv/generate-advanced')
      .set('Authorization', `Bearer ${freeUserToken}`)
      .expect(403);

    expect(response.body.error).toContain('Premium subscription required');
  });

  test('Premium user can access premium features', async () => {
    const response = await request(app)
      .post('/api/cv/generate-advanced')
      .set('Authorization', `Bearer ${premiumUserToken}`)
      .send({ jobId: 'test-job', features: ['advanced'] })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

### AZ-003: Data Ownership Validation

**Purpose**: Verify users can only access their own data

**Test Cases**:
```typescript
describe('Authorization: Data Ownership', () => {
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    user1Token = await generateUserToken('user1');
    user2Token = await generateUserToken('user2');
    user1Id = await getUserIdFromToken(user1Token);
    user2Id = await getUserIdFromToken(user2Token);
  });

  test('User cannot access another user\'s CV data', async () => {
    const response = await request(app)
      .get(`/api/cv/user/${user2Id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(403);

    expect(response.body.error).toContain('Permission denied');
  });

  test('User can access their own CV data', async () => {
    const response = await request(app)
      .get(`/api/cv/user/${user1Id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    expect(response.body.userId).toBe(user1Id);
  });
});
```

## Firebase Security Rules Tests

### FSR-001: Firestore Security Rules

**Purpose**: Validate Firestore security rules prevent unauthorized data access

**Test Cases**:
```typescript
describe('Firestore Security Rules', () => {
  let testUserId: string;
  let otherUserId: string;

  beforeAll(async () => {
    testUserId = await createTestUser();
    otherUserId = await createTestUser();
  });

  test('User can read their own profile', async () => {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(testUserId).get();
    expect(userDoc.exists).toBe(true);
  });

  test('User cannot read other user profiles', async () => {
    const db = getFirestore();
    await expect(
      db.collection('users').doc(otherUserId).get()
    ).rejects.toThrow(/permission-denied/);
  });

  test('User can update their own profile', async () => {
    const db = getFirestore();
    await expect(
      db.collection('users').doc(testUserId).update({ name: 'Updated Name' })
    ).resolves.not.toThrow();
  });

  test('User cannot update other user profiles', async () => {
    const db = getFirestore();
    await expect(
      db.collection('users').doc(otherUserId).update({ name: 'Hacked Name' })
    ).rejects.toThrow(/permission-denied/);
  });
});
```

### FSR-002: Storage Security Rules

**Purpose**: Validate Firebase Storage security rules prevent unauthorized file access

**Test Cases**:
```typescript
describe('Storage Security Rules', () => {
  let testUserId: string;
  let otherUserId: string;

  beforeAll(async () => {
    testUserId = await createTestUser();
    otherUserId = await createTestUser();
  });

  test('User can upload to their own directory', async () => {
    const storage = getStorage();
    const ref = storage.ref(`users/${testUserId}/uploads/test.pdf`);

    await expect(
      ref.put(new Blob(['test data'], { type: 'application/pdf' }))
    ).resolves.not.toThrow();
  });

  test('User cannot upload to other user directories', async () => {
    const storage = getStorage();
    const ref = storage.ref(`users/${otherUserId}/uploads/malicious.pdf`);

    await expect(
      ref.put(new Blob(['malicious data'], { type: 'application/pdf' }))
    ).rejects.toThrow(/permission-denied/);
  });

  test('User can download their own files', async () => {
    const storage = getStorage();
    const ref = storage.ref(`users/${testUserId}/uploads/test.pdf`);

    await expect(ref.getDownloadURL()).resolves.toBeDefined();
  });

  test('User cannot download other user files', async () => {
    const storage = getStorage();
    const ref = storage.ref(`users/${otherUserId}/uploads/private.pdf`);

    await expect(ref.getDownloadURL()).rejects.toThrow(/permission-denied/);
  });
});
```

## Function-Level Security Tests

### FS-001: CV Processing Functions

**Purpose**: Validate CV processing functions have proper authentication

**Test Cases**:
```typescript
describe('CV Processing Security', () => {
  test('generateCV requires authentication', async () => {
    const functions = getFunctions();
    const generateCV = httpsCallable(functions, 'generateCV');

    await expect(
      generateCV({ jobId: 'test', templateId: 'basic' })
    ).rejects.toThrow(/unauthenticated/);
  });

  test('processCV validates user ownership', async () => {
    const functions = getFunctions();
    const processCV = httpsCallable(functions, 'processCV');
    const userToken = await generateUserToken();

    // Mock auth context
    auth.currentUser = { getIdToken: () => Promise.resolve(userToken) };

    await expect(
      processCV({ jobId: 'other-user-job' })
    ).rejects.toThrow(/permission-denied/);
  });
});
```

### FS-002: Payment Functions

**Purpose**: Validate payment functions have proper security controls

**Test Cases**:
```typescript
describe('Payment Function Security', () => {
  test('createCheckoutSession validates user match', async () => {
    const functions = getFunctions();
    const createCheckout = httpsCallable(functions, 'createCheckoutSession');
    const userToken = await generateUserToken('user1');

    auth.currentUser = { getIdToken: () => Promise.resolve(userToken) };

    await expect(
      createCheckout({
        userId: 'different-user-id',
        userEmail: 'test@example.com'
      })
    ).rejects.toThrow(/permission-denied/);
  });

  test('confirmPayment requires authentication', async () => {
    const functions = getFunctions();
    const confirmPayment = httpsCallable(functions, 'confirmPayment');

    await expect(
      confirmPayment({ sessionId: 'test-session' })
    ).rejects.toThrow(/unauthenticated/);
  });
});
```

## Security Vulnerability Tests

### SV-001: Injection Attack Prevention

**Purpose**: Verify input validation prevents injection attacks

**Test Cases**:
```typescript
describe('Injection Attack Prevention', () => {
  let userToken: string;

  beforeAll(async () => {
    userToken = await generateUserToken();
  });

  test('SQL injection attempts are blocked', async () => {
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'/*",
      "1; DELETE FROM users WHERE 1=1; --"
    ];

    for (const input of maliciousInputs) {
      const response = await request(app)
        .post('/api/user/update')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: input })
        .expect(400);

      expect(response.body.error).toContain('Invalid input');
    }
  });

  test('XSS attempts are blocked', async () => {
    const xssInputs = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">'
    ];

    for (const input of xssInputs) {
      const response = await request(app)
        .post('/api/user/update')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bio: input });

      // Should either reject or sanitize
      expect(response.status).toBeGreaterThanOrEqual(200);
      if (response.status === 200) {
        expect(response.body.bio).not.toContain('<script');
        expect(response.body.bio).not.toContain('javascript:');
      }
    }
  });
});
```

### SV-002: Rate Limiting Tests

**Purpose**: Verify rate limiting protects against abuse

**Test Cases**:
```typescript
describe('Rate Limiting Protection', () => {
  test('Login attempts are rate limited', async () => {
    const requests = Array(10).fill(null).map(() =>
      request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' })
    );

    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);

    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });

  test('API calls are rate limited per user', async () => {
    const userToken = await generateUserToken();

    const requests = Array(100).fill(null).map(() =>
      request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
    );

    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);

    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

## Security Configuration Tests

### SC-001: Environment Security

**Purpose**: Validate security-related environment configurations

**Test Cases**:
```typescript
describe('Security Configuration', () => {
  test('Sensitive environment variables are set', () => {
    const requiredEnvVars = [
      'FIREBASE_ADMIN_SDK_KEY',
      'JWT_SECRET',
      'STRIPE_SECRET_KEY',
      'VALID_API_KEYS'
    ];

    requiredEnvVars.forEach(envVar => {
      expect(process.env[envVar]).toBeDefined();
      expect(process.env[envVar]).not.toBe('');
    });
  });

  test('Debug mode is disabled in production', () => {
    if (process.env.NODE_ENV === 'production') {
      expect(process.env.DEBUG).toBeFalsy();
      expect(process.env.FIREBASE_DEBUG).toBeFalsy();
    }
  });

  test('CORS is properly configured', () => {
    // Test CORS headers are set correctly
    expect(process.env.CORS_ORIGINS).toBeDefined();
    expect(process.env.CORS_ORIGINS).not.toBe('*');
  });
});
```

## Security Monitoring Tests

### SM-001: Security Event Logging

**Purpose**: Verify security events are properly logged

**Test Cases**:
```typescript
describe('Security Event Logging', () => {
  test('Failed authentication attempts are logged', async () => {
    const logSpy = jest.spyOn(console, 'log');

    await request(app)
      .get('/api/user/profile')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('AUTHENTICATION_FAILURE')
    );
  });

  test('Privilege escalation attempts are logged', async () => {
    const logSpy = jest.spyOn(console, 'error');
    const userToken = await generateUserToken('user');

    await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('PRIVILEGE_ESCALATION_ATTEMPT')
    );
  });
});
```

## Test Execution Instructions

### Prerequisites

```bash
# Install test dependencies
npm install --save-dev jest supertest @types/jest @types/supertest

# Set up Firebase emulators
firebase emulators:start --only auth,firestore,storage
```

### Test Execution

```bash
# Run all security tests
npm test -- --testPathPattern=security

# Run specific test categories
npm test -- --testPathPattern=authentication
npm test -- --testPathPattern=authorization
npm test -- --testPathPattern=firestore-rules
npm test -- --testPathPattern=injection-prevention

# Run with coverage
npm test -- --coverage --testPathPattern=security
```

### Test Reporting

```bash
# Generate security test report
npm run test:security:report

# Generate coverage report
npm run test:coverage:security
```

## Success Criteria

### Test Suite Must Achieve:
- [ ] 100% authentication test pass rate
- [ ] 100% authorization test pass rate
- [ ] 100% security rule validation
- [ ] 0 critical vulnerabilities detected
- [ ] >95% code coverage on security functions

### Security Validation Checklist:
- [ ] All protected endpoints require authentication
- [ ] Role-based access controls enforced
- [ ] Data ownership validated
- [ ] Input validation prevents injection
- [ ] Rate limiting active
- [ ] Security events logged
- [ ] Error handling doesn't leak sensitive data

## Continuous Security Testing

### Automated Security Scanning

```yaml
# .github/workflows/security-tests.yml
name: Security Tests
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Security Tests
        run: |
          npm install
          npm run test:security
          npm run security:scan
```

### Regular Security Audits

- **Daily**: Automated security tests
- **Weekly**: Dependency vulnerability scans
- **Monthly**: Comprehensive security audit
- **Quarterly**: Penetration testing

---

**Test Suite Status**: Ready for execution post-authentication fix
**Next Review**: After remediation implementation
**Responsible**: @security-specialist + @testing-specialist