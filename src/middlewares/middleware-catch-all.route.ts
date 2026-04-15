/**
 * Wildcard path for `MiddlewareConsumer.forRoutes`.
 * Nest 11+ uses path-to-regexp v8: bare `*` can emit LegacyRouteConverter warnings; `{*path}` is the v8 splat.
 * Nest 10 and Fastify's middie stack do not reliably support `{*path}`.
 */
export function getMiddlewareCatchAllRoute(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version } = require('@nestjs/core/package.json') as { version: string };
    const major = Number.parseInt(version.split('.', 1)[0]!, 10);
    return Number.isFinite(major) && major >= 11 ? '{*path}' : '*';
  } catch {
    return '*';
  }
}
