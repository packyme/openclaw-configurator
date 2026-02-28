import { spawnSync } from "node:child_process";

export function which(command: string): string | null {
  const cmd = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(cmd, [command], { encoding: "utf-8" });
  if (result.status !== 0) {
    return null;
  }
  // `where` on Windows may return multiple lines; take the first
  const output = result.stdout.trim();
  return output.split(/\r?\n/)[0] || null;
}
