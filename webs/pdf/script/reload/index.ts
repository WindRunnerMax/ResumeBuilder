import type { WebSocket } from "ws";
import { Server as WebSocketServer } from "ws";
import { IS_DEV } from "../utils/node";

let wsClient: WebSocket | null = null;

export class ReloadPlugin {
  constructor() {
    if (IS_DEV) {
      try {
        const server = new WebSocketServer({ port: 3333 });
        server.on("connection", client => {
          wsClient && wsClient.close();
          wsClient = client;
          console.log("Client Connected");
        });
      } catch (error) {
        console.log("Auto Reload Server Error", error);
      }
    }
  }

  apply(compiler: import("@rspack/core").Compiler) {
    compiler.hooks.afterDone.tap("ReloadPlugin", () => {
      wsClient && wsClient.send("reload-app");
    });
  }
}
