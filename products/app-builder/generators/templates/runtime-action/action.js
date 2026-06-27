/*
 * ${actionName} — Adobe I/O Runtime action (OpenWhisk).
 * `main` receives the merged default + invocation params; return a JSON-serializable result.
 */
const { Core } = require('@adobe/aio-sdk');

async function main(params) {
  const logger = Core.Logger('${actionName}', { level: params.LOG_LEVEL || 'info' });
  try {
    logger.info('${actionName} invoked');
    // ... your logic here ...
    return { statusCode: 200, body: { ok: true, action: '${actionName}' } };
  } catch (error) {
    logger.error(error);
    return { statusCode: 500, body: { error: 'server error' } };
  }
}

exports.main = main;
