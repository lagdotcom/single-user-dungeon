import Engine from "../types/Engine";

export interface Command {
  name: string;
  doNotParse?: boolean;
  execute(g: Engine, ...args: string[]): void;
}

function cmdSplit(s: string) {
  const parts: string[] = [];
  let current = "";
  let quote = "";

  for (const c of s) {
    if (quote) {
      if (c === quote) {
        quote = "";
        parts.push(current);
        current = "";
      } else current += c;

      continue;
    }

    if (c === " ") {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else if (c === '"' || c === "'") {
      if (current) {
        parts.push(current);
        current = "";
      }
      quote = c;
    } else current += c;
  }

  if (current) parts.push(current);

  return parts;
}

export default class CommandHandler {
  commands: Map<string, Command>;

  constructor(
    private unhandled: Command,
    commands: Command[],
  ) {
    this.commands = new Map(commands.map((c) => [c.name, c]));
  }

  handleInput = (value: string, g: Engine) => {
    const parts = cmdSplit(value.trim());
    if (parts.length > 0) {
      const [first, ...rest] = parts;

      const cmd = this.commands.get(first.toLocaleLowerCase());
      if (cmd) return this.runCommand(g, cmd, value, rest);
    }

    return this.runCommand(g, this.unhandled, value, parts);
  };

  runCommand(g: Engine, cmd: Command, value: string, parts: string[]) {
    if (cmd.doNotParse) {
      const line = cmd.name ? value.slice(cmd.name.length + 1) : value;
      return cmd.execute(g, line);
    } else return cmd.execute(g, ...parts);
  }
}
