import { useCallback, useLayoutEffect, useMemo } from "react";

import { useStateWithGetter } from "use-common-hook";
import { useFileUploaderContext } from "../context";
import {
  ConnectToUploaderProps,
  GetData,
  HookResult,
  UploaderProps,
} from "../hookTypes";
import { createChecker, transformToLoaded } from "../internalUtils";
import { ValueOfArray } from "../utilityTypes";
import { useGenerateExternalData } from "./internal/useGenerateExternalData";
import { useInputProps } from "./internal/useInputProps";
import { usePolymorphicProps } from "./internal/usePolymorphicProps";
import { useStoreOperations } from "./internal/useStoreOperations";
import { useSync } from "./internal/useSync";

type HookResultWithoutDrag<T> = Omit<
  HookResult<T>,
  "isDragging" | "isDraggingOverTargets" | "dragRef"
>;

/**
 *
 * @description Позволяет удобно загружать файлы
 */
export function useFileUploaderWithoutDrag<T>(
  props: UploaderProps<T>
): HookResultWithoutDrag<T>;
/**
 * @description Позволяет удобно загружать файлы
 * @property storeId Позволяет подключиться к стору
 * загрузки, созданному при помощи useProvideUploaderStore
 * storeId должен быть одинаковым при каждом рендере
 */
export function useFileUploaderWithoutDrag<T>(
  props: ConnectToUploaderProps<T>
): HookResultWithoutDrag<T>;
export function useFileUploaderWithoutDrag<T>({
  initialData,
  enabled: enabledProp,
  ...rest
}: ConnectToUploaderProps<T> | UploaderProps<T>) {
  const fileUploader = useFileUploaderContext();
  const { id, options, hasStoreId } = usePolymorphicProps(rest);
  const enabled = !!(enabledProp || enabledProp === undefined);

  type Data = GetData<T>;

  const {
    state: data,
    setter: setData,
    getter: getData,
  } = useStateWithGetter<Data>(() => transformToLoaded(initialData ?? []));

  const { enrichInternal, enrich } = useSync({
    getData,
    setData,
  });

  useLayoutEffect(() => {
    if (!hasStoreId) return;

    enrichInternal(fileUploader.readCache<ValueOfArray<Data>>(id) ?? []);

    return () => fileUploader.writeCache(id, getData());
  }, [enrichInternal, getData, hasStoreId, id]);

  const filesCountGetter = useCallback(() => getData().length, [getData]);
  const filesChecker = useMemo(
    () => createChecker(options)(filesCountGetter),
    [filesCountGetter, options]
  );
  const deleteItem = useCallback(
    (fileId: string) => () =>
      setData((currentData) =>
        currentData.filter((item) => item.id !== fileId)
      ),
    [setData]
  );

  const { loadFiles } = useStoreOperations({ id, setData });

  return {
    files: useGenerateExternalData({ data, deleteItem }),
    inputProps: useInputProps({
      filesChecker,
      loadFiles,
      options,
      enabled,
    }),
    enrich,
  };
}
