/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode — it double-mounts providers which causes
  // WalletConnect Core to initialize multiple times and throw warnings.
  reactStrictMode: false,

  webpack: (config) => {
    // WalletConnect's @walletconnect/keyvaluestorage tries to import
    // @react-native-async-storage/async-storage (a React Native package).
    // In a browser/Next.js context this module doesn't exist.
    // Alias it to false so webpack provides an empty module instead.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };

    // Also handle the case where it's referenced outside of fallback
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
    };

    return config;
  },
};

module.exports = nextConfig;
