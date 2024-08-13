import { Command } from "./CommandHandler";

export default function alias(name: string, ...rewrite: string[]): Command {
  return {
    name,
    execute(g, ...args) {
      g.interpret(...rewrite, ...args);
    },
  };
}
