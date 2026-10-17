import type { Op } from "@cv/json";

import type { Editor } from "../editor";
import { APPLY_SOURCE } from "../utils/constant";

/** 命令名称 */
export const COMMAND = {
  MOVE: "MOVE",
  RESIZE: "RESIZE",
  DELETE: "DELETE",
  REVISE: "REVISE",
} as const;

/** 命令名称类型 */
export type CommandType = (typeof COMMAND)[keyof typeof COMMAND];

/** 移动命令 */
export type MoveCommand = {
  type: typeof COMMAND.MOVE;
  payload: { ids: string[]; dx: number; dy: number };
};

/** 缩放命令 */
export type ResizeCommand = {
  type: typeof COMMAND.RESIZE;
  payload: { id: string; x: number; y: number; width: number; height: number };
};

/** 删除命令 */
export type DeleteCommand = {
  type: typeof COMMAND.DELETE;
  payload: { ids: string[] };
};

/** 属性修改命令 */
export type ReviseCommand = {
  type: typeof COMMAND.REVISE;
  payload: { id: string; attrs: Record<string, unknown> };
};

/** 命令联合类型 */
export type CommandPayload = MoveCommand | ResizeCommand | DeleteCommand | ReviseCommand;

/** 命令上下文，插件可通过填充 ops 接管命令 */
export type CommandContext = {
  /** 命令 */
  command: CommandPayload;
  /** 待执行的 ops */
  ops: Op[];
};

/**
 * 命令模块
 * - 所有数据变更的唯一入口
 * - 负责把命令翻译成 ot-json ops 并提交
 */
export class Command {
  public constructor(private editor: Editor) {}

  /**
   * 执行命令
   * @param command 命令
   * @returns 生成的 ops
   */
  public execute(command: CommandPayload): Op[] {
    const ctx: CommandContext = { command, ops: [] };
    this.editor.plugin.call("onCommand", ctx);
    const ops = ctx.ops.length ? ctx.ops : this.translate(command);
    if (!ops.length) return [];
    this.editor.history.record(ops);
    this.editor.submit(ops, APPLY_SOURCE.USER, true);
    return ops;
  }

  /** 把命令翻译成 ops */
  private translate(command: CommandPayload): Op[] {
    switch (command.type) {
      case COMMAND.MOVE: {
        const { ids, dx, dy } = command.payload;
        const ops: Op[] = [];
        ids.forEach(id => {
          if (!this.editor.model.get(id)) return;
          dx && ops.push({ p: ["nodes", id, "x"], na: dx });
          dy && ops.push({ p: ["nodes", id, "y"], na: dy });
        });
        return ops;
      }
      case COMMAND.RESIZE: {
        const { id, x, y, width, height } = command.payload;
        return this.replace(id, { x, y, width, height });
      }
      case COMMAND.DELETE: {
        const ops: Op[] = [];
        command.payload.ids.forEach(id => {
          const state = this.editor.model.get(id);
          if (!state || !state.parentId) return;
          ops.push({ p: ["nodes", state.parentId, "children"], ld: id });
          ops.push({ p: ["nodes", id], od: state.data });
        });
        return ops;
      }
      case COMMAND.REVISE: {
        return this.replace(command.payload.id, command.payload.attrs);
      }
      default:
        return [];
    }
  }

  /**
   * 生成字段替换 op
   * - ot-json 中同时携带 od / oi 即为替换
   */
  private replace(id: string, attrs: Record<string, unknown>): Op[] {
    const state = this.editor.model.get(id);
    if (!state) return [];
    const prev = state.data as unknown as Record<string, unknown>;
    return Object.entries(attrs).map(([key, value]) => ({
      p: ["nodes", id, key],
      od: prev[key],
      oi: value,
    }));
  }
}
