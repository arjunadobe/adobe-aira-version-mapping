/*
 * ${actionName} — Payment Services webhook (web action).
 * VERIFY the signature BEFORE processing. Secret from params (.env / runtime), never inline.
 */
const crypto = require('crypto');
const { Core } = require('@adobe/aio-sdk');

function verify(rawBody, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  return !!signature && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function main(params) {
  const logger = Core.Logger('${actionName}', { level: params.LOG_LEVEL || 'info' });
  const raw = params.__ow_body || JSON.stringify(params);
  const sig = params.__ow_headers?.['x-adobe-signature'];
  if (!verify(raw, sig, params.WEBHOOK_SECRET)) {
    logger.warn('signature verification failed');
    return { statusCode: 401, body: { error: 'invalid signature' } };
  }
  // ... handle the verified payment event ...
  return { statusCode: 200, body: { ok: true } };
}

exports.main = main;
