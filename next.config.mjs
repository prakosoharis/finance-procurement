/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["xlsx-js-style"],
  webpack: (config, { isServer, webpack }) => {
    // pptxgenjs's browser bundle still references Node builtins (fs/https/etc.) behind a
    // runtime `typeof window` check that never executes client-side. Its own package.json
    // "browser" field maps them to false, but webpack treats "node:fs" as a URI *scheme*
    // (not a plain specifier), so plain resolve.alias/fallback never intercepts it —
    // strip the "node:" prefix first so the existing fallback stubs can take over.
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, https: false, http: false, path: false, os: false, express: false, "image-size": false };
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      }));
    }
    return config;
  },
};

export default nextConfig;
