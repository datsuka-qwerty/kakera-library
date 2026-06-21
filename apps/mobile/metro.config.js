const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Required for Expo Router runtime (route normalization uses this value)
process.env.EXPO_ROUTER_APP_ROOT = './app';
process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
// EXPO_ROUTER_ABS_APP_ROOT is used by expo-router's Tutorial error screen
process.env.EXPO_ROUTER_ABS_APP_ROOT = path.resolve(__dirname, 'app').replace(/\\/g, '/');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// モノレポのルートを監視対象に追加
config.watchFolders = [workspaceRoot];

// node_modules の解決パスをルートと mobile 両方に設定
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Redirect expo-router/_ctx to our custom file that uses a relative path,
// avoiding issues with absolute Windows paths in Metro's require.context
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-router/_ctx') {
    return {
      filePath: path.resolve(__dirname, '_expo-router-ctx.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
