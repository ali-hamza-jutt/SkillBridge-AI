import type { ConfigFile } from "@rtk-query/codegen-openapi";

const config: ConfigFile = {
  schemaFile: process.env.OPENAPI_SCHEMA_URL ?? "http://localhost:3001/api-json",
  apiFile: "../lib/api/emptyApi.ts",
  apiImport: "emptySplitApi",
  outputFile: "../lib/api/apiHooks.ts",
  exportName: "apiHooks",
  hooks: true,
  tag: false,
};

export default config;
