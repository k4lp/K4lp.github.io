// UNSMP Pilot Client (no external libs)

const storageKey = "unsmp_pilot_client_state_v2";

const el = (id) => document.getElementById(id);

const state = {
  mode: "server",
  baseUrl: "",
  userIdHash: "",
  xTimestamp: "",
  xNonce: "",
  xSignature: "",
  ikPublic: "",
  ikPrivate: "",
  spkPublic: "",
  spkSignature: "",
  spkTimestamp: "",
  spkExpiry: "",
  opkPool: "",
  bundleSignature: "",
  sendProtocolVersion: "UNSMP/1.0",
  sendMessageType: "RATCHET",
  sendTimestamp: "",
  sendReceiverIdHash: "",
  sendMessageText: "",
  sendEncryptedPayload: "",
  sendMessageSignature: "",
  sendEnvelopeJson: "",
  inboxUserIdHash: "",
  bundleUserIdHash: "",
  opkUserIdHash: "",
  entriesRange: "",
  proofMessageId: "",
  verifyRange: "",
  canonMethod: "GET",
  canonPath: "",
  canonQuery: "",
  canonBody: "",
  canonBodyHash: ""
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return;
  try { Object.assign(state, JSON.parse(saved)); } catch {}
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function setInputsFromState() {
  el("baseUrl").value = state.baseUrl;
  el("userIdHash").value = state.userIdHash;
  el("xTimestamp").value = state.xTimestamp;
  el("xNonce").value = state.xNonce;
  el("xSignature").value = state.xSignature;
  el("ikPublic").value = state.ikPublic;
  el("ikPrivate").value = state.ikPrivate;
  el("spkPublic").value = state.spkPublic;
  el("spkSignature").value = state.spkSignature;
  el("spkTimestamp").value = state.spkTimestamp;
  el("spkExpiry").value = state.spkExpiry;
  el("opkPool").value = state.opkPool;
  el("bundleSignature").value = state.bundleSignature;
  el("sendProtocolVersion").value = state.sendProtocolVersion;
  el("sendMessageType").value = state.sendMessageType;
  el("sendTimestamp").value = state.sendTimestamp;
  el("sendReceiverIdHash").value = state.sendReceiverIdHash;
  el("sendMessageText").value = state.sendMessageText;
  el("sendEncryptedPayload").value = state.sendEncryptedPayload;
  el("sendMessageSignature").value = state.sendMessageSignature;
  el("sendEnvelopeJson").value = state.sendEnvelopeJson;
  el("inboxUserIdHash").value = state.inboxUserIdHash;
  el("bundleUserIdHash").value = state.bundleUserIdHash;
  el("opkUserIdHash").value = state.opkUserIdHash;
  el("entriesRange").value = state.entriesRange;
  el("proofMessageId").value = state.proofMessageId;
  el("verifyRange").value = state.verifyRange;
  el("canonMethod").value = state.canonMethod;
  el("canonPath").value = state.canonPath;
  el("canonQuery").value = state.canonQuery;
  el("canonBody").value = state.canonBody;
  el("canonBodyHash").value = state.canonBodyHash;

  updateModeButton();
}

function syncStateFromInputs() {
  state.baseUrl = el("baseUrl").value.trim();
  state.userIdHash = el("userIdHash").value.trim();
  state.xTimestamp = el("xTimestamp").value.trim();
  state.xNonce = el("xNonce").value.trim();
  state.xSignature = el("xSignature").value.trim();
  state.ikPublic = el("ikPublic").value.trim();
  state.ikPrivate = el("ikPrivate").value.trim();
  state.spkPublic = el("spkPublic").value.trim();
  state.spkSignature = el("spkSignature").value.trim();
  state.spkTimestamp = el("spkTimestamp").value.trim();
  state.spkExpiry = el("spkExpiry").value.trim();
  state.opkPool = el("opkPool").value.trim();
  state.bundleSignature = el("bundleSignature").value.trim();
  state.sendProtocolVersion = el("sendProtocolVersion").value.trim();
  state.sendMessageType = el("sendMessageType").value;
  state.sendTimestamp = el("sendTimestamp").value.trim();
  state.sendReceiverIdHash = el("sendReceiverIdHash").value.trim();
  state.sendMessageText = el("sendMessageText").value;
  state.sendEncryptedPayload = el("sendEncryptedPayload").value.trim();
  state.sendMessageSignature = el("sendMessageSignature").value.trim();
  state.sendEnvelopeJson = el("sendEnvelopeJson").value;
  state.inboxUserIdHash = el("inboxUserIdHash").value.trim();
  state.bundleUserIdHash = el("bundleUserIdHash").value.trim();
  state.opkUserIdHash = el("opkUserIdHash").value.trim();
  state.entriesRange = el("entriesRange").value.trim();
  state.proofMessageId = el("proofMessageId").value.trim();
  state.verifyRange = el("verifyRange").value.trim();
  state.canonMethod = el("canonMethod").value;
  state.canonPath = el("canonPath").value.trim();
  state.canonQuery = el("canonQuery").value.trim();
  state.canonBody = el("canonBody").value;
  state.canonBodyHash = el("canonBodyHash").value.trim();
}

function logResponse(title, data) {
  const log = el("responseLog");
  const entry = [
    `=== ${new Date().toISOString()} | ${title} ===`,
    typeof data === "string" ? data : JSON.stringify(data, null, 2),
    ""
  ].join("\n");
  log.textContent = entry + log.textContent;
}

function updateModeButton() {
  const btn = el("toggleModeBtn");
  btn.textContent = state.mode === "server" ? "Mode: Server" : "Mode: Offline";
}

function toggleMode() {
  state.mode = state.mode === "server" ? "offline" : "server";
  updateModeButton();
  saveState();
}

function randomBytes(len) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function toBase64(bytes) {
  let binary = "";
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function generateDemoKeys() {
  const ikPub = randomBytes(2592);
  const ikPriv = randomBytes(4864);
  const spkPub = randomBytes(2592);
  const spkSig = randomBytes(4595);
  const userIdHash = randomBytes(16);

  const now = Date.now();
  const expiry = now + 7 * 24 * 60 * 60 * 1000;

  const opkPool = [];
  for (let i = 0; i < 5; i++) {
    opkPool.push({
      opk_id_hash: toHex(randomBytes(8)),
      opk_public: toBase64(randomBytes(1568))
    });
  }

  el("ikPublic").value = toBase64(ikPub);
  el("ikPrivate").value = toBase64(ikPriv);
  el("spkPublic").value = toBase64(spkPub);
  el("spkSignature").value = toBase64(spkSig);
  el("spkTimestamp").value = String(now);
  el("spkExpiry").value = String(expiry);
  el("opkPool").value = JSON.stringify(opkPool, null, 2);
  el("userIdHash").value = toHex(userIdHash);
  logResponse("Demo Keys", "Generated demo keys (placeholders). Not valid for server crypto verification.");
  syncStateFromInputs();
  saveState();
}

function exportKeys() {
  syncStateFromInputs();
  const data = {
    user_id_hash: state.userIdHash,
    ik_public: state.ikPublic,
    ik_private: state.ikPrivate,
    spk_public: state.spkPublic,
    spk_signature: state.spkSignature,
    spk_timestamp: state.spkTimestamp,
    spk_expiry: state.spkExpiry,
    opk_pool: safeJson(state.opkPool)
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "unsmp_keys.json";
  a.click();
  URL.revokeObjectURL(url);
}

function safeJson(raw) {
  try { return JSON.parse(raw); } catch { return raw || []; }
}

function buildRegistrationBody() {
  syncStateFromInputs();
  const bundle = {
    user_id_hash: state.userIdHash,
    ik_public: state.ikPublic,
    spk_public: state.spkPublic,
    spk_signature: state.spkSignature,
    spk_timestamp: Number(state.spkTimestamp || Date.now()),
    spk_expiry: Number(state.spkExpiry || (Date.now() + 7 * 24 * 60 * 60 * 1000)),
    opk_pool: safeJson(state.opkPool),
    registration_timestamp: Date.now()
  };
  return JSON.stringify({ bundle, signature: state.bundleSignature }, null, 2);
}

function buildEnvelope() {
  syncStateFromInputs();
  const timestamp = state.sendTimestamp || new Date().toISOString();
  let encryptedPayload = state.sendEncryptedPayload;
  if (!encryptedPayload && state.sendMessageText) {
    encryptedPayload = btoa(unescape(encodeURIComponent(state.sendMessageText)));
  }

  const envelope = {
    protocol_version: state.sendProtocolVersion || "UNSMP/1.0",
    sender_id_hash: state.userIdHash,
    receiver_id_hash: state.sendReceiverIdHash,
    message_type: state.sendMessageType || "RATCHET",
    timestamp,
    encrypted_payload: encryptedPayload || "",
    signature: state.sendMessageSignature || ""
  };
  const json = JSON.stringify(envelope, null, 2);
  el("sendEnvelopeJson").value = json;
  return json;
}

function canonicalizeQuery(rawQuery) {
  if (!rawQuery) return "";
  const params = rawQuery.replace(/^\?/, "").split("&").filter(Boolean);
  const pairs = params.map(p => {
    const [k, v = ""] = p.split("=");
    return [decodeURIComponent(k), decodeURIComponent(v)];
  });
  pairs.sort((a, b) => a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0]));
  return pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

function buildCanonicalString() {
  syncStateFromInputs();
  const method = state.canonMethod.toUpperCase();
  const path = state.canonPath || "/";
  const query = canonicalizeQuery(state.canonQuery);
  const bodyHash = state.canonBodyHash || "";
  const timestamp = state.xTimestamp || "";
  const nonce = state.xNonce || "";
  const canonical = [
    method,
    path,
    query,
    bodyHash,
    timestamp,
    nonce,
    "UNSMP-REQ-v1"
  ].join("\n");
  el("canonOutput").value = canonical;
}

function authHeaders() {
  return {
    "X-User-Id-Hash": state.userIdHash,
    "X-Timestamp": state.xTimestamp,
    "X-Nonce": state.xNonce,
    "X-Signature": state.xSignature
  };
}

async function sendRequest(title, method, path, body = null, needsAuth = false) {
  syncStateFromInputs();
  saveState();
  if (state.mode !== "server") {
    logResponse(`${title} (offline)`, { path, method, body });
    return;
  }
  if (!state.baseUrl) {
    logResponse("Error", "Base URL is required");
    return;
  }
  const url = state.baseUrl.replace(/\/$/, "") + path;
  const headers = { "Content-Type": "application/json" };
  if (needsAuth) Object.assign(headers, authHeaders());
  const opts = { method, headers };
  if (body !== null) opts.body = body;
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    logResponse(`${title} (${res.status})`, data);
  } catch (err) {
    logResponse(title, String(err));
  }
}

function setup() {
  loadState();
  setInputsFromState();

  el("toggleModeBtn").onclick = toggleMode;
  el("saveSettingsBtn").onclick = () => { syncStateFromInputs(); saveState(); };
  el("loadSettingsBtn").onclick = () => { loadState(); setInputsFromState(); };
  el("clearStorageBtn").onclick = () => { localStorage.removeItem(storageKey); location.reload(); };

  el("genTimestampBtn").onclick = () => { el("xTimestamp").value = Date.now().toString(); };
  el("genNonceBtn").onclick = () => {
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    el("xNonce").value = nonce;
  };

  el("generateDemoKeysBtn").onclick = generateDemoKeys;
  el("exportKeysBtn").onclick = exportKeys;

  el("registerBtn").onclick = () => {
    const body = buildRegistrationBody();
    sendRequest("Register", "POST", "/api/auth/register", body, false);
  };

  el("buildEnvelopeBtn").onclick = buildEnvelope;
  el("sendMessageBtn").onclick = () => {
    const body = buildEnvelope();
    sendRequest("Submit Message", "POST", "/api/messages/submit", body, true);
  };

  el("inboxBtn").onclick = () => {
    const id = el("inboxUserIdHash").value.trim();
    sendRequest("Inbox", "GET", `/api/messages/inbox?receiverIdHash=${encodeURIComponent(id)}`, null, true);
  };

  el("bundleBtn").onclick = () => {
    const id = el("bundleUserIdHash").value.trim();
    sendRequest("Key Bundle", "GET", `/api/auth/users/${id}/keys`, null, true);
  };

  el("opkBtn").onclick = () => {
    const id = el("opkUserIdHash").value.trim();
    sendRequest("OPK Count", "GET", `/api/auth/users/${id}/opk-count`, null, true);
  };

  el("buildCanonicalBtn").onclick = buildCanonicalString;
  el("copyCanonicalBtn").onclick = () => {
    el("canonOutput").select();
    document.execCommand("copy");
  };

  el("sthBtn").onclick = () => sendRequest("STH", "GET", "/api/transparency/sth", null, false);
  el("entriesBtn").onclick = () => {
    const [start, end] = (el("entriesRange").value || "").split(",");
    sendRequest("Entries", "GET", `/api/transparency/entries?start=${(start||"").trim()}&end=${(end||"").trim()}`, null, false);
  };
  el("proofBtn").onclick = () => {
    const id = el("proofMessageId").value.trim();
    sendRequest("Proof", "GET", `/api/transparency/proof/${id}`, null, false);
  };
  el("verifyBtn").onclick = () => {
    const [start, end] = (el("verifyRange").value || "").split(",");
    sendRequest("Verify", "GET", `/api/transparency/verify?start=${(start||"").trim()}&end=${(end||"").trim()}`, null, false);
  };
}

setup();
