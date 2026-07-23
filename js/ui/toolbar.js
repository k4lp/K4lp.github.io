/**
 * Toolbar button wiring helpers.
 */
(function (global) {
  "use strict";

  function setViewMode(mode) {
    const ws = document.getElementById("workspace");
    if (!ws) return;
    ws.classList.remove("mode-edit", "mode-preview", "mode-split");
    ws.classList.add("mode-" + mode);
    document.querySelectorAll("[data-view]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-view") === mode);
    });
  }

  function toggleSettings(open) {
    const ws = document.getElementById("workspace");
    if (!ws) return;
    if (typeof open === "boolean") {
      ws.classList.toggle("settings-open", open);
    } else {
      ws.classList.toggle("settings-open");
    }
    const btn = document.getElementById("btn-settings");
    if (btn) btn.classList.toggle("active", ws.classList.contains("settings-open"));
    return ws.classList.contains("settings-open");
  }

  function setZoom(scale) {
    const sheet = document.querySelector("#preview-canvas .paper-sheet");
    if (sheet) {
      sheet.style.transform = scale === 1 ? "" : "scale(" + scale + ")";
    }
    document.querySelectorAll("[data-zoom]").forEach((btn) => {
      const z = parseFloat(btn.getAttribute("data-zoom"));
      btn.classList.toggle("active", Math.abs(z - scale) < 0.01);
    });
    const label = document.getElementById("zoom-label");
    if (label) label.textContent = Math.round(scale * 100) + "%";
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove("hidden");
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add("hidden");
  }

  function populatePresetModal(activeId, onSelect) {
    const grid = document.getElementById("preset-grid");
    if (!grid) return;
    grid.innerHTML = "";
    PaperPDF.Presets.listPresets().forEach((p) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "preset-card" + (p.id === activeId ? " active" : "");
      card.innerHTML =
        '<span class="name">' +
        p.name +
        '</span><span class="desc">' +
        p.description +
        "</span>";
      card.addEventListener("click", () => {
        onSelect && onSelect(p.id);
        closeModal("modal-presets");
      });
      grid.appendChild(card);
    });
  }

  function updatePresetLabel(preset) {
    const el = document.getElementById("preset-label");
    if (el) el.textContent = preset.name;
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.Toolbar = {
    setViewMode,
    toggleSettings,
    setZoom,
    openModal,
    closeModal,
    populatePresetModal,
    updatePresetLabel,
  };
})(typeof window !== "undefined" ? window : globalThis);
