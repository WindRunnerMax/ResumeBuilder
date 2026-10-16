import fs from "fs";
import path from "path";
import * as tsNode from "ts-node";
import { promisify } from "../utils/node";

const writeFile = promisify(fs.writeFile);

export class ManifestPlugin {
  manifest: string;

  constructor() {
    tsNode.register();
    this.manifest = path.resolve(`src/manifest/index.ts`);
  }

  apply(compiler: import("@rspack/core").Compiler) {
    compiler.hooks.make.tap("ManifestPlugin", compilation => {
      const manifest = this.manifest;
      !compilation.fileDependencies.has(manifest) && compilation.fileDependencies.add(manifest);
    });

    compiler.hooks.done.tapPromise("ManifestPlugin", async () => {
      delete require.cache[require.resolve(this.manifest)];
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const manifest = require(this.manifest);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const version = require(path.resolve("package.json")).version;
      manifest.version = version;
      await writeFile(path.resolve("build/manifest.json"), JSON.stringify(manifest, null, 2));
    });
  }
}
