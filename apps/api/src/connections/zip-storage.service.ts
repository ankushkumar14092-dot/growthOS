import { Injectable } from "@nestjs/common";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import AdmZip from "adm-zip";
import {
  detectFrameworkFromPackageJson,
  detectFrameworkFromTree,
  DetectedFramework,
} from "./zip.adapter";

export type StoredZip = {
  storageKey: string;
  filename: string;
  size: number;
  framework: DetectedFramework;
  rootEntries: string[];
};

@Injectable()
export class ZipStorageService {
  private dir() {
    const d = join(process.cwd(), "storage", "zips");
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
    return d;
  }

  store(file: { originalname: string; buffer: Buffer; size: number }): StoredZip {
    const storageKey = `${randomUUID()}.zip`;
    const abs = join(this.dir(), storageKey);
    writeFileSync(abs, file.buffer);

    let rootEntries: string[] = [];
    let framework: DetectedFramework = "unknown";
    try {
      const zip = new AdmZip(file.buffer);
      const entries = zip.getEntries();
      rootEntries = entries
        .map((e) => e.entryName)
        .filter((n) => n && !n.startsWith("__MACOSX"))
        .slice(0, 200);

      const topLevel = new Set<string>();
      for (const name of rootEntries) {
        const parts = name.split("/").filter(Boolean);
        if (parts.length === 1) topLevel.add(parts[0]);
        else if (parts.length >= 2) topLevel.add(parts[1] === "" ? parts[0] : parts[0]);
      }
      // Prefer files at first directory level
      const names = entries
        .filter((e) => !e.isDirectory)
        .map((e) => {
          const parts = e.entryName.split("/").filter(Boolean);
          return parts[parts.length - 1];
        });
      framework = detectFrameworkFromTree(names);

      const pkgEntry = entries.find((e) =>
        e.entryName.replace(/\\/g, "/").endsWith("package.json"),
      );
      if (pkgEntry) {
        const detected = detectFrameworkFromPackageJson(
          pkgEntry.getData().toString("utf8"),
        );
        if (detected !== "unknown") framework = detected;
      }
    } catch {
      framework = "unknown";
    }

    return {
      storageKey,
      filename: file.originalname,
      size: file.size,
      framework,
      rootEntries: rootEntries.slice(0, 40),
    };
  }
}
