// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Keep Reanimated plugin; remove NativeWind
    // Reanimated plugin must be listed last
    plugins: ["react-native-reanimated/plugin"],
  };
};