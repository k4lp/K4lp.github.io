import { Storage } from '../../storage/storage.js';
import { JSExecutor } from '../../execution/js-executor.js';
import { eventBus, Events } from '../../core/event-bus.js';
import { nowISO } from '../../core/utils.js';
import { TOOL_SUMMARY_BLUEPRINT } from '../../config/tool-usage-config.js';

export class ToolOperationContext {
  constructor({
    storage = Storage,
    eventBusInstance = eventBus,
    events = Events,
    jsExecutor = JSExecutor,
    clock = { nowISO },
    summaryBlueprint = TOOL_SUMMARY_BLUEPRINT
  } = {}) {
    this.storage = storage;
    this.eventBus = eventBusInstance;
    this.events = events;
    this.jsExecutor = jsExecutor;
    this.clock = clock;

    this.summary = createSummary(summaryBlueprint);
    this.summary._dirty = {
      vault: false,
      memory: false,
      tasks: false,
      goals: false
    };
    this.summary._snapshots = {
      vault: this.storage.loadVault(),
      memory: this.storage.loadMemory(),
      tasks: this.storage.loadTasks(),
      goals: this.storage.loadGoals()
    };
  }

  getSummary() {
    return this.summary;
  }

  markDirty(key) {
    if (this.summary._dirty[key] !== undefined) {
      this.summary._dirty[key] = true;
    }
  }

  getSnapshot(key) {
    return this.summary._snapshots[key];
  }

  commitDirtyEntities() {
    if (this.summary._dirty.vault) {
      this.storage.saveVault(this.summary._snapshots.vault);
      this.summary._dirty.vault = false;
    }
    if (this.summary._dirty.memory) {
      this.storage.saveMemory(this.summary._snapshots.memory);
      this.summary._dirty.memory = false;
    }
    if (this.summary._dirty.tasks) {
      this.storage.saveTasks(this.summary._snapshots.tasks);
      this.summary._dirty.tasks = false;
    }
    if (this.summary._dirty.goals) {
      this.storage.saveGoals(this.summary._snapshots.goals);
      this.summary._dirty.goals = false;
    }
  }

  finaliseDuration(startedAt) {
    this.summary.duration = Date.now() - startedAt;
  }

  logActivity(activity) {
    this.storage.appendToolActivity(activity);
  }

  recordError(error) {
    if (error) {
      this.summary.errors.push(error);
    }
  }

  now() {
    return typeof this.clock.nowISO === 'function'
      ? this.clock.nowISO()
      : nowISO();
  }

  emitUiRefresh() {
    this.eventBus.emit(this.events.UI_REFRESH_REQUEST);
  }
}

function createSummary(blueprint) {
  const summary = {};

  Object.keys(blueprint).forEach((key) => {
    const value = blueprint[key];
    if (Array.isArray(value)) {
      summary[key] = [];
    } else if (typeof value === 'object' && value !== null) {
      summary[key] = { ...value };
    } else {
      summary[key] = value;
    }
  });

  return summary;
}

export default ToolOperationContext;
