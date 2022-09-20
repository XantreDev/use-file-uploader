import { useMemo } from "react";

import { UseUploaderData } from "../../hookTypes";
import { omit, zip } from "../../utils";

export const useGenerateExternalData = <T>({
  data,
  deleteItem,
}: Pick<UseUploaderData<T>, "data"> &
  Record<"deleteItem", (fileId: string) => () => void>) => {
  const fileDeleteActions = useMemo(
    () =>
      data.map((item) => () => {
        deleteItem(item.id)();
        if (item.status === "loading") {
          item.discard();
        }
      }),
    [data, deleteItem]
  );

  return useMemo(
    () =>
      zip(fileDeleteActions, data).map(([deleteAction, itemData]) => ({
        remove: deleteAction,
        ...omit(["discard"])(itemData),
        data: "data" in itemData ? itemData.data : null,
      })),
    [data, fileDeleteActions]
  );
};
