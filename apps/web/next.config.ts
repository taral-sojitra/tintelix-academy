import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@tintelix/content", "@tintelix/schema", "@tintelix/stage", "@tintelix/store", "@tintelix/theme"],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default config;
