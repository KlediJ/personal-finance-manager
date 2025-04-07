/**
 * Environment configuration settings
 */
module.exports = {
  development: {
    dbName: 'finance_manager_dev.db',
    showDevTools: true,
    logLevel: 'verbose',
    port: 3002
  },
  production: {
    dbName: 'finance_manager.db',
    showDevTools: false,
    logLevel: 'error',
    port: 3002
  }
};
