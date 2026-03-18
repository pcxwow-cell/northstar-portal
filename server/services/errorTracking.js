// Lightweight error tracking — sends to Sentry via their HTTP API
// or logs to console in dev. No SDK dependency needed.

const SENTRY_DSN = process.env.SENTRY_DSN;

let sentryConfig = null;
if (SENTRY_DSN) {
  try {
    const url = new URL(SENTRY_DSN);
    const projectId = url.pathname.replace('/', '');
    const publicKey = url.username;
    sentryConfig = {
      endpoint: `https://${url.host}/api/${projectId}/store/`,
      publicKey,
    };
  } catch (e) {
    console.warn('[ErrorTracking] Invalid SENTRY_DSN:', e.message);
  }
}

async function captureException(err, context = {}) {
  const event = {
    exception: {
      values: [{
        type: err.name || 'Error',
        value: err.message,
        stacktrace: { frames: parseStack(err.stack) },
      }],
    },
    tags: context.tags || {},
    extra: context.extra || {},
    user: context.user ? { id: String(context.user.id), email: context.user.email } : undefined,
    environment: process.env.NODE_ENV || 'development',
    platform: 'node',
    timestamp: Date.now() / 1000,
  };

  if (sentryConfig) {
    try {
      const res = await fetch(sentryConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${sentryConfig.publicKey}`,
        },
        body: JSON.stringify(event),
      });
      if (!res.ok) console.warn('[ErrorTracking] Sentry returned', res.status);
    } catch (e) {
      console.warn('[ErrorTracking] Failed to send to Sentry:', e.message);
    }
  } else {
    // Dev: just log
    console.error('[ErrorTracking]', err.message, context.extra || '');
  }
}

function parseStack(stack) {
  if (!stack) return [];
  return stack.split('\n').slice(1).map(line => {
    const match = line.match(/at (.+?) \((.+?):(\d+):(\d+)\)/) || line.match(/at (.+?):(\d+):(\d+)/);
    if (!match) return { filename: 'unknown', function: line.trim() };
    return {
      function: match[1] || 'anonymous',
      filename: match[2] || 'unknown',
      lineno: parseInt(match[3]) || 0,
      colno: parseInt(match[4]) || 0,
    };
  }).reverse();
}

// Express error middleware
function errorTrackingMiddleware(err, req, res, next) {
  captureException(err, {
    user: req.user,
    extra: { method: req.method, url: req.url, ip: req.ip },
    tags: { route: req.route?.path },
  });
  next(err);
}

module.exports = { captureException, errorTrackingMiddleware };
