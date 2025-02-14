/** @type {import('next').NextConfig} */
module.exports = {
  webpack: (config, { isServer }) => {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    config.resolve.extensions.push(".ts", ".tsx");
    return config;
  },
};
