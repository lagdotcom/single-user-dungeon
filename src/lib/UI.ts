import { Colour } from "../types/flavours";

export type InputListener = (input: string) => void;

export default class UI {
  element: HTMLElement;
  inputListeners: Set<InputListener>;
  scrolling: number;

  constructor(
    public display: HTMLElement,
    public input: HTMLInputElement,
  ) {
    this.inputListeners = new Set();
    this.element = display;
    this.scrolling = 0;

    this.input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.onInputLine();
    });
  }

  static find() {
    const display = document.getElementById("display");
    if (!display) throw new Error("Missing #display");

    const input = document.getElementById("input");
    if (!input) throw new Error("Missing #input");
    if (input.tagName !== "INPUT") throw new Error("#input is not an input");

    return new UI(display, input as HTMLInputElement);
  }

  text(s: string, colour?: Colour) {
    const span = document.createElement("span");
    span.innerText = s;
    if (colour) span.style.color = `var(--${colour})`;

    this.element.appendChild(span);
  }

  line(s: string, colour?: Colour) {
    return this.text(s + "\n", colour);
  }

  textBlock(s: string, colour?: Colour) {
    this.beginOutput();
    this.line(s, colour);
    this.endOutput();
  }

  onInputLine() {
    const value = this.input.value;
    this.input.value = "";
    this.textBlock("> " + value);

    for (const listener of this.inputListeners) listener(value);
  }

  addInputListener(listener: InputListener) {
    this.inputListeners.add(listener);
  }

  removeInputListener(listener: InputListener) {
    return this.inputListeners.delete(listener);
  }

  beginOutput() {
    this.element = document.createElement("div");
    this.display.appendChild(this.element);
  }

  endOutput() {
    if (!this.element.children.length) {
      this.display.removeChild(this.element);
      return;
    }

    if (!this.scrolling)
      this.scrolling = setTimeout(() => {
        this.display.scrollTop = this.display.scrollHeight;
        this.scrolling = 0;
      }, 0);
  }
}
