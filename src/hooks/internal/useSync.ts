import { useStableCallback } from "use-common-hook";
import { DataForSync, GetData, UseUploaderData } from "../../hookTypes";
import { transformToLoaded } from "../../internalUtils";
import { pipe, prop, uniqueForFirstSet, valuesOfSetEquals } from "../../utils";

export const useSync = <T>({
  getData,
  setData,
}: Omit<UseUploaderData<T>, "data">) => {
  type Data = GetData<T>;
  const enrichInternal = useStableCallback((dataForEnrich: Data) => {
    const files = getData();

    const extractId = prop("id");

    const [fileIds, enrichFileIds] = [
      new Set(files.map(extractId)),
      new Set(dataForEnrich.map(extractId)),
    ];

    if (valuesOfSetEquals(fileIds, enrichFileIds)) return;

    const idsWithNewInfo = uniqueForFirstSet(enrichFileIds, fileIds);

    const newData: Data = dataForEnrich.filter(
      pipe(extractId, (itemId) => idsWithNewInfo.has(itemId))
    );

    setData((currentFiles) => [...currentFiles, ...newData]);
  });

  const enrich = useStableCallback((filesForEnrich: DataForSync<T>[]) =>
    enrichInternal(transformToLoaded(filesForEnrich))
  );

  const sync = useStableCallback((filesForSync: DataForSync<T>[]) => {
    setData((currentData) => {
      currentData.forEach(
        (item) => item.status === "loading" && item.discard()
      );

      return transformToLoaded(filesForSync);
    });
  });

  return { enrichInternal, enrich, sync } as const;
};
