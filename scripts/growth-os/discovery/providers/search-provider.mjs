import { createConfiguredSearchProvider } from "./configured-search-provider.mjs";
import { createDisabledProvider } from "./disabled-provider.mjs";
import { createFileSearchProvider } from "./file-search-provider.mjs";

export function createSearchProvider(environment = process.env, fetchImpl = fetch) {
  return createConfiguredSearchProvider(environment, fetchImpl)
    || createFileSearchProvider(environment)
    || createDisabledProvider();
}
