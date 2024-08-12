/*eslint-env node*/

import { context } from "esbuild";

import getBuildConfig from "./buildConfig.mjs";

const ctx = await context(
  getBuildConfig("watch", {
    sourcemap: true,
    banner: {
      js: `new EventSource('/esbuild').addEventListener('change', () => location.reload())`,
    },
  })
);
await ctx.watch();

const serve = await ctx.serve({ servedir: "docs", port: 3000 });
console.log(
  `Serving: http://${serve.host === "0.0.0.0" ? "localhost" : serve.host}:${
    serve.port
  }`
);
