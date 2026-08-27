import { app, safeStorage } from "electron";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Clés API des fournisseurs LLM (§ 3.3 du plan) — jamais en clair, jamais dans SQLite/core.
 * Chiffrées via `safeStorage` (backé par le trousseau OS — Keychain/DPAPI/libsecret, aucune
 * dépendance ajoutée), écrites dans un fichier séparé sous `userData`. Une seule clé par
 * fournisseur (`provider` = "anthropic-api" | "openai-api").
 */
const credentialsPath = () => path.join(app.getPath("userData"), "llm-credentials.json");

function readAll() {
  const p = credentialsPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
}

function writeAll(data) {
  const p = credentialsPath();
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data), "utf-8");
}

export function isEncryptionAvailable() {
  return safeStorage.isEncryptionAvailable();
}

/** @throws si le chiffrement OS n'est pas disponible — ne jamais retomber sur du texte en clair. */
export function setApiKey(provider, key) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("encryption-unavailable");
  }
  const all = readAll();
  all[provider] = safeStorage.encryptString(key).toString("base64");
  writeAll(all);
}

/** @returns {string | null} la clé déchiffrée, ou `null` si absente/indéchiffrable. */
export function getApiKey(provider) {
  const encrypted = readAll()[provider];
  if (!encrypted || !safeStorage.isEncryptionAvailable()) return null;
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, "base64"));
  } catch {
    return null;
  }
}

export function hasApiKey(provider) {
  return Boolean(readAll()[provider]);
}

export function clearApiKey(provider) {
  const all = readAll();
  delete all[provider];
  writeAll(all);
}
