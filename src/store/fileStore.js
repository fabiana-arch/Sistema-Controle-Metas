const fs = require("fs/promises");
const path = require("path");

const storagePath = process.env.STORAGE_FILE
  ? path.resolve(process.env.STORAGE_FILE)
  : path.resolve(process.cwd(), "data/app.json");

const emptyStore = {
  users: [],
  goals: [],
  counters: {
    userId: 1,
    goalId: 1,
  },
};

async function ensureFileStore() {
  await fs.mkdir(path.dirname(storagePath), { recursive: true });

  try {
    await fs.access(storagePath);
  } catch (error) {
    await fs.writeFile(storagePath, JSON.stringify(emptyStore, null, 2));
  }
}

async function readStore() {
  await ensureFileStore();
  const raw = await fs.readFile(storagePath, "utf8");
  return JSON.parse(raw);
}

async function writeStore(store) {
  await fs.writeFile(storagePath, JSON.stringify(store, null, 2));
}

module.exports = {
  ensureFileStore,
  readStore,
  storagePath,
  writeStore,
};
