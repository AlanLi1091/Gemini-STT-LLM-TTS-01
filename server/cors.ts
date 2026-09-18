import type { RequestHandler } from 'express';

const ALLOWED_METHODS = 'GET,POST,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type';

/**
 * 将 ALLOWED_ORIGINS 解析为精确匹配的来源白名单。
 * 空值代表不允许任何跨域来源，但不影响无 Origin 的服务间请求。
 */
export function parseAllowedOrigins(value: string | undefined): string[] {
  return [...new Set((value ?? '').split(',').map((origin) => origin.trim()).filter(Boolean))];
}

/**
 * 轻量 CORS 白名单中间件。
 * 仅回显明确允许的 Origin，不使用通配符，也不启用跨域凭证。
 */
export function createCorsMiddleware(allowedOrigins: readonly string[]): RequestHandler {
  const whitelist = new Set(allowedOrigins);

  return (req, res, next) => {
    const origin = req.get('Origin');

    if (!origin) {
      next();
      return;
    }

    res.vary('Origin');

    if (!whitelist.has(origin)) {
      res.status(403).json({ error: 'Origin is not allowed' });
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', origin);

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
      res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
      res.status(204).end();
      return;
    }

    next();
  };
}
