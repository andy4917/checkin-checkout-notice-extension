import { readFileSync } from "node:fs";

const css = readFileSync("styles/sidepanel.css", "utf8");

const expected = {
  "--sidepanel-reference-width": "400px",
  "--sidepanel-reference-height": "900px",
  "--panel-pad-left": "16px",
  "--panel-pad-right": "16px",
  "--sidepanel-right-rail": "4px",
  "--panel-reference-ratio": "0.444",
};

const values = new Map(
  [...css.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((match) => [
    match[1],
    match[2].trim(),
  ]),
);

const failures = Object.entries(expected)
  .filter(([key, value]) => values.get(key) !== value)
  .map(([key, value]) => ({
    token: key,
    expected: value,
    actual: values.get(key) || null,
  }));

const width = 400;
const height = 900;
const contentWidth = width - 16 - 16 - 4;

const report = {
  sidepanel: {
    width,
    height,
    ratio: Number((width / height).toFixed(3)),
    contentWidth,
  },
  expected,
  failures,
};

console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
