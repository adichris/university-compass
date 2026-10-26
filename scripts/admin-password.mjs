#!/usr/bin/env node
// Admin dashboard password. Run on the server, from the project folder:
//   node scripts/admin-password.mjs            generate a new random password and print it once
//   node scripts/admin-password.mjs --choose   type your own instead (asked twice, hidden)
//   node scripts/admin-password.mjs --disable  turn the dashboard off
// Only a scrypt hash is stored, in data/local/admin.json (git-ignored). A new password applies
// immediately and signs out every existing dashboard session.
import { randomBytes, randomInt, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const file = join(root, "data", "local", "admin.json");
const MIN_LENGTH = 12;

/** 24 characters in groups of 4, without look-alikes (0/O, 1/l/I), e.g. "k7Pq-..." - about 140 bits. */
function generate() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chars = Array.from({ length: 24 }, () => alphabet[randomInt(alphabet.length)]);
  return chars.join("").match(/.{4}/g).join("-");
}

function ask(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    if (!stdin.isTTY) {
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (c) => (data += c));
      stdin.on("end", () => resolve(data.split(/\r?\n/)[0]));
      return;
    }
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (ch) => {
      if (ch === "\r" || ch === "\n" || ch === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (ch === "\u0003") {
        stdout.write("\n");
        process.exit(130);
      } else if (ch === "\u007f" || ch === "\b") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

if (process.argv.includes("--disable")) {
  if (existsSync(file)) rmSync(file);
  console.log("Admin dashboard disabled.");
  process.exit(0);
}

let password;
if (process.argv.includes("--choose")) {
  password = await ask(`New admin password (at least ${MIN_LENGTH} characters): `);
  if (password.length < MIN_LENGTH) {
    console.error(`Too short - use at least ${MIN_LENGTH} characters.`);
    process.exit(1);
  }
  if (process.stdin.isTTY && (await ask("Repeat it: ")) !== password) {
    console.error("The passwords didn't match. Nothing was changed.");
    process.exit(1);
  }
} else {
  password = generate();
}

const salt = randomBytes(16);
const key = scryptSync(password, salt, 64);
mkdirSync(dirname(file), { recursive: true });
const tmp = `${file}.tmp`;
writeFileSync(tmp, JSON.stringify({ hash: `scrypt$${salt.toString("hex")}$${key.toString("hex")}`, updatedAt: new Date().toISOString() }, null, 1) + "\n", { mode: 0o600 });
renameSync(tmp, file);

if (process.argv.includes("--choose")) {
  console.log("Admin password saved. Sign in at /admin.");
} else {
  console.log("\nNew admin password (shown only once - copy it now):\n");
  console.log(`    ${password}\n`);
  console.log("Sign in at /admin. Any existing dashboard sessions have been signed out.");
}
