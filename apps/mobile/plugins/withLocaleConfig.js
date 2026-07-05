const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withLocaleConfig(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    const activity = app?.activity?.find(
      (a) => a.$?.["android:name"] === ".MainActivity"
    );
    if (activity) {
      activity.$["android:localeConfig"] = "@xml/locale_config";
    }
    return config;
  });
};
