// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Low-memory machines: METRO_MAX_WORKERS=2 caps the transform workers (one per CPU core by default),
// e.g. during the release build's JS bundling step. Unset, Metro's default applies.
if (process.env.METRO_MAX_WORKERS) {
	config.maxWorkers = Number(process.env.METRO_MAX_WORKERS);
}

module.exports = config;
