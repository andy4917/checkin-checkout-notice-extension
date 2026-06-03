import { readFileSync } from "node:fs";

const css = readFileSync("styles/sidepanel.css", "utf8");

const expected = {
  "--sidepanel-reference-width": "400px",
  "--sidepanel-reference-height": "900px",
  "--panel-pad-left": "14px",
  "--panel-pad-right": "14px",
  "--sidepanel-right-rail": "0px",
  "--panel-reference-ratio": "0.444",
};

const rootBody = css.match(/body\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body || "";
const values = new Map(
  [...rootBody.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((match) => [
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
const contentWidth = width - 14 - 14;

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
