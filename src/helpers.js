'use strict';
const importLazy = require('import-lazy')(require);
const ciInfo = importLazy('ci-info');
const execa = importLazy('execa');
const semver = importLazy('semver');
const ConfigStore = importLazy('configstore');

/**
 *  @method isCI Check if is running on CI ENVIRONMENT
 * @returns {boolean} is CI or is not CI
 */
const isCI = function() {
  return ciInfo.isCI;
};

/**
 * @method pingRegistry
 * Check if there is connectivity with registry having short-circuit 5 seconds fail
 */
const pingRegistry = async function() {
  const timer = setTimeout(process.exit, 1000 * 5);
  const { failed } = await execa.command('npm ping', { detached: false });

  const exit = () => {
    clearTimeout(timer);
    return !failed;
  };

  return { isOnline: (await failed) ? failed : exit() };
};

/**
 * @method latestVersion checks latest version of pkg in registry.
 * @param {string} pkgName package name
 * @param {string} distTag type of tags to search against registry
 * @returns {Object} latest version of package in registry
 */
const latestVersion = async function(pkgName, distTag = 'latest') {
  try {
    const { stdout, stderr } = await execa.command(
      `npm info ${pkgName} dist-tags.${distTag}`,
      {
        detached: process.platform !== 'win32'
      }
    );
    if (stderr !== '') return;
    return await stdout;
  } catch (error) {
    return;
  }
};

/**
 * @method pkgSemver
 * @description compare if packages satisfies semver
 */
const semverCheck = function(currentVersion, latestVersion) {
  return semver.lt(currentVersion, latestVersion);
};

/**
 * @method setConfig runs configstore and save configuration
 * @param packageName Some name to say hello for.
 * @param params extra configuration to save.
 */
const setConfig = function(packageName, params = {}) {
  try {
    const result = new ConfigStore(`o-update-notify-${packageName}`);
    result.set(params);
    return result;
  } catch (error) {
    // Expecting error code EACCES or EPERM
    console.error(`
    ${error} , Looks like EACCES or EPERM error ocurred, Try running with %s or get access sudo permissions.
  `);
  }
};

/**
 * @method getConfig runs configstore and save configuration
 * @param packageName key to retrieve config.
 * @param config  value to be retrieved from the config.
 */
const getConfig = function(packageName, config = '') {
  const result = new ConfigStore(`o-update-notify-${packageName}`).get(config);
  return result;
};

/**
 * @method shouldCheckUpdates runs configstore and save configuration
 * @param lastUpdateCheck when notify-update was last checked
 * @param updateCheckInterval interval that configuration must be checked
 * @returns {boolean} if it should run or not
 */
const shouldCheckUpdates = function(lastUpdateCheck, updateCheckInterval) {
  if (!lastUpdateCheck) return false;
  return !(Date.now() - lastUpdateCheck < updateCheckInterval);
};

/**
 * @method notifyFlow workflow of check and save configuration
 * @param options options to be passed over the fn
 */
const notifyFlow = async function(options) {
  const { name, version } = options.pkg || {};
  const { distTag } = options.distTag || 'latest';
  const lVersion = await latestVersion(name, distTag);
  if (!lVersion) return;
  const updateResult = semverCheck(version, lVersion);
  setConfig(name, {
    updateAvailable: updateResult,
    latest: lVersion,
    current: version,
    lastUpdateCheck: Date.now()
  });
};

module.exports = {
  isCI,
  pingRegistry,
  latestVersion,
  semverCheck,
  setConfig,
  getConfig,
  shouldCheckUpdates,
  notifyFlow
};
