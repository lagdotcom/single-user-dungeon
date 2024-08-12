export type InputListener = (input: string) => void;

export default class UI {
  inputListeners: Set<InputListener>;

  constructor(
    public display: HTMLElement,
    public input: HTMLInputElement,
  ) {
    this.inputListeners = new Set();

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

  text(s: string) {
    const div = document.createElement("div");
    div.innerText = s;

    this.display.appendChild(div);
    setTimeout(() => {
      this.display.scrollTop = this.display.scrollHeight;
    }, 0);
  }

  onInputLine() {
    const value = this.input.value;
    this.input.value = "";

    this.text("> " + value + "\n");

    for (const listener of this.inputListeners) listener(value);
  }

  addInputListener(listener: InputListener) {
    this.inputListeners.add(listener);
  }

  removeInputListener(listener: InputListener) {
    return this.inputListeners.delete(listener);
  }
}
