import Engine from "../types/Engine";
import { cEditor, cError } from "./colours";
import CommandHandler, { Command } from "./CommandHandler";
import numberedList from "./numberedList";

const EDITOR_HELP = `Editor Mode:
    .h    show help
    .s    display text so far
    .c    clear text
    .d #  delete line #
    .q    quit

Any other text adds to the current text.`;

export default class EditorContext {
  lines: string[];

  constructor(
    g: Engine,
    value: string,
    private onFinish: (value: string) => void,
  ) {
    g.pushInputHandler(
      new CommandHandler(this.line, [
        this.help,
        this.show,
        this.clear,
        this.delete,
        this.quit,
      ]).handleInput,
    );
    g.ui.line('Entering editor mode. ".h" for help', cEditor);

    this.lines = value ? value.split("\n") : [];
  }

  get line(): Command {
    return {
      name: "",
      doNotParse: true,
      execute: (g, line: string) => {
        this.lines.push(line);
        g.ui.line("Added line to text.", cEditor);
      },
    };
  }

  get help(): Command {
    return {
      name: ".h",
      execute: (g) => {
        g.ui.line(EDITOR_HELP);
      },
    };
  }

  get show(): Command {
    return {
      name: ".s",
      execute: (g) => {
        if (this.lines.length) g.ui.text(numberedList(this.lines));
        else g.ui.line("(text is currently empty)", cEditor);
      },
    };
  }

  get clear(): Command {
    return {
      name: ".c",
      execute: (g) => {
        this.lines = [];
        g.ui.line("OK.", cEditor);
      },
    };
  }

  get delete(): Command {
    return {
      name: ".d",
      execute: (g, arg) => {
        const line = parseInt(arg ?? "@");
        if (isNaN(line) || line < 1 || line > this.lines.length)
          return g.ui.line("Invalid line number.", cError);

        this.lines = this.lines.filter((v, i) => i !== line - 1);
        g.ui.line("OK.", cEditor);
      },
    };
  }

  get quit(): Command {
    return {
      name: ".q",
      execute: (g) => {
        g.popInputHandler();
        this.onFinish(this.lines.join("\n"));
      },
    };
  }
}
