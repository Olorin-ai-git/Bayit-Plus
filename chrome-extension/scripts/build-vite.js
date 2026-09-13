import crypto from 'node:crypto';

if (typeof crypto.hash !== 'function') {
  crypto.hash = (algorithm, data, outputEncoding) => {
    const digest = crypto.createHash(algorithm).update(data).digest();
    return outputEncoding ? digest.toString(outputEncoding) : digest;
  };
}

const { build } = await import('vite');
await build();
