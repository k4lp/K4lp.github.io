const treeContainer = document.getElementById("file-tree");
const lineNumbersEl = document.getElementById("line-numbers");
const codeViewEl = document.getElementById("code-view");
const breadcrumbsEl = document.getElementById("breadcrumbs");
const inspectorEl = document.getElementById("inspector");
const roleEl = document.getElementById("current-role");
const timelineEl = document.getElementById("timeline");
const simButtonsEl = document.getElementById("sim-buttons");

const pathMap = new Map();
const pathNodes = new Map();
const timelineButtons = new Map();
const scenarioButtons = new Map();
let selectedPath = null;
let activeScenario = null;

function buildPath(node, parentPath) {
  const current = parentPath ? `${parentPath}/${node.name}` : node.name;
  node.path = current;
  pathMap.set(current, node);
  if (node.children) {
    node.children.forEach(child => buildPath(child, current));
  }
}

function createTreeNode(node, depth = 0) {
  const item = document.createElement("div");
  item.className = "text-gray-200";

  const row = document.createElement("div");
  row.className = "flex items-center px-2 py-1 rounded cursor-pointer hover:bg-[#373940] transition";
  row.style.paddingLeft = `${depth * 14 + 6}px`;

  const icon = document.createElement("span");
  icon.className = "material-symbols-outlined text-sm mr-2 text-gray-400";
  icon.textContent = node.type === "folder" ? "folder" : "description";

  const label = document.createElement("span");
  label.textContent = node.name;

  row.appendChild(icon);
  row.appendChild(label);

  item.appendChild(row);

  if (node.type === "folder") {
    const childrenWrap = document.createElement("div");
    childrenWrap.className = "ml-2 border-l border-[#3d4047]";
    node.children.forEach(child => childrenWrap.appendChild(createTreeNode(child, depth + 1)));
    item.appendChild(childrenWrap);

    let open = depth < 1; // expand top-level by default
    childrenWrap.style.display = open ? "block" : "none";
    icon.textContent = open ? "folder_open" : "folder";

    row.addEventListener("click", (e) => {
      if (e.target.tagName === "SPAN" || e.target === row || e.target === label) {
        open = !open;
        childrenWrap.style.display = open ? "block" : "none";
        icon.textContent = open ? "folder_open" : "folder";
      }
    });
  } else {
    row.dataset.path = node.path;
    pathNodes.set(node.path, row);
    row.addEventListener("click", () => selectFile(node.path));
  }

  return item;
}

function renderTree(root) {
  treeContainer.innerHTML = "";
  treeContainer.appendChild(createTreeNode(root));
}

function renderTimeline() {
  const steps = [
    { label: "Manifest Parsed", path: "app/src/main/manifests/AndroidManifest.xml" },
    { label: "Application (DI)", path: "app/src/main/java/com/example/demosuperapp/SuperApp.kt" },
    { label: "AppModule (Bindings)", path: "app/src/main/java/com/example/demosuperapp/di/AppModule.kt" },
    { label: "MainActivity", path: "app/src/main/java/com/example/demosuperapp/ui/MainActivity.kt" },
    { label: "Nav Graph", path: "app/src/main/res/navigation/nav_graph.xml" },
    { label: "LoginFragment", path: "app/src/main/java/com/example/demosuperapp/ui/login/LoginFragment.kt" },
    { label: "LoginViewModel", path: "app/src/main/java/com/example/demosuperapp/ui/login/LoginViewModel.kt" },
    { label: "Repository", path: "app/src/main/java/com/example/demosuperapp/data/repo/UserRepository.kt" },
    { label: "Room DB", path: "app/src/main/java/com/example/demosuperapp/data/db/AppDatabase.kt" },
    { label: "WorkManager Service", path: "app/src/main/java/com/example/demosuperapp/data/sync/SyncScheduler.kt" },
    { label: "Foreground Sync", path: "app/src/main/java/com/example/demosuperapp/data/sync/ForegroundRefreshService.kt" },
    { label: "Connectivity Receiver", path: "app/src/main/java/com/example/demosuperapp/system/ConnectivityReceiver.kt" },
    { label: "Push Receiver", path: "app/src/main/java/com/example/demosuperapp/push/PushReceiver.kt" },
    { label: "Boot Receiver", path: "app/src/main/java/com/example/demosuperapp/system/BootReceiver.kt" }
  ];

  timelineEl.innerHTML = "";
  steps.forEach(step => {
    const btn = document.createElement("button");
    btn.className = "px-3 py-2 rounded bg-[#1e1f22] border border-[#3d4047] hover:border-[#56b6c2] text-gray-200 transition";
    btn.textContent = step.label;
    btn.addEventListener("click", () => selectFile(step.path));
    timelineButtons.set(step.path, btn);
    timelineEl.appendChild(btn);
  });
}

