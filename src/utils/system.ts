import { execSync } from "node:child_process";

export function which(command: string): string | null {
  try {
    const result = execSync(`which ${command}`, { encoding: "utf-8" });
    return result.trim() || null;
  } catch {
    return null;
  }
}
