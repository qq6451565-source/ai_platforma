import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, "src");
const localeDir = path.join(srcDir, "locales");
const localeCodes = ["uz", "en", "ru"];

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const flatten = (obj, prefix = "", out = {}) => {
  for (const [key, value] of Object.entries(obj || {})) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, nextKey, out);
    } else {
      out[nextKey] = String(value);
    }
  }
  return out;
};

const walkFiles = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "locales") continue;
      walkFiles(fullPath, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(fullPath);
    }
  }
  return out;
};

const extractUsedKeys = (files) => {
  const keys = new Set();
  const regex = /\bt\(\s*(['"`])([^'"`]+?)\1\s*[),]/g;

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    let match;
    while ((match = regex.exec(source))) {
      keys.add(match[2]);
    }
  }
  return keys;
};

const extractPlaceholders = (text) => {
  const placeholders = new Set();
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match;
  while ((match = regex.exec(text))) {
    placeholders.add(match[1]);
  }
  return placeholders;
};

const locales = {};
for (const code of localeCodes) {
  const filePath = path.join(localeDir, `${code}.json`);
  locales[code] = flatten(readJson(filePath));
}

const errors = [];
const baseKeys = new Set(Object.keys(locales.uz));

for (const code of ["en", "ru"]) {
  const keys = new Set(Object.keys(locales[code]));
  for (const key of baseKeys) {
    if (!keys.has(key)) {
      errors.push(`[${code}] missing key: ${key}`);
    }
  }
  for (const key of keys) {
    if (!baseKeys.has(key)) {
      errors.push(`[${code}] extra key: ${key}`);
    }
  }
}

const codeFiles = walkFiles(srcDir);
const usedKeys = extractUsedKeys(codeFiles);

for (const key of usedKeys) {
  for (const code of localeCodes) {
    if (!(key in locales[code])) {
      errors.push(`[${code}] used key missing in locale: ${key}`);
    }
  }
}

for (const key of baseKeys) {
  const placeholdersByLocale = {};
  for (const code of localeCodes) {
    placeholdersByLocale[code] = extractPlaceholders(locales[code][key] || "");
  }

  const signature = localeCodes
    .map((code) => [...placeholdersByLocale[code]].sort().join(","))
    .join("|");
  const uzSignature = [...placeholdersByLocale.uz].sort().join(",");
  if (signature !== `${uzSignature}|${uzSignature}|${uzSignature}`) {
    errors.push(
      `placeholder mismatch for ${key}: uz=[${[...placeholdersByLocale.uz].join(",")}], en=[${[...placeholdersByLocale.en].join(",")}], ru=[${[...placeholdersByLocale.ru].join(",")}]`
    );
  }
}

if (errors.length) {
  console.error("i18n audit failed:");
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log(
  `i18n audit passed: ${baseKeys.size} locale keys, ${usedKeys.size} used t(...) keys, placeholder parity OK.`
);