const scenarios = [
  {
    id: "login-success",
    label: "User taps Login (success)",
    path: "app/src/main/java/com/example/demosuperapp/ui/login/LoginViewModel.kt",
    walkthrough: [
      "Login button triggers ViewModel.login",
      "LoginUseCase -> UserRepository -> AuthApi",
      "Repository caches in Room; StateFlow marks signedIn=true",
      "Nav graph action moves to DashboardFragment"
    ]
  },
  {
    id: "login-error",
    label: "User taps Login (error)",
    path: "app/src/main/java/com/example/demosuperapp/ui/login/LoginViewModel.kt",
    walkthrough: [
      "AuthApi fails; Repository propagates exception",
      "ViewModel sets error; popup visible",
      "UI shows dialog_popup.xml via UiEvent"
    ]
  },
  {
    id: "offline-cache",
    label: "Offline start with cache",
    path: "app/src/main/java/com/example/demosuperapp/data/db/AppDatabase.kt",
    walkthrough: [
      "App starts; Room emits last session via Flow",
      "ViewModel observes session, can auto-nav to dashboard",
      "WorkManager retries profile refresh once network returns"
    ]
  },
  {
    id: "token-expired",
    label: "Token expiry",
    path: "app/src/main/java/com/example/demosuperapp/data/api/AuthInterceptor.kt",
    walkthrough: [
      "AuthInterceptor sees 401; (conceptual) would trigger refresh",
      "Repository could revoke session in Room",
      "UI observes null session and routes back to login"
    ]
  },
  {
    id: "process-death",
    label: "Process death restore",
    path: "app/src/main/java/com/example/demosuperapp/ui/MainActivity.kt",
    walkthrough: [
      "Process recreated; manifest -> SuperApp -> Hilt graph",
      "Room/StateFlow restore session; NavGraph starts again",
      "If session present, ViewModel can navigate to dashboard"
    ]
  },
  {
    id: "push-notification",
    label: "Push opens app",
    path: "app/src/main/java/com/example/demosuperapp/push/PushReceiver.kt",
    walkthrough: [
      "FCM receives push; receiver builds intent to MainActivity",
      "NavGraph opens target screen/deep link",
      "Optional refresh via RefreshProfileUseCase"
    ]
  },
  {
    id: "boot-receiver",
    label: "Device boot completed",
    path: "app/src/main/java/com/example/demosuperapp/system/BootReceiver.kt",
    walkthrough: [
      "BroadcastReceiver runs before UI",
      "Schedules SyncScheduler service to keep data fresh",
      "Next app open benefits from warmed Room cache"
    ]
  },
  {
    id: "deep-link-login",
    label: "Deep link to login",
    path: "app/src/main/manifests/AndroidManifest.xml",
    walkthrough: [
      "User taps superapp://login link",
      "Manifest intent-filter resolves MainActivity",
      "NavGraph starts LoginFragment with extras"
    ]
  },
  {
    id: "manual-foreground-sync",
    label: "User triggers foreground sync",
    path: "app/src/main/java/com/example/demosuperapp/data/sync/ForegroundRefreshService.kt",
    walkthrough: [
      "User taps Sync -> starts ForegroundRefreshService",
      "Service promotes to foreground (notification), calls RefreshProfileUseCase",
      "Room cache updates; UI observes refreshed data once user returns"
    ]
  },
  {
    id: "logout-flow",
    label: "User logs out",
    path: "app/src/main/java/com/example/demosuperapp/domain/usecase/LogoutUseCase.kt",
    walkthrough: [
      "UI calls LogoutUseCase from ViewModel",
      "Repository clears Room session and token (conceptual)",
      "Nav graph returns to Login; AuthInterceptor stops sending token"
    ]
  }
];

function renderSimButtons() {
  simButtonsEl.innerHTML = "";
  scenarios.forEach(sc => {
    const btn = document.createElement("button");
    btn.className = "px-3 py-2 rounded bg-[#1e1f22] border border-[#3d4047] hover:border-[#56b6c2] text-gray-200 transition";
    btn.textContent = sc.label;
    btn.addEventListener("click", () => {
      selectFile(sc.path, true);
      renderWalkthrough(sc.walkthrough);
      setActiveScenario(sc.id);
    });
    scenarioButtons.set(sc.id, btn);
    simButtonsEl.appendChild(btn);
  });
}

function renderWalkthrough(steps) {
  if (!steps || !steps.length) return;
  const wrap = document.createElement("div");
  wrap.className = "mt-3 space-y-1";
  const title = document.createElement("div");
  title.className = "text-xs text-gray-400 uppercase tracking-wide";
  title.textContent = "Scenario Walkthrough";
  wrap.appendChild(title);
  const list = document.createElement("ol");
  list.className = "list-decimal list-inside text-gray-200 text-sm space-y-1";
  steps.forEach(s => {
    const li = document.createElement("li");
    li.textContent = s;
    list.appendChild(li);
  });
  // inject under inspector
  const existing = inspectorEl.querySelector("#scenario-walk");
  if (existing) existing.remove();
  wrap.id = "scenario-walk";
  inspectorEl.appendChild(wrap);
}

function renderCode(code) {
  const lines = code.split("\n");
  lineNumbersEl.textContent = lines.map((_, idx) => idx + 1).join("\n");
  codeViewEl.textContent = code;
}

function renderBreadcrumbs(path) {
  breadcrumbsEl.textContent = path.replace(/\\/g, "/");
}

