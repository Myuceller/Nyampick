/** @type {import('expo/config').ConfigContext} */
const { createRunOncePlugin } = require('expo/config-plugins');

// Expo auto-applies the Apple authentication plugin whenever the package is
// installed. Mark that plugin as handled with a no-op until the release flag
// is enabled so Personal Team builds do not receive its entitlement.
const withDormantAppleAuth = createRunOncePlugin(
  (config) => config,
  'expo-apple-authentication',
  'dormant'
);

module.exports = ({ config }) => {
  const isPersonalDeviceBuild = process.env.APP_VARIANT === 'development';
  const isAppleAuthEnabled = process.env.EXPO_PUBLIC_ENABLE_APPLE_AUTH === 'true';
  const pluginsWithoutApple = (config.plugins ?? []).filter((plugin) => (
    plugin !== 'expo-apple-authentication' &&
    (!Array.isArray(plugin) || plugin[0] !== 'expo-apple-authentication')
  ));
  const configuredApp = {
    ...config,
    ios: {
      ...config.ios,
      usesAppleSignIn: isAppleAuthEnabled,
    },
    plugins: isAppleAuthEnabled
      ? [...pluginsWithoutApple, 'expo-apple-authentication']
      : [...pluginsWithoutApple, withDormantAppleAuth],
  };

  if (!isPersonalDeviceBuild) {
    return configuredApp;
  }

  return {
    ...configuredApp,
    name: '냠픽 개발',
    ios: {
      ...configuredApp.ios,
      infoPlist: {
        ...configuredApp.ios?.infoPlist,
        // ASWebAuthenticationSession uses CFBundleName in its system-owned
        // sign-in disclosure. Without this, a Personal Team build exposes
        // Xcode's default target name ("app") instead of Nyampick.
        CFBundleName: '냠픽 개발',
      },
      // The production identifier remains kr.nyampick.app. This identifier is
      // only used for a free Xcode Personal Team build on a connected device.
      bundleIdentifier: 'kr.nyampick.app.dev',
    },
  };
};
