const fs = require("node:fs");
const path = require("node:path");

const { readConfig } = require("@remix-run/dev/dist/config");
const { ServerMode } = require("@remix-run/dev/dist/config/serverModes");

/** @type {import('@remix-run/dev').AppConfig} */
const config = {
  ignoredRouteFiles: ["**/*"],
  server: "server/index.ts",
  serverModuleFormat: "esm",
  serverPlatform: "neutral",
  serverDependenciesToBundle: [/^((?!__STATIC_CONTENT_MANIFEST).)*$/],
  serverConditions: ["workerd", "worker", "import", "browser", "default"],
  tailwind: true,
  appDirectory: "sites/marketing/app",
  routes: async (defineRoutes) => {
    const routes = {};

    const sitesDir = path.join(process.cwd(), "sites");
    const dirents = fs.readdirSync(sitesDir, { withFileTypes: true });
    for (const dirent of dirents) {
      if (!dirent.isDirectory()) continue;

      const siteDir = path.join(sitesDir, dirent.name);
      const config = await readConfig(siteDir, ServerMode.Production);
      Object.assign(
        routes,
        Object.entries(config.routes).reduce((p, c) => {
          console.log(c[1].file);
          return Object.assign(p, {
            [`${dirent.name}/${c[0]}`]: {
              ...c[1],
              id: `${dirent.name}/${c[1].id}`,
              parentId:
                c[1].id === "root"
                  ? undefined
                  : c[1].parentId
                  ? `${dirent.name}/${c[1].parentId}`
                  : `${dirent.name}/root`,
              file: `../../${dirent.name}/app/${c[1].file}`,
            },
          });
        }, {})
      );
    }

    console.log(routes);

    return routes;
  },
  future: {
    unstable_dev: true,
    v2_errorBoundary: true,
    v2_headers: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
};

module.exports = config;
