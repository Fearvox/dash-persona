import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @chenglou/pretext@0.0.2 ships raw .ts source files
  transpilePackages: ["@chenglou/pretext"],
  typescript: {
    // pretext uses .ts import extensions internally which fail tsc.
    // Our own code is checked via `npm run type-check` (tsconfig.check.json + stub).
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
