/**
 * Vault summary provider
 */

export const vaultSummaryProvider = {
  id: 'vaultSummary',

  collect({ snapshot }) {
    return snapshot.vaultSummary || '';
  },

  format(summary) {
    return (summary || '').trim();
  }
};

export default vaultSummaryProvider;
