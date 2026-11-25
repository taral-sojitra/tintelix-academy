import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@tintelix/content", "@tintelix/dsa", "@tintelix/schema", "@tintelix/sql", "@tintelix/stage", "@tintelix/store", "@tintelix/theme"],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default config;
