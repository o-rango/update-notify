const {
  isCI,
  pingRegistry,
  semverCheck,
  getConfig,
  shouldCheckUpdates,
  notifyFlow
} = require('./helpers');

const updateNotify = function(options = {}) {
  // Never run on CI
  if (isCI()) return;
  if (!options.pkg.name || !options.pkg.version)
    throw new Error('pkg.name and pkg.version required');
  const { updateCheckInterval = 1000 * 60 * 60 * 24 } = options;
  const lastUpdateCheck = getConfig(options.pkg.name, 'lastUpdateCheck');
  const latestCachedVersion = getConfig(options.pkg.name, 'latest');
  const updateAvailable = getConfig(options.pkg.name, 'updateAvailable');

  if (!lastUpdateCheck && !latestCachedVersion && !updateAvailable)
    notifyFlow(options); // 1st Run
  if (!shouldCheckUpdates(lastUpdateCheck, updateCheckInterval)) return;
  if (semverCheck(options.pkg.version, latestCachedVersion)) {
    if (updateAvailable) {
      return {
        updateAvailable: updateAvailable,
        name: options.pkg.name,
        latest: latestCachedVersion,
        current: options.pkg.version
      };
    }
  } else {
    notifyFlow(options);
  }
};

module.exports = {
  updateNotify,
  pingRegistry
};
