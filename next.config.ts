import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  devIndicators: false,
  htmlLimitedBots: /.*/,
  outputFileTracingRoot: process.cwd(),
};
export default config;
