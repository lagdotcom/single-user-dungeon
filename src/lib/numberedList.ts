export default function numberedList(items: string[]) {
  const nl = Math.floor(Math.log10(items.length)) + 1;

  let value = "";
  let index = 0;
  for (const item of items) {
    index++;

    let is = index.toString();
    while (is.length < nl) is = " " + is;

    value += `${is}. ${item}\n`;
  }

  return value;
}
