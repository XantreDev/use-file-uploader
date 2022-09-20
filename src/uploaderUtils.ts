import { useMemo } from "react";
import { useOnChangeDeep, usePreviousValue } from "use-common-hook";
import {
  createDefaultUploaderFunction,
  createUploaderFunction,
} from "./createUploaderFunction";
import { HasBaseData, HasGuid } from "./hookTypes";

const guidToId = <T>(item: HasGuid<T>) => ({ ...item, id: item.guid });

export const fileUploaderUtils = {
  useGuidToId: <Item>(items: HasGuid<Item>[]) =>
    useMemo(() => items.map(guidToId), [items]),
  guidToId,
  createUploader: createUploaderFunction,
  createDefaultUploader: createDefaultUploaderFunction,
  useEnrich: <T extends HasBaseData<unknown>>({
    enrich,
    items,
    comparer = Object.is,
  }: {
    enrich: (items: T[]) => void;
    items: T[];
    comparer?: (prev: T[], next: T[]) => boolean;
  }) =>
    useOnChangeDeep({
      deps: items,
      comparer,
      onChange: enrich,
    }),
  useSynchronizeOnItemsCountReduce: <T extends HasBaseData<unknown>>({
    items,
    sync,
  }: {
    sync: (items: T[]) => void;
    items: T[];
  }) => {
    const previousItems = usePreviousValue(items);

    if (!previousItems) return;
    if (previousItems.length <= items.length) return;

    sync(previousItems);
  },
} as const;
