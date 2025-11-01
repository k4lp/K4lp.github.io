/**
 * User query provider
 */

export const userQueryProvider = {
  id: 'userQuery',

  collect({ query }) {
    return typeof query === 'string' ? query : '';
  },

  format(query) {
    return (query || '').trim();
  }
};

export default userQueryProvider;
