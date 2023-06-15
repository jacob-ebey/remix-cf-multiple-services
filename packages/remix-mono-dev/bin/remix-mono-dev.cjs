#!/usr/bin/env node

import("../dist/remix-mono-dev.js")
  .then((m) => m.main(process.argv.slice(2)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
