import { useConstant } from "use-common-hook";
import { Options } from "../../types";

const DEFAULT_RETRY_COUNT = 3;

export const useUploaderOptions = (options?: Partial<Options>) =>
  useConstant<Options>(() => ({
    extensions: options?.extensions ?? null,
    filesCount: options?.filesCount ?? Infinity,
    retryCount: options?.retryCount ?? DEFAULT_RETRY_COUNT,
    maxWeight: options?.maxWeight ?? Infinity,
  }));
