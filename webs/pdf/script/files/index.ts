import thread from "child_process";
import fs from "fs/promises";
import path from "path";

const exec = (command: string) => {
  return new Promise<string | undefined>((resolve, reject) => {
    thread.exec(command, (err, stdout) => {
      if (err) reject(err);
      resolve(stdout);
    });
  });
};

export class FilesPlugin {
  constructor() {
    fs.mkdir("build/static", { recursive: true });
    fs.mkdir("build/_locales", { recursive: true });
  }

  apply(compiler: import("@rspack/core").Compiler) {
    compiler.hooks.make.tap("FilesPlugin", compilation => {
      const resources = path.resolve("public/static");
      !compilation.contextDependencies.has(resources) &&
        compilation.contextDependencies.add(resources);
    });
    compiler.hooks.done.tapPromise("FilesPlugin", async () => {
      const locales = path.resolve("public/locales");
      const resources = path.resolve("public/static");

      const localesTarget = path.resolve("build/_locales");
      const resourcesTarget = path.resolve("build/static");

      await Promise.all([
        exec(`cp -r ${locales}/* ${localesTarget}`),
        exec(`cp -r ${resources}/* ${resourcesTarget}`),
      ]);
    });
  }
}