function renderInspector(node) {
  inspectorEl.innerHTML = "";
  if (!node.analysis) {
    inspectorEl.innerHTML = `<div class="text-gray-400">No analysis metadata for this node.</div>`;
    return;
  }

  const header = document.createElement("div");
  header.className = "space-y-1";
  header.innerHTML = `
    <div class="text-xs text-gray-400 uppercase tracking-wide">${node.analysis.role}</div>
    <div class="text-base font-semibold text-[#9cdcfe]">${node.name}</div>
  `;
  inspectorEl.appendChild(header);

  const desc = document.createElement("div");
  desc.className = "text-gray-200 text-sm";
  desc.textContent = node.analysis.description;
  inspectorEl.appendChild(desc);

  if (node.analysis.flow && node.analysis.flow.length) {
    const flowWrap = document.createElement("div");
    flowWrap.className = "space-y-2";
    const title = document.createElement("div");
    title.className = "text-xs text-gray-400 uppercase tracking-wide";
    title.textContent = "Execution Path";
    flowWrap.appendChild(title);

    const list = document.createElement("ol");
    list.className = "list-decimal list-inside space-y-1 text-gray-200 text-sm";
    node.analysis.flow.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    flowWrap.appendChild(list);
    inspectorEl.appendChild(flowWrap);
  }

  const renderSide = (titleText, items, accent) => {
    if (!items || !items.length) return;
    const wrap = document.createElement("div");
    wrap.className = "space-y-1";
    const title = document.createElement("div");
    title.className = "text-xs uppercase tracking-wide";
    title.style.color = accent;
    title.textContent = titleText;
    wrap.appendChild(title);
    const list = document.createElement("ul");
    list.className = "list-disc list-inside text-gray-200 text-sm space-y-1";
    items.forEach(t => {
      const li = document.createElement("li");
      li.textContent = t;
      list.appendChild(li);
    });
    wrap.appendChild(list);
    inspectorEl.appendChild(wrap);
  };

  renderSide("Before this file", node.analysis.before, "#c678dd");
  renderSide("After this file", node.analysis.after, "#98c379");

  if (node.analysis.tags && node.analysis.tags.length) {
    const tags = document.createElement("div");
    tags.className = "flex flex-wrap gap-2";
    node.analysis.tags.forEach(tag => {
      const pill = document.createElement("span");
      pill.className = "px-2 py-1 rounded-full bg-[#1f2024] border border-[#3d4047] text-xs text-gray-300";
      pill.textContent = tag;
      tags.appendChild(pill);
    });
    inspectorEl.appendChild(tags);
  }

  if (node.analysis.connections && node.analysis.connections.length) {
    const connWrap = document.createElement("div");
    connWrap.className = "space-y-2";
    const title = document.createElement("div");
    title.className = "text-xs text-gray-400 uppercase tracking-wide";
    title.textContent = "Connections";
    connWrap.appendChild(title);

    node.analysis.connections.forEach(conn => {
      const btn = document.createElement("button");
      btn.className = "w-full text-left px-3 py-2 rounded bg-[#1f2024] border border-[#3d4047] hover:border-[#56b6c2] text-gray-200 transition";
      btn.textContent = `${conn.label} → ${conn.target}`;
      btn.addEventListener("click", () => selectFile(conn.target));
      connWrap.appendChild(btn);
    });

    inspectorEl.appendChild(connWrap);
  }
}

function selectFile(path, keepScenario = false) {
  const node = pathMap.get(path);
  if (!node || node.type !== "file") return;
  selectedPath = path;
  renderCode(node.code);
  renderBreadcrumbs(path);
  roleEl.textContent = `Role: ${node.analysis?.role || "—"}`;
  renderInspector(node);
  setActiveHighlight(path);
  if (!keepScenario) {
    clearScenarioHighlight();
    const existing = inspectorEl.querySelector("#scenario-walk");
    if (existing) existing.remove();
  }
}

function clearScenarioHighlight() {
  scenarioButtons.forEach(btn => btn.classList.remove("active-chip"));
  activeScenario = null;
}

function setActiveScenario(id) {
  scenarioButtons.forEach((btn, key) => {
    btn.classList.toggle("active-chip", key === id);
  });
  activeScenario = id;
}

function setActiveHighlight(path) {
  pathNodes.forEach((row, key) => {
    row.classList.toggle("active-row", key === path);
  });
  timelineButtons.forEach((btn, key) => {
    btn.classList.toggle("active-chip", key === path);
  });
  if (!path || (activeScenario && !path)) return;
  if (!activeScenario) clearScenarioHighlight();
}

function boot() {
  buildPath(fileSystem, "");
  renderTree(fileSystem);
  renderTimeline();
  renderSimButtons();
  // default selection: manifest if available
  const manifestPath = "app/src/main/manifests/AndroidManifest.xml";
  if (pathMap.has(manifestPath)) {
    selectFile(manifestPath);
  } else {
    const firstFile = Array.from(pathMap.values()).find(n => n.type === "file");
    if (firstFile) selectFile(firstFile.path);
  }
}

document.addEventListener("DOMContentLoaded", boot);
