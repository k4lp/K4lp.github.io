function detectVaultAction(op) {
  if (op.delete) return 'delete';
  if (op.action === 'request_read') return 'read';
  if (op.id && op.content !== undefined) return 'upsert';
  return 'unknown';
}

function deleteVaultEntry(vault, op) {
  const index = vault.findIndex((entry) => entry.identifier === op.id);
  if (index === -1) {
    throw new Error(`Vault entry not found: ${op.id}`);
  }
  vault.splice(index, 1);
}

function upsertVaultEntry(context, vault, op) {
  const existing = vault.find((entry) => entry.identifier === op.id);
  const payload = {
    identifier: op.id,
    type: (op.type || (existing ? existing.type : 'text')).toLowerCase(),
    description: op.description || (existing ? existing.description : ''),
    content: op.content,
    createdAt: existing?.createdAt || context.now(),
    updatedAt: context.now()
  };

  if (existing) {
    Object.assign(existing, payload);
    context.logActivity({
      type: 'vault',
      action: 'update',
      id: op.id,
      status: 'success',
      dataType: payload.type,
      dataSize: String(op.content).length
    });
  } else {
    vault.push(payload);
    context.logActivity({
      type: 'vault',
      action: 'create',
      id: op.id,
      status: 'success',
      dataType: payload.type,
      dataSize: String(op.content).length
    });
  }
}

function handleVaultRead(context, op, vaultSnapshot, summary) {
  const entry = vaultSnapshot.find((item) => item.identifier === op.id);
  if (!entry) {
    context.logActivity({
      type: 'vault',
      action: 'read',
      id: op.id,
      status: 'error',
      error: 'Vault entry not found'
    });
    context.recordError({
      type: 'vault',
      id: op.id || 'unknown',
      message: `Vault entry not found: ${op.id}`
    });
    return;
  }

  const limit = op.limit === 'full-length' ? entry.content.length : parseInt(op.limit || '0', 10);
  const content = Number.isFinite(limit) && limit > 0
    ? entry.content.slice(0, limit)
    : entry.content;

  const reasoningLog = context.storage.loadReasoningLog();
  reasoningLog.push([
    '=== VAULT READ ===',
    `Entry: ${op.id}`,
    `Limit: ${op.limit || 'none'}`,
    `Content:\n${content}`
  ].join('\n'));
  context.storage.saveReasoningLog(reasoningLog);

  context.logActivity({
    type: 'vault',
    action: 'read',
    id: op.id,
    status: 'success',
    dataSize: content.length,
    limit: op.limit || 'none'
  });
}

export const vaultProcessor = {
  id: 'vault',
  async process(context, operations = []) {
    if (!Array.isArray(operations) || operations.length === 0) return;

    const summary = context.getSummary();
    const vaultSnapshot = context.getSnapshot('vault');

    for (const op of operations) {
      const result = { id: op?.id, action: detectVaultAction(op), status: 'success' };

      try {
        if (op.delete) {
          deleteVaultEntry(vaultSnapshot, op);
          context.markDirty('vault');
          context.logActivity({
            type: 'vault',
            action: 'delete',
            id: op.id,
            status: 'success'
          });
        } else if (op.action === 'request_read') {
          handleVaultRead(context, op, vaultSnapshot, summary);
        } else if (op.id && op.content !== undefined) {
          upsertVaultEntry(context, vaultSnapshot, op);
          context.markDirty('vault');
        } else {
          throw new Error('Unsupported vault operation');
        }
      } catch (error) {
        result.status = 'error';
        result.error = error.message;
        context.recordError({
          type: 'vault',
          id: op?.id || 'unknown',
          message: error.message
        });
      }

      summary.vault.push(result);
    }
  }
};

export default vaultProcessor;
