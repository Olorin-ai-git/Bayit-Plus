import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';

const report = (result) => process.stdout.write(`${JSON.stringify(result)}\n`);
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error('missing_configuration');
  return value;
};

async function provisionSecretVersions(issuer, keyId, encodedKey, timeoutMs) {
  let stage = 'configuration';
  try {
    const account = JSON.parse(required('GOOGLE_SERVICE_ACCOUNT'));
    if (account.type !== 'service_account' ||
        account.client_email !== required('GOOGLE_EXPECTED_SERVICE_ACCOUNT') ||
        account.project_id !== required('GOOGLE_EXPECTED_PROJECT')) throw new Error();
    const oauth = new URL(required('GOOGLE_OAUTH_ENDPOINT'));
    const manager = new URL(required('GOOGLE_SECRET_MANAGER_ENDPOINT'));
    if (oauth.protocol !== 'https:' || oauth.origin !== required('GOOGLE_OAUTH_ORIGIN') ||
        oauth.username || oauth.password || oauth.search || oauth.hash ||
        manager.protocol !== 'https:' || manager.origin !== required('GOOGLE_SECRET_MANAGER_ORIGIN') ||
        manager.username || manager.password || manager.search || manager.hash) throw new Error();
    const project = required('GOOGLE_TARGET_PROJECT_NUMBER');
    if (!/^\d+$/.test(project)) throw new Error();
    const values = [
      [required('ASC_ISSUER_SECRET'), Buffer.from(issuer)],
      [required('ASC_KEY_ID_SECRET'), Buffer.from(keyId)],
      [required('ASC_PRIVATE_KEY_SECRET'), Buffer.from(encodedKey.replace(/\s/g, ''), 'base64')],
    ];
    if (new Set(values.map(([name]) => name)).size !== values.length ||
        values.some(([name, value]) => !/^[a-z][a-z0-9-]+$/.test(name) || !value.length)) throw new Error();
    const ttl = Number(required('GOOGLE_TOKEN_TTL_SECONDS'));
    if (!Number.isSafeInteger(ttl) || ttl <= 0) throw new Error();
    const key = createPrivateKey(account.private_key);
    if (key.asymmetricKeyType !== 'rsa') throw new Error();
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const issuedAt = Math.floor(Date.now() / 1000);
    const input = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
      iss: account.client_email, scope: required('GOOGLE_OAUTH_SCOPE'),
      aud: oauth.href, iat: issuedAt, exp: issuedAt + ttl,
    })}`;
    const signature = sign('sha256', Buffer.from(input), key);
    if (!verify('sha256', Buffer.from(input), createPublicKey(key), signature)) throw new Error();
    stage = 'oauth';
    const tokenResponse = await fetch(oauth, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: required('GOOGLE_OAUTH_GRANT_TYPE'),
        assertion: `${input}.${signature.toString('base64url')}` }),
    });
    if (!tokenResponse.ok) {
      report({ result: 'google_authorization_rejected', httpStatus: tokenResponse.status });
      process.exitCode = 1;
      return;
    }
    const token = await tokenResponse.json();
    if (typeof token.access_token !== 'string' || !token.access_token ||
        token.token_type?.toLowerCase() !== 'bearer') throw new Error();
    stage = 'add_version';
    const versions = [];
    for (const [name, value] of values) {
      const resource = `projects/${project}/secrets/${name}`;
      const response = await fetch(new URL(`${resource}:addVersion`, manager), {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
        headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: { data: value.toString('base64') } }),
      });
      value.fill(0);
      if (!response.ok) {
        report({ result: 'secret_version_rejected', secret: name, httpStatus: response.status });
        process.exitCode = 1;
        return;
      }
      const version = await response.json();
      const prefix = `${resource}/versions/`;
      if (typeof version.name !== 'string' || !version.name.startsWith(prefix) ||
          !/^[1-9]\d*$/.test(version.name.slice(prefix.length)) || version.state !== 'ENABLED') throw new Error();
      versions.push(version.name);
      report({ result: 'secret_version_created', name: version.name });
    }
    report({ result: 'complete_apple_secret_triplet_created', versions });
  } catch {
    report({ result: 'secret_provisioning_failed', stage });
    process.exitCode = 1;
  }
}

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
  const historyEndpoint = new URL(required('STORE_HISTORY_ENDPOINT'));
  const historyOrigin = required('STORE_EXPECTED_ORIGIN');
  const historyWindowMs = Number(required('STORE_HISTORY_WINDOW_MS'));
  if (!/^[0-9a-f-]{36}$/i.test(issuer) || !/^[A-Z0-9]{10}$/.test(keyId)) {
    throw new Error('invalid_credential_identifiers');
  }
  if (!Number.isSafeInteger(ttl) || ttl <= 0 ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 ||
      endpoint.origin !== expectedOrigin || endpoint.protocol !== 'https:' ||
      endpoint.username || endpoint.password ||
      !Number.isSafeInteger(historyWindowMs) || historyWindowMs <= 0 ||
      historyEndpoint.origin !== historyOrigin || historyEndpoint.protocol !== 'https:' ||
      historyEndpoint.username || historyEndpoint.password) throw new Error('invalid_configuration');
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
    if (matching) {
      const historyInput = `${encode({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${encode({
        iss: issuer, iat: issuedAt, exp: issuedAt + ttl,
        aud: required('ASC_TOKEN_AUDIENCE'), bid: bundleId,
      })}`;
      const historySignature = sign('sha256', Buffer.from(historyInput), {
        key: privateKey, dsaEncoding: 'ieee-p1363',
      });
      const endDate = Date.now();
      const historyResponse = await fetch(historyEndpoint, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Authorization: `Bearer ${historyInput}.${historySignature.toString('base64url')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startDate: endDate - historyWindowMs, endDate }),
      });
      if (historyResponse.status !== 200) {
        report({ result: 'store_history_authorization_not_verified',
          httpStatus: historyResponse.status, readOnly: true });
        process.exitCode = 1;
      } else {
        const history = await historyResponse.json();
        const valid = history !== null && typeof history === 'object' && !Array.isArray(history) &&
          (history.notificationHistory === undefined || Array.isArray(history.notificationHistory)) &&
          (history.hasMore === undefined || typeof history.hasMore === 'boolean');
        report({ result: valid ? 'store_history_authorization_verified' : 'store_history_invalid_response',
          httpStatus: historyResponse.status, readOnly: true });
        if (!valid) process.exitCode = 1;
        if (valid && process.env.ASC_PROVISION_SECRET_VERSIONS === 'true') {
          await provisionSecretVersions(issuer, keyId, encodedKey, timeoutMs);
        }
      }
    }
  }
} catch (error) {
  const safeCodes = new Set(['missing_configuration', 'invalid_credential_identifiers',
    'invalid_configuration', 'invalid_key_encoding', 'invalid_key_type',
    'signature_self_check_failed']);
  report({ result: safeCodes.has(error?.message) ? error.message : 'credential_check_failed' });
  process.exitCode = 1;
}
