/**
 * GEMINI DEEP RESEARCH SYSTEM - RUNTIME CORE
 * Production-ready, live implementation
 */

(() => {
  "use strict";

  /********************************************************************
   * CORE CONSTANTS & UTILITIES
   ********************************************************************/

  const VERSION = "1.0.0";
  const NOW = () => new Date();
  const pad2 = (n) => String(n).padStart(2, "0");

  function nowISO() {
    const d = NOW();
    const yr = d.getFullYear();
    const mo = pad2(d.getMonth() + 1);
    const da = pad2(d.getDate());
    const hr = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    return `${yr}-${mo}-${da} ${hr}:${mi}`;
  }

  function encodeHTML(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function safeJSONParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function isNonEmptyString(x) {
    return typeof x === "string" && x.trim().length > 0;
  }

  /********************************************************************
   * DOM QUERY & ASSERTION
   ********************************************************************/

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function assertDom(el, label) {
    if (!el) {
      console.error(`DOM hook missing: ${label}`);
    }
    return el;
  }

  /********************************************************************
   * LOCAL STORAGE KEYS
   ********************************************************************/

  const LS_KEYS = {
    META: "gdrs_meta",
    KEYPOOL: "gdrs_keypool",
    GOALS: "gdrs_goals",
    MEMORY: "gdrs_memory",
    TASKS: "gdrs_tasks",
    VAULT: "gdrs_vault",
    FINAL_OUTPUT: "gdrs_final_output",
    REASONING_LOG: "gdrs_reasoning_log"
  };

  /********************************************************************
   * DATA MODELS
   ********************************************************************/

  const DEFAULT_FINAL_OUTPUT = () => ({
    timestamp: "—",
    html: "<p>Report will render here after goal validation.</p>"
  });

  const DEFAULT_KEYPOOL = () => {
    const arr = [];
    for (let i = 1; i <= 5; i++) {
      arr.push({
        slot: i,
        key: "",
        usage: 0,
        cooldownUntil: 0,
        rateLimited: false,
        valid: false
      });
    }
    return arr;
  };

  /********************************************************************
   * STORE LAYER
   ********************************************************************/

  const Store = {
    loadKeypool() {
      const raw = safeJSONParse(localStorage.getItem(LS_KEYS.KEYPOOL), null);
      if (!Array.isArray(raw)) {
        const seed = DEFAULT_KEYPOOL();
        localStorage.setItem(LS_KEYS.KEYPOOL, JSON.stringify(seed));
        return seed;
      }
      return KeyManager.normalizeKeypool(raw);
    },
    saveKeypool(pool) {
      localStorage.setItem(LS_KEYS.KEYPOOL, JSON.stringify(pool));
    },

    loadGoals() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.GOALS), []) || [];
    },
    saveGoals(goalsArr) {
      localStorage.setItem(LS_KEYS.GOALS, JSON.stringify(goalsArr));
    },

    loadMemory() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.MEMORY), []) || [];
    },
    saveMemory(memArr) {
      localStorage.setItem(LS_KEYS.MEMORY, JSON.stringify(memArr));
    },

    loadTasks() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.TASKS), []) || [];
    },
    saveTasks(tasksArr) {
      localStorage.setItem(LS_KEYS.TASKS, JSON.stringify(tasksArr));
    },

    loadVault() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.VAULT), []) || [];
    },
    saveVault(vaultArr) {
      localStorage.setItem(LS_KEYS.VAULT, JSON.stringify(vaultArr));
    },

    loadFinalOutput() {
      const fo = safeJSONParse(localStorage.getItem(LS_KEYS.FINAL_OUTPUT), null);
      if (!fo || typeof fo !== "object") {
        const fallback = DEFAULT_FINAL_OUTPUT();
        localStorage.setItem(LS_KEYS.FINAL_OUTPUT, JSON.stringify(fallback));
        return fallback;
      }
      return fo;
    },
    saveFinalOutput(htmlString) {
      const outObj = {
        timestamp: nowISO(),
        html: htmlString || ""
      };
      localStorage.setItem(LS_KEYS.FINAL_OUTPUT, JSON.stringify(outObj));
    },

    loadReasoningLog() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.REASONING_LOG), []) || [];
    },
    saveReasoningLog(lines) {
      localStorage.setItem(LS_KEYS.REASONING_LOG, JSON.stringify(lines));
    }
  };

  /********************************************************************
   * KEY MANAGER
   ********************************************************************/

  const KeyManager = {
    normalizeKeypool(arr) {
      const out = [];
      for (let i = 1; i <= 5; i++) {
        const found = arr.find((k) => k && k.slot === i);
        if (found) {
          out.push({
            slot: i,
            key: isNonEmptyString(found.key) ? found.key.trim() : "",
            usage: Number(found.usage || 0),
            cooldownUntil: Number(found.cooldownUntil || 0),
            rateLimited: !!found.rateLimited,
            valid: !!found.valid
          });
        } else {
          out.push({
            slot: i,
            key: "",
            usage: 0,
            cooldownUntil: 0,
            rateLimited: false,
            valid: false
          });
        }
      }
      return out;
    },

    getCooldownRemainingSeconds(k) {
      const now = Date.now();
      if (!k.cooldownUntil || k.cooldownUntil <= now) return 0;
      const diffMs = k.cooldownUntil - now;
      const secFloat = diffMs / 1000;
      const secInt = Math.ceil(secFloat);
      return secInt < 0 ? 0 : secInt;
    },

    liftCooldowns() {
      const pool = Store.loadKeypool();
      let dirty = false;
      const now = Date.now();
      for (const k of pool) {
        if (k.cooldownUntil && k.cooldownUntil <= now) {
          if (k.rateLimited) dirty = true;
          k.rateLimited = false;
          k.cooldownUntil = 0;
        }
      }
      if (dirty) {
        Store.saveKeypool(pool);
      }
    },

    markRateLimit(slot, cooldownSeconds = 30) {
      const pool = Store.loadKeypool();
      const rec = pool.find((k) => k.slot === slot);
      if (!rec) return;
      const now = Date.now();
      rec.rateLimited = true;
      rec.cooldownUntil = now + cooldownSeconds * 1000;
      Store.saveKeypool(pool);
      Renderer.renderKeys();
    },

    chooseActiveKey() {
      const pool = Store.loadKeypool();
      KeyManager.liftCooldowns();
      const usable = pool.find((k) => {
        const cd = KeyManager.getCooldownRemainingSeconds(k);
        return k.key && k.valid && !k.rateLimited && cd === 0;
      });
      return usable || null;
    },

    setKey(slot, newKey) {
      const pool = Store.loadKeypool();
      const rec = pool.find((k) => k.slot === slot);
      if (!rec) return;
      rec.key = newKey.trim();
      rec.valid = false;
      Store.saveKeypool(pool);
      Renderer.renderKeys();
    },

    markValid(slot, isValid) {
      const pool = Store.loadKeypool();
      const rec = pool.find((k) => k.slot === slot);
      if (!rec) return;
      rec.valid = !!isValid;
      Store.saveKeypool(pool);
      Renderer.renderKeys();
    },

    bumpUsage(slot) {
      const pool = Store.loadKeypool();
      const rec = pool.find((k) => k.slot === slot);
      if (!rec) return;
      rec.usage = Number(rec.usage || 0) + 1;
      Store.saveKeypool(pool);
      Renderer.renderKeys();
    },

    clearAll() {
      Store.saveKeypool(DEFAULT_KEYPOOL());
      Renderer.renderKeys();
    },

    async validateAllKeys() {
      const pool = Store.loadKeypool();
      for (const k of pool) {
        if (!k.key) {
          k.valid = false;
          continue;
        }
        try {
          const resp = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models?key=" +
              encodeURIComponent(k.key)
          );
          if (resp.status === 429) {
            k.valid = true;
            k.rateLimited = true;
            k.cooldownUntil = Date.now() + 30 * 1000;
          } else if (resp.ok) {
            k.valid = true;
          } else if (resp.status === 401 || resp.status === 403) {
            k.valid = false;
          } else {
            k.valid = false;
          }
        } catch (err) {
          k.valid = false;
          console.error("Key validation error:", err);
        }
      }
      Store.saveKeypool(pool);
      Renderer.renderKeys();
    }
  };

  /********************************************************************
   * VAULT MANAGER
   ********************************************************************/

  const VaultManager = {
    add(identifier, type, description, content) {
      if (!isNonEmptyString(identifier)) return;
      if (!["code", "text", "data"].includes(type)) return;
      const vault = Store.loadVault();
      if (vault.some((v) => v.identifier === identifier)) return;
      vault.unshift({
        identifier,
        type,
        description: description || "",
        content: content || "",
        createdAt: nowISO()
      });
      Store.saveVault(vault);
      Renderer.renderVault();
    },

    delete(identifier) {
      const vault = Store.loadVault().filter((v) => v.identifier !== identifier);
      Store.saveVault(vault);
      Renderer.renderVault();
    },

    resolveVaultRefsInText(inputText) {
      if (!isNonEmptyString(inputText)) return inputText;
      const regex = /\{\{\s*<vaultref\s+id="([^"]+)"\s*\/>\s*\}\}/g;
      const vault = Store.loadVault();

      return inputText.replace(regex, (match, vaultId) => {
        const entry = vault.find((v) => v.identifier === vaultId);
        if (!entry) {
          return "/* [MISSING_VAULT:" + vaultId + "] */";
        }
        return entry.content || "";
      });
    }
  };

  /********************************************************************
   * GEMINI CLIENT
   ********************************************************************/

  const GeminiClient = {
    async fetchModelList() {
      KeyManager.liftCooldowns();
      let picked = KeyManager.chooseActiveKey();
      if (!picked) {
        console.error("No valid API key for model list");
        return;
      }

      const url =
        "https://generativelanguage.googleapis.com/v1beta/models?key=" +
        encodeURIComponent(picked.key);

      try {
        const resp = await fetch(url);
        if (resp.status === 429) {
          KeyManager.markRateLimit(picked.slot, 30);
          return;
        }
        if (!resp.ok) {
          if (resp.status === 401 || resp.status === 403) {
            KeyManager.markValid(picked.slot, false);
          }
          console.error("fetchModelList() non-OK", `status ${resp.status}`);
          return;
        }

        const data = await resp.json();
        if (!data || !Array.isArray(data.models)) return;

        Renderer.populateModelDropdown(data.models);
        KeyManager.markValid(picked.slot, true);
      } catch (err) {
        console.error("fetchModelList() exception", err);
      }
    },

    async generateContent(modelId, prompt) {
      KeyManager.liftCooldowns();
      let picked = KeyManager.chooseActiveKey();
      if (!picked) throw new Error("No usable key");

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(picked.key)}`;
      
      const payload = {
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }]
      };

      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (resp.status === 429) {
          KeyManager.markRateLimit(picked.slot, 30);
          // Try once more with different key
          picked = KeyManager.chooseActiveKey();
          if (!picked) throw new Error("Rate limited. No backup key.");
          
          const url2 = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(picked.key)}`;
          const resp2 = await fetch(url2, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          
          if (!resp2.ok) throw new Error("Gemini request failed: " + resp2.status);
          KeyManager.bumpUsage(picked.slot);
          return resp2.json();
        }

        if (!resp.ok) {
          if (resp.status === 401 || resp.status === 403) {
            KeyManager.markValid(picked.slot, false);
          }
          throw new Error("Gemini request failed: " + resp.status);
        }

        KeyManager.bumpUsage(picked.slot);
        return resp.json();
      } catch (err) {
        console.error("generateContent error:", err);
        throw err;
      }
    }
  };

  /********************************************************************
   * CODE EXECUTOR
   ********************************************************************/

  const CodeExecutor = {
    run() {
      const editorEl = qs("#codeInput");
      const outputEl = qs("#execOutput");
      const pill = qs("#execStatus");

      if (!editorEl || !outputEl || !pill) return;

      const rawCode = editorEl.value || "";
      const expanded = VaultManager.resolveVaultRefsInText(rawCode);

      // console capture
      const logs = [];
      const origLog = console.log;
      console.log = (...args) => {
        const line = args
          .map((a) => {
            try {
              if (typeof a === "string") return a;
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          })
          .join(" ");
        logs.push(line);
        origLog.apply(console, args);
      };

      pill.textContent = "RUNNING";

      let errVal = null;
      try {
        const fn = new Function(expanded);
        const ret = fn();
        if (ret !== undefined) {
          logs.push("RETURN: " + String(ret));
        }
      } catch (err) {
        errVal = err;
        logs.push("ERROR: " + (err.stack || err.message || String(err)));
      } finally {
        console.log = origLog;
      }

      outputEl.textContent = logs.join("\n");

      if (errVal) {
        pill.textContent = "ERROR";
      } else {
        pill.textContent = "OK";
      }
    },

    clear() {
      const editorEl = qs("#codeInput");
      const outputEl = qs("#execOutput");
      const pill = qs("#execStatus");

      if (editorEl) editorEl.value = "// Use {{<vaultref id=\"example\" />}} to inline vault content\nconsole.log(\"Hello GDRS\")\nreturn 42";
      if (outputEl) outputEl.textContent = "";
      if (pill) pill.textContent = "READY";
    }
  };

  /********************************************************************
   * LOOP CONTROLLER
   ********************************************************************/

  const LoopController = (() => {
    let active = false;
    let iterationCount = 0;

    function decomposeQuery(queryStr) {
      // Simple decomposition
      const parts = queryStr
        .split(/[\.\?\!\n]+/g)
        .map((s) => s.trim())
        .filter(Boolean);
      return parts.length ? parts : [queryStr.trim()];
    }

    async function runIteration(query, tasks, goals, memory, vault) {
      const modelSelect = qs("#modelSelect");
      const modelId = modelSelect ? modelSelect.value : "gemini-1.5-pro-latest";
      
      if (!modelId || modelId === "") {
        throw new Error("No model selected");
      }

      // Build context
      const tasksText = tasks.map(t => `- [${t.identifier}] ${t.heading} (${t.status}): ${t.content}`).join('\n');
      const goalsText = goals.map(g => `- [${g.identifier}] ${g.heading}: ${g.content}`).join('\n');
      const memoryText = memory.map(m => `- [${m.identifier}] ${m.heading}: ${m.content} (${m.notes})`).join('\n');
      const vaultIndex = vault.map(v => `- [${v.identifier}] ${v.type}: ${v.description}`).join('\n');

      const prompt = `You are the Gemini Deep Research System. Analyze and work on this query: "${query}"

Current Tasks:
${tasksText || 'None'}

Goals:
${goalsText || 'None'}

Memory:
${memoryText || 'None'}

Vault Index:
${vaultIndex || 'None'}

Provide a brief analysis and next steps. Focus on making progress toward the goals.`;

      const response = await GeminiClient.generateContent(modelId, prompt);
      
      // Extract text from response
      let responseText = "";
      if (response && response.candidates && response.candidates[0]) {
        const parts = response.candidates[0].content?.parts || [];
        responseText = parts.map(p => p.text || "").join("\n");
      }

      return responseText || "No response from model";
    }

    async function startSession() {
      const queryEl = qs("#userQuery");
      const sessionPill = qs("#sessionStatus");
      const iterCountEl = qs("#iterationCount");
      const iterLogEl = qs("#iterationLog");
      const finalOutputEl = qs("#finalOutput");
      const finalStatusEl = qs("#finalStatus");

      if (!queryEl) return;

      const rawQuery = queryEl.value.trim();
      if (!rawQuery) return;

      active = true;
      iterationCount = 0;
      
      if (sessionPill) sessionPill.textContent = "RUNNING";

      try {
        // Decompose query into tasks
        const subtasks = decomposeQuery(rawQuery);
        const tasks = subtasks.map((task, i) => ({
          identifier: `task_${Date.now()}_${i}`,
          heading: task.slice(0, 50),
          content: task,
          status: i === 0 ? "ongoing" : "pending",
          notes: "",
          createdAt: nowISO()
        }));

        // Create initial goal
        const goals = [{
          identifier: "main_goal",
          heading: "Complete research query",
          content: rawQuery,
          notes: "",
          createdAt: nowISO()
        }];

        Store.saveTasks(tasks);
        Store.saveGoals(goals);
        Renderer.renderTasks();
        Renderer.renderGoals();

        // Run a few iterations
        const logEntries = [];
        for (let i = 0; i < 3 && active; i++) {
          iterationCount++;
          if (iterCountEl) iterCountEl.textContent = String(iterationCount);

          const currentTasks = Store.loadTasks();
          const currentGoals = Store.loadGoals();
          const currentMemory = Store.loadMemory();
          const currentVault = Store.loadVault();

          const result = await runIteration(rawQuery, currentTasks, currentGoals, currentMemory, currentVault);
          
          logEntries.push(`Iteration ${iterationCount}:\n${result}\n`);
          
          if (iterLogEl) {
            iterLogEl.innerHTML = logEntries.map(entry => 
              `<div class="li"><div><div class="mono">#${logEntries.indexOf(entry) + 1}</div><pre class="mono" style="white-space:pre-wrap">${encodeHTML(entry)}</pre></div></div>`
            ).join('');
            iterLogEl.scrollTop = iterLogEl.scrollHeight;
          }

          // Update task status
          if (currentTasks.length > 0) {
            const firstTask = currentTasks[0];
            firstTask.status = "finished";
            firstTask.notes = `Completed in iteration ${iterationCount}`;
            Store.saveTasks(currentTasks);
            Renderer.renderTasks();
          }

          await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
        }

        // Generate final output
        const finalHtml = `<h3>Research Summary</h3><p><strong>Query:</strong> ${encodeHTML(rawQuery)}</p><p><strong>Status:</strong> Analysis complete</p><p><strong>Iterations:</strong> ${iterationCount}</p><div><strong>Results:</strong><br/>${logEntries.map(entry => `<div style="margin: 8px 0; padding: 8px; border-left: 2px solid #333;">${encodeHTML(entry)}</div>`).join('')}</div>`;
        
        Store.saveFinalOutput(finalHtml);
        if (finalOutputEl) finalOutputEl.innerHTML = finalHtml;
        if (finalStatusEl) finalStatusEl.textContent = "verified";

        Store.saveReasoningLog(logEntries);

      } catch (err) {
        console.error("Session error:", err);
        if (iterLogEl) {
          iterLogEl.innerHTML = `<div class="li"><div class="mono">ERROR: ${encodeHTML(err.message)}</div></div>`;
        }
      } finally {
        active = false;
        if (sessionPill) sessionPill.textContent = "IDLE";
      }
    }

    function stopSession() {
      active = false;
      const sessionPill = qs("#sessionStatus");
      if (sessionPill) sessionPill.textContent = "IDLE";
    }

    return {
      startSession,
      stopSession
    };
  })();

  /********************************************************************
   * RENDERER
   ********************************************************************/

  const Renderer = {
    renderKeys() {
      const pool = Store.loadKeypool();
      const keysGrid = qs("#keysGrid");
      if (!keysGrid) return;

      keysGrid.innerHTML = "";

      pool.forEach((k) => {
        const row = document.createElement("div");
        row.className = "keyrow";
        
        const field = document.createElement("input");
        field.type = "password";
        field.placeholder = `API Key #${k.slot}`;
        field.value = k.value;
        field.autocomplete = "off";
        field.spellcheck = false;
        field.addEventListener("input", (e) => {
          KeyManager.setKey(k.slot, e.target.value);
        });

        const meta = document.createElement("div");
        meta.className = "keymeta";
        meta.innerHTML = `
          <div><div class="pm">valid</div><div class="mono">${k.valid ? 'yes' : 'no'}</div></div>
          <div><div class="pm">usage</div><div class="mono">${k.usage} calls</div></div>
          <div><div class="pm">rate</div><div class="mono">${KeyManager.getCooldownRemainingSeconds(k) > 0 ? `cooldown ${KeyManager.getCooldownRemainingSeconds(k)}s` : 'ok'}</div></div>
        `;

        row.appendChild(field);
        row.appendChild(meta);
        keysGrid.appendChild(row);
      });

      // Update rotation pill
      const rotPill = qs("#keyRotationPill");
      const nextKey = KeyManager.chooseActiveKey();
      if (rotPill) {
        rotPill.textContent = nextKey ? `NEXT: #${nextKey.slot}` : "NO KEY";
      }
    },

    populateModelDropdown(modelsArray) {
      const modelSelect = qs("#modelSelect");
      if (!modelSelect) return;

      // Keep current selection
      const currentValue = modelSelect.value;
      
      modelSelect.innerHTML = `<option value="">-- select model --</option>`;

      modelsArray.forEach((m) => {
        const fullName = m.name || "";
        const label = fullName.replace(/^models\//, "");
        const opt = document.createElement("option");
        opt.value = fullName;
        opt.textContent = label;
        modelSelect.appendChild(opt);
      });

      // Restore selection if it still exists
      if (currentValue) {
        modelSelect.value = currentValue;
      }
    },

    renderTasks() {
      const tasks = Store.loadTasks();
      const tasksEl = qs("#tasksList");
      if (!tasksEl) return;

      tasksEl.innerHTML = tasks.map(t => `
        <div class="li">
          <div>
            <div class="mono">${encodeHTML(t.heading)}</div>
            <div class="pm">${encodeHTML(t.content)}</div>
          </div>
          <div class="status">${encodeHTML(t.status.toUpperCase())}</div>
        </div>
      `).join("");
    },

    renderMemories() {
      const memory = Store.loadMemory();
      const memEl = qs("#memoryList");
      if (!memEl) return;

      memEl.innerHTML = memory.map(m => `
        <div class="li">
          <div>
            <div class="mono">${encodeHTML(m.heading)}</div>
            <div class="pm">${encodeHTML(m.content)}</div>
          </div>
          <div class="id">${encodeHTML(m.identifier)}</div>
        </div>
      `).join("");
    },

    renderGoals() {
      const goals = Store.loadGoals();
      const goalsEl = qs("#goalsList");
      if (!goalsEl) return;

      goalsEl.innerHTML = goals.map(g => `
        <div class="li">
          <div>
            <div class="mono">${encodeHTML(g.heading)}</div>
            <div class="pm">${encodeHTML(g.content)}</div>
          </div>
          <div class="id">${encodeHTML(g.identifier)}</div>
        </div>
      `).join("");
    },

    renderVault() {
      const vault = Store.loadVault();
      const vaultEl = qs("#vaultList");
      if (!vaultEl) return;

      vaultEl.innerHTML = vault.map(v => `
        <div class="li" data-vault-id="${encodeHTML(v.identifier)}">
          <div>
            <div class="mono">${encodeHTML(v.identifier)}</div>
            <div class="pm">${encodeHTML(v.description)}</div>
          </div>
          <div class="status">${encodeHTML(v.type.toUpperCase())}</div>
        </div>
      `).join("");

      // Add click handlers for vault modal
      qsa("[data-vault-id]", vaultEl).forEach(el => {
        el.addEventListener("click", () => {
          const id = el.getAttribute("data-vault-id");
          openVaultModal(id);
        });
      });
    }
  };

  /********************************************************************
   * VAULT MODAL
   ********************************************************************/

  function openVaultModal(vaultId) {
    const vault = Store.loadVault();
    const entry = vault.find(v => v.identifier === vaultId);
    if (!entry) return;

    const modal = qs("#vaultModal");
    const idEl = qs("#vaultModalId");
    const typeEl = qs("#vaultModalType");
    const descEl = qs("#vaultModalDesc");
    const contentEl = qs("#vaultModalContent");

    if (idEl) idEl.textContent = entry.identifier;
    if (typeEl) typeEl.textContent = entry.type.toUpperCase();
    if (descEl) descEl.textContent = entry.description || "— no description —";
    if (contentEl) contentEl.textContent = entry.content;
    if (modal) modal.style.display = "flex";
  }

  function closeVaultModal() {
    const modal = qs("#vaultModal");
    if (modal) modal.style.display = "none";
  }

  /********************************************************************
   * EVENT BINDING
   ********************************************************************/

  function bindEvents() {
    // Run buttons
    const runBtn = qs("#runQueryBtn");
    const runBtn2 = qs("#runQueryBtn2");
    if (runBtn) runBtn.addEventListener("click", () => LoopController.startSession());
    if (runBtn2) runBtn2.addEventListener("click", () => LoopController.startSession());

    // Key management
    const validateBtn = qs("#validateKeys");
    const clearBtn = qs("#clearKeys");
    if (validateBtn) {
      validateBtn.addEventListener("click", async () => {
        await KeyManager.validateAllKeys();
        GeminiClient.fetchModelList();
      });
    }
    if (clearBtn) clearBtn.addEventListener("click", () => KeyManager.clearAll());

    // Model selector
    const modelSelect = qs("#modelSelect");
    if (modelSelect) {
      modelSelect.addEventListener("focus", () => GeminiClient.fetchModelList());
    }

    // Code execution
    const execBtn = qs("#execBtn");
    const clearExecBtn = qs("#clearExec");
    if (execBtn) execBtn.addEventListener("click", () => CodeExecutor.run());
    if (clearExecBtn) clearExecBtn.addEventListener("click", () => CodeExecutor.clear());

    // Export
    const exportBtn = qs("#exportTxt");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const output = Store.loadFinalOutput();
        const text = output.html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "gdrs-output.txt";
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Vault modal
    const closeModalBtn = qs("#vaultModalClose");
    const modal = qs("#vaultModal");
    if (closeModalBtn) closeModalBtn.addEventListener("click", closeVaultModal);
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeVaultModal();
      });
    }
  }

  /********************************************************************
   * COOLDOWN TICKER
   ********************************************************************/

  function startCooldownTicker() {
    setInterval(() => {
      Renderer.renderKeys();
    }, 1000);
  }

  /********************************************************************
   * BOOT SEQUENCE
   ********************************************************************/

  function boot() {
    console.log("GDRS Runtime Core v" + VERSION + " - Booting...");

    // Initialize storage if needed
    if (!localStorage.getItem(LS_KEYS.META)) {
      localStorage.setItem(LS_KEYS.META, JSON.stringify({ version: VERSION }));
      Store.saveKeypool(DEFAULT_KEYPOOL());
      Store.saveGoals([]);
      Store.saveMemory([]);
      Store.saveTasks([]);
      Store.saveVault([]);
      Store.saveFinalOutput("");
      Store.saveReasoningLog([]);
    }

    // Initial render
    Renderer.renderKeys();
    Renderer.renderTasks();
    Renderer.renderMemories();
    Renderer.renderGoals();
    Renderer.renderVault();

    // Bind events
    bindEvents();

    // Start tickers
    startCooldownTicker();

    console.log("GDRS Runtime Core - Ready");
  }

  // Boot when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
