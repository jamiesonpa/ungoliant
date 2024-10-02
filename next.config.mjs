/** @type {import('next').NextConfig} */
const nextConfig = {
    webpackDevMiddleware: (config) => {
      config.watchOptions = {
        ignored: /node_modules/, // This excludes node_modules from being watched
      };
      return config;
    },
  };
  
  export default nextConfig;