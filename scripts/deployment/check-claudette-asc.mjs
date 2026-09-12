import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';

const report = (result) => process.stdout.write(`${JSON.stringify(result)}\n`);
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error('missing_configuration');
  return value;
};

try {
  const issuer = required('ASC_ISSUER_ID');
  const keyId = required('ASC_KEY_ID');
  const encodedKey = required('ASC_PRIVATE_KEY_BASE64');
  const bundleId = required('ASC_BUNDLE_ID');
  const appId = required('ASC_APP_ID');
  const endpoint = new URL(required('ASC_APPS_ENDPOINT'));
  const expectedOrigin = required('ASC_EXPECTED_ORIGIN');
  const ttl = Number(required('ASC_TOKEN_TTL_SECONDS'));
  const timeoutMs = Number(required('ASC_REQUEST_TIMEOUT_MS'));
  if (!/^[0-9a-f-]{36}$/i.test(issuer) || !/^[A-Z0-9]{10}$/.test(keyId)) {
    throw new Error('invalid_credential_identifiers');
  }
  if (!Number.isSafeInteger(ttl) || ttl <= 0 ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 ||
      endpoint.origin !== expectedOrigin || endpoint.protocol !== 'https:' ||
      endpoint.username || endpoint.password) throw new Error('invalid_configuration');
  const compactKey = encodedKey.replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compactKey)) throw new Error('invalid_key_encoding');
  const privateKey = createPrivateKey(Buffer.from(compactKey, 'base64'));
  if (privateKey.asymmetricKeyType !== 'ec' ||
      privateKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
    throw new Error('invalid_key_type');
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const signingInput = `${encode({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${encode({
    iss: issuer, iat: issuedAt, exp: issuedAt + ttl, aud: required('ASC_TOKEN_AUDIENCE'),
  })}`;
  const signature = sign('sha256', Buffer.from(signingInput), {
    key: privateKey, dsaEncoding: 'ieee-p1363',
  });
  if (!verify('sha256', Buffer.from(signingInput), {
    key: createPublicKey(privateKey), dsaEncoding: 'ieee-p1363',
  }, signature)) throw new Error('signature_self_check_failed');
  endpoint.searchParams.set('filter[bundleId]', bundleId);
  endpoint.searchParams.set('limit', required('ASC_RESULT_LIMIT'));
  const response = await fetch(endpoint, {
    method: 'GET', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
    headers: { Authorization: `Bearer ${signingInput}.${signature.toString('base64url')}` },
  });
  if (!response.ok) {
    report({ result: 'apple_request_rejected', httpStatus: response.status });
    process.exitCode = 1;
  } else {
    const body = await response.json();
    const matching = Array.isArray(body.data) && body.data.length === 1 &&
      body.data[0]?.type === 'apps' && body.data[0]?.id === appId &&
      body.data[0]?.attributes?.bundleId === bundleId;
    report({ result: matching ? 'claudette_app_access_verified' : 'claudette_app_not_verified',
      httpStatus: response.status, readOnly: true });
    if (!matching) process.exitCode = 1;
  }
} catch (error) {
  const safeCodes = new Set(['missing_configuration', 'invalid_credential_identifiers',
    'invalid_configuration', 'invalid_key_encoding', 'invalid_key_type',
    'signature_self_check_failed']);
  report({ result: safeCodes.has(error?.message) ? error.message : 'credential_check_failed' });
  process.exitCode = 1;
}
