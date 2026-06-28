/*
 * ${actionName} — App Builder WEB action (HTTP-invokable).
 * Returns { statusCode, body }. Validate required params; keep secrets in inputs/.env.
 */
const { Core } = require('@adobe/aio-sdk');

async function main(params) {
  const logger = Core.Logger('${actionName}', { level: params.LOG_LEVEL || 'info' });
  try {
    // const required = ['param']; for (const p of required) if (!params[p]) ...
    logger.info('${actionName} (web) invoked');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { ok: true, action: '${actionName}' },
    };
  } catch (error) {
    logger.error(error);
    return { statusCode: 500, body: { error: 'server error' } };
  }
}

exports.main = main;
