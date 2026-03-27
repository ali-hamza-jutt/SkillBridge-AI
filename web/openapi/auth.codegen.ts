import type { ConfigFile } from "@rtk-query/codegen-openapi";

const config: ConfigFile = {
  schemaFile: process.env.OPENAPI_SCHEMA_URL ?? "http://localhost:3001/api-json",
  apiFile: "./lib/api/emptyApi.ts",
  apiImport: "emptySplitApi",
  outputFile: "./lib/features/auth/generated/authApi.generated.ts",
  exportName: "authGeneratedApi",
  hooks: true,
  tag: true,
  filterEndpoints: [/auth/i, /users/i],
};

export default config;
