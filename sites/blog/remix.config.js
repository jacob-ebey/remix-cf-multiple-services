/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ignoredRouteFiles: ["**/.*"],
  server: "server.ts",
  serverModuleFormat: "esm",
  serverPlatform: "neutral",
  serverDependenciesToBundle: [/^((?!__STATIC_CONTENT_MANIFEST).)*$/],
  serverConditions: ["workerd", "worker", "import", "browser", "default"],
  watchPaths: ["../../packages/component-library/dist/my-lib.es.js"],
  tailwind: true,
  future: {
    unstable_dev: true,
    v2_errorBoundary: true,
    v2_headers: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
};
