import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  devIndicators: false,
  htmlLimitedBots: /.*/,
  outputFileTracingRoot: process.cwd(),
  redirects() {
    return ["/dashboard", "/modules/home/overview", "/modules/home"].map(
      (source) => ({ source, destination: "/", permanent: false }),
    );
  },
};
export default config;
