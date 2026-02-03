import * as esbuild from "esbuild";
import path from "node:path";

const isProd = process.argv.includes("--prod");

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "dist/index.js",
  alias: {
    "@": path.resolve(import.meta.dirname, "../src"),
  },
  define: isProd
    ? {
        "process.env.LOG_LEVEL": JSON.stringify("error"),
      }
    : undefined,
});
