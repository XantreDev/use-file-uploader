import { FilesChecker, HasBaseData, InternalDataItem } from "./hookTypes";
import { Options } from "./types";
import { pick, pipe, prop } from "./utils";

export const createChecker =
  (options: Options) =>
  (totalFilesCountGetter: () => number): FilesChecker =>
  (filesList) => {
    const isExtensionRight =
      (extensions: Options["extensions"]) => (fileName: string) =>
        extensions !== null
          ? extensions?.some((extension) =>
              fileName.match(new RegExp(`\\.${extension}$`))
            )
          : true;

    const getRealOptions = () =>
      options.extensions?.map((extension) => extension.replace(".", "")) ??
      null;

    const extensionChecker = pipe(getRealOptions, isExtensionRight)();
    const weightChecker = (weight: number) => weight <= options.maxWeight;

    const files = Array.from(filesList);

    return (
      totalFilesCountGetter() + files.length <= options.filesCount &&
      files.map(prop("name")).every(extensionChecker) &&
      files.map(prop("size")).every(weightChecker)
    );
  };

const pickBaseData = pick(["id", "name", "size"]);

export const transformItemToLoaded = <T>(
  item: HasBaseData<T>
): InternalDataItem<T> => ({
  status: "loaded",
  data: item,
  ...pickBaseData(item),
});

export const transformToLoaded = <T>(
  data: HasBaseData<T>[]
): InternalDataItem<T>[] => data.map(transformItemToLoaded);
