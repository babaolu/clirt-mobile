/**
 * Config plugin: sign release builds with the upload keystore described by Gradle properties.
 * The properties live OUTSIDE the repo (e.g. ~/.gradle/gradle.properties), see README "Build the APK":
 *   CLIRT_UPLOAD_STORE_FILE, CLIRT_UPLOAD_STORE_PASSWORD, CLIRT_UPLOAD_KEY_ALIAS, CLIRT_UPLOAD_KEY_PASSWORD
 * Without them, release builds fall back to the debug key (and Gradle prints a warning).
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING = `
        release {
            if (project.hasProperty('CLIRT_UPLOAD_STORE_FILE')) {
                storeFile file(CLIRT_UPLOAD_STORE_FILE)
                storePassword CLIRT_UPLOAD_STORE_PASSWORD
                keyAlias CLIRT_UPLOAD_KEY_ALIAS
                keyPassword CLIRT_UPLOAD_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
	return withAppBuildGradle(config, (cfg) => {
		let src = cfg.modResults.contents;
		if (src.includes('CLIRT_UPLOAD_STORE_FILE')) return cfg;

		src = src.replace(/signingConfigs\s*\{/, (m) => m + RELEASE_SIGNING);

		const buildTypesAt = src.indexOf('buildTypes {');
		if (buildTypesAt === -1) throw new Error('withReleaseSigning: buildTypes block not found');
		const head = src.slice(0, buildTypesAt);
		let tail = src.slice(buildTypesAt);
		tail = tail.replace(
			/(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
			`$1if (!project.hasProperty('CLIRT_UPLOAD_STORE_FILE')) {
                logger.warn('CLIRT_UPLOAD_* Gradle properties not set: signing release with the debug key')
            }
            signingConfig project.hasProperty('CLIRT_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`
		);
		cfg.modResults.contents = head + tail;
		return cfg;
	});
};
