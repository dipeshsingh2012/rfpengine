import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const frontendRoot = process.cwd();
const stylesPath = path.resolve(frontendRoot, "src/styles.css");

function getAllSourceFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllSourceFiles(full));
    } else if ((file.endsWith(".tsx") || file.endsWith(".ts")) && !file.endsWith(".test.ts")) {
      results.push(full);
    }
  }
  return results;
}

test("CSS Integrity: styles.css exists and parses cleanly with zero syntax errors", () => {
  assert.ok(fs.existsSync(stylesPath), "src/styles.css must exist");
  const css = fs.readFileSync(stylesPath, "utf8");
  assert.ok(css.length > 0, "src/styles.css must not be empty");

  const root = postcss.parse(css);
  assert.ok(root.nodes.length > 500, `Expected comprehensive stylesheet with >500 nodes, got ${root.nodes.length}`);

  let emptySelectors = 0;
  root.walkRules((rule) => {
    if (!rule.selector || !rule.selector.trim()) {
      emptySelectors++;
    }
  });
  assert.equal(emptySelectors, 0, "Found rules with empty or malformed selectors in styles.css");
});

test("CSS Integrity: all CSS custom properties referenced in TSX and CSS are declared in :root", () => {
  const css = fs.readFileSync(stylesPath, "utf8");
  const declaredVars = new Set<string>();
  for (const m of css.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) {
    declaredVars.add(m[1]);
  }

  // Verify core design tokens are in :root
  const mandatoryTokens = [
    "--ink", "--text", "--muted", "--line", "--border", "--border-color",
    "--paper", "--surface", "--background", "--bg-subtle", "--bg-card",
    "--cream", "--blue", "--accent", "--navy", "--lime", "--coral"
  ];
  for (const token of mandatoryTokens) {
    assert.ok(declaredVars.has(token), `Mandatory design token ${token} must be declared in styles.css :root`);
  }

  // Check variables used in CSS
  const missingInCss: string[] = [];
  for (const m of css.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)) {
    if (!declaredVars.has(m[1])) {
      missingInCss.push(m[1]);
    }
  }
  assert.deepEqual(missingInCss, [], `CSS uses undefined variables: ${missingInCss.join(", ")}`);

  // Check variables used in TSX files
  const tsxFiles = getAllSourceFiles(path.resolve(frontendRoot, "src"));
  const missingInTsx: { file: string; variable: string }[] = [];
  for (const file of tsxFiles) {
    const content = fs.readFileSync(file, "utf8");
    for (const m of content.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)) {
      if (!declaredVars.has(m[1])) {
        missingInTsx.push({ file: path.relative(frontendRoot, file), variable: m[1] });
      }
    }
  }
  assert.deepEqual(missingInTsx, [], `TSX files use undefined CSS variables: ${JSON.stringify(missingInTsx)}`);
});

test("CSS Integrity: all classNames used across React components are defined in styles.css", () => {
  const css = fs.readFileSync(stylesPath, "utf8");
  const cssClasses = new Set<string>();
  for (const m of css.matchAll(/\.([a-zA-Z0-9_-]+)/g)) {
    cssClasses.add(m[1]);
  }

  const tsxFiles = getAllSourceFiles(path.resolve(frontendRoot, "src"));
  const missingClasses: { file: string; className: string }[] = [];

  const ignoredIdentifiers = new Set([
    "true", "false", "undefined", "null", "open", "selected", "active", "error", "success",
    "spin", "delete", "drawer", "split", "uploading", "drag-over", "idle", "syncing",
    "overlayClassName", "cardClassName"
  ]);

  for (const file of tsxFiles) {
    const content = fs.readFileSync(file, "utf8");
    const regex = /className\s*=\s*(?:\{`([^`]+)`\}|"([^"]+)"|'([^']+)'|\{([^}]+)\})/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const raw = match[1] || match[2] || match[3] || match[4];
      if (raw) {
        const clean = raw.replace(/\$\{[^}]+\}/g, " ").replace(/[?:'"`]/g, " ");
        clean.split(/\s+/).forEach((token) => {
          const t = token.trim();
          if (
            t &&
            /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(t) &&
            !ignoredIdentifiers.has(t) &&
            !/^is[A-Z]/.test(t) &&
            !/^has[A-Z]/.test(t)
          ) {
            if (!cssClasses.has(t)) {
              missingClasses.push({ file: path.relative(frontendRoot, file), className: t });
            }
          }
        });
      }
    }
  }

  assert.deepEqual(
    missingClasses,
    [],
    `Found unstyled React classNames missing from styles.css:\n${missingClasses.map((m) => `  - ${m.className} in ${m.file}`).join("\n")}`
  );
});

