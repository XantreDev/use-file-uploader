import { useLayoutEffect } from "react";

import { useStableCallback } from "use-common-hook";
import { useFileUploaderContext } from "../../context";
import { UseCreateStoreEnabledProps } from "../../hookTypes";
import { UploaderFunction } from "../../types";
import { identity, withRetryAsync } from "../../utils";
import { useSymbol } from "./useSymbol";
import { useUploaderOptions } from "./useUploaderOptions";

export function useCreateStore(
  props: ({ enabled: true } & UseCreateStoreEnabledProps) | { enabled: false }
) {
  const realOptions = useUploaderOptions(
    props.enabled ? props.options ?? {} : {}
  );

  const stableUploader = useStableCallback(
    props.enabled
      ? withRetryAsync(realOptions.retryCount)(props.uploader)
      : (identity as any)
  ) as UploaderFunction;
  const newId = useSymbol("store id");
  const id = props.enabled ? props.id : newId;

  const fileUploader = useFileUploaderContext();

  useLayoutEffect(() => {
    if (!props.enabled) {
      return;
    }

    return fileUploader.createStore({
      id,
      uploader: stableUploader,
      options: realOptions,
    });
  }, [id, props.enabled, realOptions, stableUploader]);
}
