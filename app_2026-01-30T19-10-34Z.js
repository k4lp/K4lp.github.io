// UNSMP Pilot Client
// Session: 2026-01-30T19-10-34Z

const storageKey = "unsmp_pilot_client_state_v1";

const el = (id) => document.getElementById(id);

const state = {
  baseUrl: "",
  userIdHash: "",
  xTimestamp: "",
  xNonce: "",
  xSignature: "",
  registerBody: "",
  bundleUserIdHash: "",
  opkUserIdHash: "",
  messageBody: "",
  inboxUserIdHash: "",
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
  try {
    Object.assign(state, JSON.parse(saved));
  } catch {
    // ignore
  }
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
  el("registerBody").value = state.registerBody;
  el("bundleUserIdHash").value = state.bundleUserIdHash;
  el("opkUserIdHash").value = state.opkUserIdHash;
  el("messageBody").value = state.messageBody;
  el("inboxUserIdHash").value = state.inboxUserIdHash;
  el("entriesRange").value = state.entriesRange;
  el("proofMessageId").value = state.proofMessageId;
  el("verifyRange").value = state.verifyRange;
  el("canonMethod").value = state.canonMethod;
  el("canonPath").value = state.canonPath;
  el("canonQuery").value = state.canonQuery;
  el("canonBody").value = state.canonBody;
  el("canonBodyHash").value = state.canonBodyHash;
}

function syncStateFromInputs() {
  state.baseUrl = el("baseUrl").value.trim();
  state.userIdHash = el("userIdHash").value.trim();
  state.xTimestamp = el("xTimestamp").value.trim();
  state.xNonce = el("xNonce").value.trim();
  state.xSignature = el("xSignature").value.trim();
  state.registerBody = el("registerBody").value;
  state.bundleUserIdHash = el("bundleUserIdHash").value.trim();
  state.opkUserIdHash = el("opkUserIdHash").value.trim();
  state.messageBody = el("messageBody").value;
  state.inboxUserIdHash = el("inboxUserIdHash").value.trim();
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
  if (!state.baseUrl) {
    logResponse("Error", "Base URL is required");
    return;
  }
  const url = state.baseUrl.replace(/\/$/, "") + path;
  const headers = {
    "Content-Type": "application/json"
  };
  if (needsAuth) {
    Object.assign(headers, authHeaders());
  }
  const opts = { method, headers };
  if (body !== null) {
    opts.body = body;
  }
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

  el("saveSettingsBtn").onclick = () => { syncStateFromInputs(); saveState(); };
  el("loadSettingsBtn").onclick = () => { loadState(); setInputsFromState(); };
  el("clearStorageBtn").onclick = () => { localStorage.removeItem(storageKey); location.reload(); };

  el("genTimestampBtn").onclick = () => {
    el("xTimestamp").value = Date.now().toString();
  };
  el("genNonceBtn").onclick = () => {
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    el("xNonce").value = nonce;
  };

  el("buildCanonicalBtn").onclick = buildCanonicalString;
  el("copyCanonicalBtn").onclick = () => {
    el("canonOutput").select();
    document.execCommand("copy");
  };

  el("registerBtn").onclick = () => sendRequest(
    "Register",
    "POST",
    "/api/auth/register",
    el("registerBody").value || "{}",
    false
  );

  el("bundleBtn").onclick = () => {
    const id = el("bundleUserIdHash").value.trim();
    sendRequest("Key Bundle", "GET", `/api/auth/users/${id}/keys`, null, true);
  };

  el("opkBtn").onclick = () => {
    const id = el("opkUserIdHash").value.trim();
    sendRequest("OPK Count", "GET", `/api/auth/users/${id}/opk-count`, null, true);
  };

  el("messageBtn").onclick = () => sendRequest(
    "Submit Message",
    "POST",
    "/api/messages/submit",
    el("messageBody").value || "{}",
    true
  );

  el("inboxBtn").onclick = () => {
    const id = el("inboxUserIdHash").value.trim();
    sendRequest("Inbox", "GET", `/api/messages/inbox?receiverIdHash=${encodeURIComponent(id)}`, null, true);
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
