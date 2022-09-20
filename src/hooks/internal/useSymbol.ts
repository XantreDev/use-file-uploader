import { useConstant } from "use-common-hook";

export const useSymbol = (description?: string) =>
  useConstant(() => Symbol(description));
