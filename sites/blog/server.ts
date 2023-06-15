import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import type { AppLoadContext } from "@remix-run/cloudflare";
import { createRequestHandler, logDevReady } from "@remix-run/cloudflare";
import * as build from "@remix-run/dev/server-build";
// @ts-expect-error
import __STATIC_CONTENT_MANIFEST from "__STATIC_CONTENT_MANIFEST";
const handleRemixRequest = createRequestHandler(
  build,
  // @ts-expect-error
  process.env.NODE_ENV
);

if (build.dev) {
  logDevReady(build);
}

export { build };

export default {
  async fetch(
    request: Request,
    env: {
      __STATIC_CONTENT: Fetcher;
    },
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const assetManifest = JSON.parse(__STATIC_CONTENT_MANIFEST);
      const url = new URL(request.url);
      const ttl = url.pathname.startsWith("/build/")
        ? 60 * 60 * 24 * 365 // 1 year
        : 60 * 5; // 5 minutes

      if (url.pathname === "/__manifest.js") {
        return await getAssetFromKV(
          {
            request: new Request(new URL(build.assets.url, url), request),
            waitUntil: ctx.waitUntil.bind(ctx),
          } as FetchEvent,
          {
            ASSET_NAMESPACE: env.__STATIC_CONTENT,
            ASSET_MANIFEST: assetManifest,
            cacheControl: {
              browserTTL: ttl,
              edgeTTL: ttl,
            },
          }
        );
      }

      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        } as FetchEvent,
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
          cacheControl: {
            browserTTL: ttl,
            edgeTTL: ttl,
          },
        }
      );
    } catch (error) {}

    try {
      const loadContext: AppLoadContext = {
        env,
      };
      return await handleRemixRequest(request, loadContext);
    } catch (error) {
      console.log(error);
      return new Response("An unexpected error occurred", { status: 500 });
    }
  },
};
