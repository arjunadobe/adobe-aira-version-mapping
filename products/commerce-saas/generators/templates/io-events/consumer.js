/*
 * ${actionName} — Adobe I/O Events consumer for ${eventCode}.
 * Deliveries can repeat → idempotent on event.id.
 */
const { Core } = require('@adobe/aio-sdk');

async function main(params) {
  const logger = Core.Logger('${actionName}', { level: params.LOG_LEVEL || 'info' });
  try {
    const event = params.data || params;          // CloudEvent payload
    const eventId = params.id || event?.id;
    logger.info('event ${eventCode} received', eventId);

    // TODO idempotency: skip if eventId already processed (state/store lookup).

    // ... handle the Commerce event ...

    return { statusCode: 200, body: { ok: true, eventId } };
  } catch (error) {
    logger.error(error);
    return { statusCode: 500, body: { error: 'server error' } };
  }
}

exports.main = main;
