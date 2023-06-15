import * as fs from "node:fs";
import * as path from "node:path";

import { readConfig } from "@remix-run/dev/dist/config.js";
import { ServerMode } from "@remix-run/dev/dist/config/serverModes.js";

async function main() {
  const sitesDir = path.resolve(process.cwd(), "../../sites");
  const dirents = fs.readdirSync(sitesDir, { withFileTypes: true });

  const allRoutes = [];
  const sites = [];
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;

    const siteDir = path.join(sitesDir, dirent.name);
    const config = await readConfig(siteDir, ServerMode.Development);
    const pkgPath = path.join(siteDir, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const name = pkg.name;
    sites.push(name);

    const routesById = new Map();
    const rootRoutes = [];
    for (const routeConfig of Object.values(config.routes)) {
      let route = routesById.get(routeConfig.id);
      if (!route) {
        route = {
          id: name + "/" + routeConfig.id,
          name,
        };
        routesById.set(routeConfig.id, route);
      }
      route.path = routeConfig.path;
      route.caseSensitive = routeConfig.caseSensitive;
      if (routeConfig.index) {
        route.index = true;
      }

      if (routeConfig.parentId) {
        let parent = routesById.get(routeConfig.parentId);
        if (!parent) {
          parent = {
            id: name + "/" + routeConfig.parentId,
            name,
          };
          routesById.set(routeConfig.parentId, parent);
        }

        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(route);
      } else {
        rootRoutes.push(routeConfig.id);
      }
    }

    for (const routeId of rootRoutes) {
      const route = routesById.get(routeId);
      allRoutes.push(route);
    }
  }

  fs.writeFileSync(
    path.resolve(process.cwd(), "src/manifest.ts"),
    `export const routes = ${JSON.stringify(allRoutes, null, 2)};
    export const sites = ${JSON.stringify(sites, null, 2)};
`
  );
}

main();
