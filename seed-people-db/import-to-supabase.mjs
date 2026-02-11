/**
 * Quick import script: reads the seed CSV and inserts into Supabase.
 * Run with: node seed-people-db/import-to-supabase.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from project root
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Parse CSV (simple parser for this format)
function parseCSV(content) {
  const lines = content.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",");
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = values[idx] || null;
      });
      rows.push(row);
    }
  }

  return rows;
}

function generateSlug(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

async function main() {
  const csvPath = resolve(__dirname, "output/people_seed_v1.csv");
  const csvContent = readFileSync(csvPath, "utf8");
  const rows = parseCSV(csvContent);

  console.log(`Parsed ${rows.length} people from CSV`);

  // Transform rows to match the people table schema
  const people = rows
    .filter((r) => r.name && r.headshot_url)
    .map((r) => ({
      name: r.name,
      profession: r.profession || "Unknown",
      category: r.category || "internet_personality",
      headshot_url: r.headshot_url,
      headshot_source: r.headshot_source || "",
      headshot_license: r.headshot_license || "",
      headshot_attribution: r.headshot_attribution || "",
      wikidata_qid: r.wikidata_qid || null,
      birth_year: r.birth_year ? parseInt(r.birth_year) : null,
      // New app columns (with good defaults)
      slug: generateSlug(r.name),
      gender: "unspecified",
      source_type: "seed",
      status: "active",
      visibility: "public",
      headshot_path: r.headshot_url || "",
    }));

  console.log(`Importing ${people.length} valid people...`);

  // Insert in batches of 200
  const batchSize = 200;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < people.length; i += batchSize) {
    const batch = people.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("people")
      .upsert(batch, { onConflict: "wikidata_qid", ignoreDuplicates: true })
      .select("id");

    if (error) {
      console.error(`Batch ${i / batchSize + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += data?.length || batch.length;
      console.log(
        `Batch ${i / batchSize + 1}: inserted ${data?.length || batch.length} (total: ${inserted})`
      );
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Errors: ${errors}`);
}

main().catch(console.error);
