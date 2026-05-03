/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  // Workspace packages publish raw .ts sources and use `.js` extensions in
  // their relative imports (ESM convention with verbatimModuleSyntax). Next
  // 15's webpack doesn't auto-strip; transpilePackages tells it to run them
  // through SWC, which handles the extension and JSX correctly.
  transpilePackages: [
    "@platform/db",
    "@platform/wallet",
    "@platform/gemini-gateway",
    "@platform/ui",
    "@platform/app-registry",
    "@platform/observability",
    "@platform/billing",
    "@platform-legacy/cinematic-ai-video-director",
  ],
  // Workspace packages use ESM-style `.js` extensions in their relative
  // imports (TypeScript verbatimModuleSyntax + Bundler resolution). Webpack
  // won't strip these; map them to .ts/.tsx so the workspace sources resolve.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
