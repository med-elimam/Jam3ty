import { defineConfig, InputTransformerFn } from "orval";
import path from "path";

const root = path.resolve(__dirname, "..", "..");
const apiClientReactSrc = path.resolve(root, "lib", "api-client-react", "src");
const apiZodSrc = path.resolve(root, "lib", "api-zod", "src");

// Our exports make assumptions about the title of the API being "Api" (i.e. generated output is `api.ts`).
const titleTransformer: InputTransformerFn = (config) => {
  config.info ??= {};
  config.info.title = "Api";

  return config;
};

const zodTransformer: InputTransformerFn = (config) => {
  titleTransformer(config);

  // The zod package is built for Node and does not include DOM's File type.
  // The upload route validates multipart files in api-server/src/lib/admin-upload.ts.
  const uploadPost = config.paths?.["/admin/uploads"]?.post;
  if (uploadPost) {
    delete uploadPost.requestBody;
  }

  return config;
};

export default defineConfig({
  "api-client-react": {
    input: {
      target: "./openapi.yaml",
      override: {
        transformer: titleTransformer,
      },
    },
    output: {
      workspace: apiClientReactSrc,
      target: "generated",
      client: "react-query",
      mode: "split",
      baseUrl: "/api",
      clean: true,
      prettier: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: path.resolve(apiClientReactSrc, "custom-fetch.ts"),
          name: "customFetch",
        },
      },
    },
  },
  zod: {
    input: {
      target: "./openapi.yaml",
      override: {
        transformer: zodTransformer,
      },
    },
    output: {
      workspace: apiZodSrc,
      client: "zod",
      target: "generated",
      mode: "split",
      clean: true,
      prettier: true,
      override: {
        zod: {
          // Force v3 output: orval's `getZodImportSource` always emits
          // `import { z as zod } from 'zod'` (never the `zod/v4` subpath), and
          // pnpm-workspace.yaml's catalog pins `zod: ^3.25.76`. Leaving this on
          // "auto" makes orval default to Zod 4 syntax (e.g. `zod.email()`,
          // unavailable on the plain v3 "zod" entrypoint) whenever it can't
          // parse the "catalog:" version string, breaking the build.
          version: 3,
          coerce: {
            query: ['boolean', 'number', 'string'],
            param: ['boolean', 'number', 'string'],
            body: ['bigint', 'date'],
            response: ['bigint', 'date'],
          },
        },
        useDates: true,
        useBigInt: true,
      },
    },
  },
});
