import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../gsc-csv-loader.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const importRoot = path.join(root, "data/growth-os/imports");
const opportunitiesFile = path.join(root, "data/growth-os/opportunities.jsonl");

const sources = {
  gsc: {
    dir: "gsc",
    type: "csv",
    filePattern: /^gsc-\d{4}-\d{2}-\d{2}\.csv$/,
    fields: ["url", "query", "clicks", "impressions", "ctr", "position", "date"]
  },
  analytics: {
    dir: "analytics",
    type: "csv",
    filePattern: /^analytics-\d{4}-\d{2}-\d{2}\.csv$/,
    fields: ["url", "pageviews", "sessions", "referrer", "country", "device", "date"]
  },
  geo: {
    dir: "geo",
    type: "json",
    filePattern: /^geo-results-\d{4}-\d{2}-\d{2}\.json$/,
    fields: ["platform", "prompt", "mentioned", "citation_url", "accuracy", "date"]
  },
  cloudflare: {
    dir: "cloudflare",
    type: "csv",
    filePattern: /^cloudflare-\d{4}-\d{2}-\d{2}\.csv$/,
    fields: ["requests", "country", "bot", "date"]
  }
};

export function validateImports() {
  const knownUrls = new Set(readJsonl(opportunitiesFile).map((item) => item.url).filter(Boolean));
  const result = {
    imported: { gsc: 0, analytics: 0, geo: 0, cloudflare: 0 },
    errors: [],
    warnings: []
  };

  for (const [source, config] of Object.entries(sources)) {
    const dir = path.join(importRoot, config.dir);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((file) => file.endsWith(config.type === "csv" ? ".csv" : ".json")) : [];

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const relative = path.relative(root, fullPath);
      const validName = config.filePattern.test(file);
      if (!validName) result.warnings.push(`${relative}: filename does not match ${config.filePattern}`);

      let records = [];
      try {
        records = config.type === "csv" ? parseCsv(fs.readFileSync(fullPath, "utf8")) : readJsonArray(fullPath);
      } catch (error) {
        result.errors.push(`${relative}: ${error.message}`);
        continue;
      }

      if (validName) result.imported[source] += records.length;
      validateFields(result, relative, config.fields, records);
      warnUnknownUrls(result, relative, knownUrls, records);
    }
  }

  return result;
}

function validateFields(result, relative, fields, records) {
  if (!records.length) {
    result.warnings.push(`${relative}: no records found`);
    return;
  }

  const available = new Set(Object.keys(records[0] || {}));
  for (const field of fields) {
    if (!available.has(field)) result.errors.push(`${relative}: missing field ${field}`);
  }
}

function warnUnknownUrls(result, relative, knownUrls, records) {
  for (const record of records) {
    if (record.url && knownUrls.size && !knownUrls.has(record.url)) {
      result.warnings.push(`${relative}: unknown URL ${record.url}`);
    }
  }
}

function readJsonArray(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(data)) throw new Error("JSON import must contain an array");
  return data;
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateImports();
  console.log(JSON.stringify(result, null, 2));
}
