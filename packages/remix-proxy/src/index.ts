import { matchRoutes } from "@remix-run/router";

import { routes, sites } from "./manifest";

export interface Env {
  brochure_iii_blog: Fetcher;
  brochure_iii_marketing: Fetcher;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const matches = matchRoutes(routes, url);
    const name = matches?.[0]?.route?.name as keyof Env;

    const fetcher = name ? (env[name] as Fetcher | undefined) : undefined;
    if (fetcher) {
      console.log("FETCHER");
      return fetcher.fetch(request);
    }

    const referer = request.headers.get("Referer");

    if (
      // @ts-expect-error
      process.env.NODE_ENV === "development" &&
      request.url.match(/manifest\-[\w\d]+\.js/gi) &&
      referer
    ) {
      const matches = matchRoutes(routes, new URL(referer));
      const name = matches?.[0]?.route?.name as keyof Env;
      if (name) {
        const manifestPromises = [];
        for (const site of sites) {
          const fetcher = site
            ? (env[site as keyof Env] as Fetcher | undefined)
            : undefined;
          if (fetcher) {
            const promise = fetcher
              .fetch(new Request("http://.../__manifest.js"))
              .then(async (response) => {
                const manifest = await response.text();
                const manifestJSON = manifest
                  .replace(/^window\.__remixManifest=/, "")
                  .replace(/;$/, "");
                return { name: site, manifest: JSON.parse(manifestJSON) };
              });
            promise.catch(() => {});
            manifestPromises.push(promise);
          }
        }

        const manifests = await Promise.all(manifestPromises);
        let rootManifest;
        const routes = {};
        if (manifests.length > 0) {
          for (const { name: manifestName, manifest } of manifests) {
            if (name === manifestName) {
              rootManifest = manifest;
              Object.assign(routes, rootManifest.routes);
            } else {
              Object.assign(
                routes,
                Object.entries(manifest.routes).reduce((p, c: any) => {
                  return Object.assign(p, {
                    [`___EXTERNAL___/${c[0]}`]: {
                      ...c[1],
                      id: `___EXTERNAL___/${c[1].id}`,
                      parentId: c[1].parentId
                        ? `___EXTERNAL___/${c[1].parentId}`
                        : null,
                    },
                  });
                }, {})
              );
            }
          }

          return new Response(
            `window.__remixManifest=${JSON.stringify({
              ...rootManifest,
              routes,
            })};`,
            {
              headers: {
                "Content-Type": "application/javascript",
              },
            }
          );
        }
      }
    }

    const cached = await caches.default.match(request);
    if (cached) {
      return cached;
    }

    if ((request.method === "GET" || request.method === "HEAD") && referer) {
      const matches = matchRoutes(routes, new URL(referer));
      const name = matches?.[0]?.route?.name as keyof Env;

      const fetcher = name ? (env[name] as Fetcher | undefined) : undefined;
      if (fetcher) {
        const response = await fetcher.fetch(request);

        if (response.status === 200) {
          ctx.waitUntil(caches.default.put(request, response.clone()));
        }
        return response;
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
