module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["transform-inline-environment-variables", { include: ["EXPO_ROUTER_APP_ROOT", "EXPO_ROUTER_IMPORT_MODE", "EXPO_ROUTER_ABS_APP_ROOT"] }],
      [
        "module-resolver",
        {
          alias: {
            "@kakera/shared": "../../packages/shared/src/index.ts",
            "@": "./",
          },
        },
      ],
    ],
  };
};
