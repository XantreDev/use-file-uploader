import { useCallback, useLayoutEffect } from "react";
import { useFileUploaderContext } from "../../context";

import {
  GetData,
  HasBaseData,
  LoadFiles,
  UseUploaderData,
} from "../../hookTypes";

export const useStoreOperations = <T>({
  id,
  setData,
}: Pick<UseUploaderData<T>, "setData"> & Record<"id", symbol>) => {
  type Data = GetData<T>;
  const fileUploader = useFileUploaderContext();

  useLayoutEffect(
    () =>
      fileUploader.subscribe(id, (event) => {
        if (event.status === "error") {
          setData((currentData) =>
            currentData.map((item) =>
              item.status === "loading" && item.id === event.fileId
                ? {
                    status: "error",
                    id: item.id,
                    name: item.name,
                    size: item.size,
                  }
                : item
            )
          );

          return;
        }

        setData((currentData) =>
          currentData.map((item) =>
            item.status === "loading" && item.id === event.fileId
              ? {
                  status: "loaded",
                  data: event.data as HasBaseData<T>,
                  id: (event.data as HasBaseData<T>).id,
                  name: (event.data as HasBaseData<T>).name,
                  size: (event.data as HasBaseData<T>).size,
                }
              : item
          )
        );
      }),
    [id, setData]
  );

  const loadFiles = useCallback<LoadFiles>(
    (files: File[]) => {
      const loadingFilesData = files.map((file) => ({
        ...fileUploader.load(id, file),
        name: file.name,
        size: file.size,
      }));
      const newData: Data = loadingFilesData.map(
        ({ id: fileId, abortLoad, name, size }) => ({
          status: "loading",
          id: fileId,
          discard: abortLoad,
          name,
          size,
        })
      );

      setData((currentData) => [...currentData, ...newData]);
    },
    [id, setData]
  );

  return { loadFiles };
};
