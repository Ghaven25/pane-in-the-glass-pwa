// pitg-live-agent.js
// Live "English → code" watcher.
// Edit AGENT.md (below) and on each save this will patch the target file.
//
// Usage (Terminal):
//   node pitg-live-agent.js
//
// Edit ./AGENT.md like:
//   path: src/views/admin/AdminHome.jsx
//   ---
//   Reduce ONLY the gap under "Quick Actions" heading to ~4px. Keep everything else the same.
//
// Requires:
//   export OPENAI_API_KEY="YOUR_KEY"
//   npm i openai chokidar

import fs from "fs";
import path from "path";
import chokidar from "chokidar";
import OpenAI from "openai";

const ROOT = process.cwd();
const AGENT_FILE = path.join(ROOT, "AGENT.md");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function parseAgentFile(txt) {
  // Expect:
  // path: <relative/path/to/file>
  // ---
  // <instruction...>
  const lines = txt.split(/\r?\n/);
  const first = lines[0] || "";
  const m = first.match(/^path:\s*(.+)$/i);
  if (!m) return null;
  const targetRel = m[1].trim();
  const sepIdx = lines.findIndex(l => l.trim() === "---");
  const instruction = sepIdx >= 0 ? lines.slice(sepIdx + 1).join("\n").trim() : lines.slice(1).join("\n").trim();
  if (!targetRel || !instruction) return null;
  return { targetRel, instruction };
}

async function applyInstruction({ targetRel, instruction }) {
  const absPath = path.join(ROOT, targetRel);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Target not found: ${absPath}`);
    return;
  }
  const original = fs.readFileSync(absPath, "utf8");

  const systemPrompt = `
You are a precise senior React developer. The user will give:
1) a single file's full current contents, and
2) a natural-language instruction.

Your job:
- Apply ONLY those requested changes.
- Keep ALL other visuals, structure, and logic exactly the same.
- Return ONLY the full, final UPDATED file contents (no comments, no Markdown fences, no explanations).
- Do not invent new files or imports unless absolutely required.
- Keep JSX valid and buildable (no stray braces, no dangling commas).
  `.trim();

  const userPrompt = `
=== INSTRUCTION ===
${instruction}

=== FILE PATH ===
${absPath}

=== CURRENT FILE CONTENTS ===
${original}
`.trim();

  console.log(`🧠 Applying: "${instruction}" → ${targetRel}`);

  const resp = await openai.chat.completions.create({
    model: "gpt-5",
    temperature: 0.1,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  const updated = resp.choices?.[0]?.message?.content ?? "";
  if (!updated || updated.trim().length < 5) {
    console.error("❌ Empty/invalid model response.");
    return;
  }

  const bakPath = absPath + ".bak";
  fs.writeFileSync(bakPath, original, "utf8");
  fs.writeFileSync(absPath, updated, "utf8");
  console.log(`✅ Updated: ${targetRel}`);
  console.log(`💾 Backup:  ${path.basename(bakPath)}`);
}

function runOnce() {
  if (!fs.existsSync(AGENT_FILE)) {
    fs.writeFileSync(
      AGENT_FILE,
      `path: src/views/admin/AdminHome.jsx
---
Reduce ONLY the gap right below the "Quick Actions" heading to ~4px; do not change any other gaps.`,
      "utf8"
    );
    console.log(`📝 Created ${AGENT_FILE}. Edit it and save to trigger updates.`);
  }
  const raw = fs.readFileSync(AGENT_FILE, "utf8");
  const parsed = parseAgentFile(raw);
  if (!parsed) {
    console.error(`❌ Could not parse ${AGENT_FILE}. First line must be: path: <file>\nThen a line with '---', then your instruction.`);
    return;
  }
  applyInstruction(parsed).catch(err => console.error("❌ Error:", err.message));
}

console.log(`👀 Watching: ${AGENT_FILE}`);
chokidar
  .watch(AGENT_FILE, { ignoreInitial: false })
  .on("add", runOnce)
  .on("change", runOnce)
  .on("error", err => console.error("Watcher error:", err));