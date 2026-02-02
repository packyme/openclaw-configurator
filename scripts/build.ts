import * as esbuild from "esbuild";
import path from "node:path";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/index.js",
  alias: {
    "@": path.resolve(import.meta.dirname, "../src"),
  },
});
