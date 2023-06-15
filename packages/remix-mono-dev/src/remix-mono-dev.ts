import * as fs from "node:fs";
import * as http from "node:http";
import { createRequire } from "node:module";
import * as path from "node:path";
import type { Readable } from "node:stream";

import arg from "arg";
import { execa, type ExecaChildProcess } from "execa";
import getPort from "get-port";
import { type RemixConfig, readConfig } from "@remix-run/dev/dist/config.js";
import { ServerMode } from "@remix-run/dev/dist/config/serverModes.js";

const require = createRequire(import.meta.url);

export async function main(argv: string[]) {
  const sitesDir = path.join(process.cwd(), "sites");
  const dirents = fs.readdirSync(sitesDir, { withFileTypes: true });

  const sites: {
    dir: string;
    name: string;
    config: RemixConfig;
  }[] = [];

  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;

    const siteDir = path.join(sitesDir, dirent.name);
    const config = await readConfig(siteDir, ServerMode.Development);
    const pkgPath = path.join(siteDir, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    sites.push({
      dir: siteDir,
      name: pkg.name,
      config,
    });
  }

  const {
    "--warm": warm,
    _: [proxyName],
  } = arg(
    {
      "--warm": [String],
    },
    { argv }
  );

  const nx = require.resolve("nx");
  let devProxyProcess: ExecaChildProcess<string>;

  // http
  //   .createServer(async (req, res) => {
  //     try {
  //       const name = await streamToString(req);
  //       if (!siteProcesses.has(name)) {
  //         const { proxyProcess } = await startDevProcess(nx, name, true);
  //         siteProcesses.set(name, proxyProcess);

  //         if (devProxyProcess) {
  //           let resolve;
  //           const killedPromise = new Promise((r) => {
  //             resolve = r;
  //           });
  //           devProxyProcess.on("exit", () => {
  //             resolve();
  //           });
  //           devProxyProcess.kill("SIGTERM", { forceKillAfterTimeout: 1_000 });
  //           await killedPromise;
  //           const { proxyProcess } = await startDevProcess(
  //             nx,
  //             proxyName,
  //             false
  //           );
  //           devProxyProcess = proxyProcess;
  //         }
  //       }
  //       res.end();
  //     } catch (reason) {
  //       console.error(reason);
  //       res.writeHead(500);
  //       res.end();
  //     }
  //   })
  //   .listen(6000);

  // Warm sites
  const siteProcesses = new Map<string, ExecaChildProcess<string>>();

  const warmNames = new Set(warm);
  const startDevPromises = [];
  for (const site of sites) {
    if (warmNames.has(site.name)) {
      const startDevPromise = startDevProcess(nx, site.name, true).then(
        ({ proxyProcess }) => {
          siteProcesses.set(site.name, proxyProcess);
        }
      );
      startDevPromise.catch(() => {});
      startDevPromises.push(startDevPromise);
    }
  }
  await Promise.all(startDevPromises);

  // Proxy
  const { proxyProcess } = await startDevProcess(nx, proxyName, false);
  devProxyProcess = proxyProcess;
}

async function startDevProcess(nx, name, randomPort) {
  const port = await getPort();
  const args = ["run", `${name}:dev`];
  if (randomPort) {
    args.push("--", "--port", port.toFixed(0));
  }
  const proxyProcess = execa(nx, args, {
    stdio: ["ignore", "pipe", "inherit"],
    env: {
      ...process.env,
      NODE_ENV: "development",
    },
  });
  const proxyProcessBuffer = bufferize(proxyProcess.stdout, true);
  let proxyStarted = false;
  for (let i = 0; i < 100; i++) {
    const output = await proxyProcessBuffer.read();
    if (output.includes("[mf:inf] Ready on http")) {
      proxyStarted = true;
      break;
    }
  }
  if (!proxyStarted) {
    proxyProcessBuffer.close();
    throw new Error("Failed to wait for proxy to start");
  }
  return { proxyProcess };
}

function streamToString(stream): Promise<string> {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function bufferize(stream: Readable, pipe = false) {
  let buffer = "";
  let resolve;
  let promise = new Promise((r, e) => {
    resolve = r;
  });
  const cb = (data) => {
    const d = data.toString();
    if (pipe) {
      process.stdout.write(d);
    }
    buffer += d;
    resolve();
    promise = new Promise((r) => {
      resolve = r;
    });
  };
  stream.on("data", cb);
  return {
    set pipe(val) {
      pipe = val;
    },
    get buffer() {
      return buffer;
    },
    read: () => promise.then(() => buffer),
    close: () => {
      stream.off("data", cb);
      resolve();
    },
  };
}
