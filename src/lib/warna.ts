const peta: Record<string, string> = {
  "baby pink": "#ffb7d5",
  "biru terang": "#7ecbff",
  black: "#d8d8d8",
  "black white": "#f2f2f2",
  blue: "#9eb6ff",
  brown: "#e2b08a",
  cream: "#f6e7c8",
  "cream brown": "#e8c9a0",
  gray: "#c5ccc8",
  green: "#8ee0a0",
  "lime green": "#d4f56a",
  maroon: "#f0a0aa",
  mint: "#8eecd4",
  "off white": "#f7f4ee",
  "olive green": "#c9d48a",
  pink: "#ff9ec4",
  "pink purple": "#e4b0ea",
  purple: "#d4b4ff",
  yellow: "#f6e08a",
}

export function warnaTeks(nama: string) {
  return peta[nama.trim().replace(/\s+/g, " ").toLowerCase()]
}
