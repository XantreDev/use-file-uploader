import { UseStateWithGetterResult } from "use-common-hook";
import { Options, UploaderFunction } from "./types";

export type BaseItemData = Record<"id" | "name", string> &
  Record<"size", number>;

export type HasBaseData<T> = T & BaseItemData;
export type HasGuid<T> = T & { guid: string };

export type OptionsProp = Partial<Record<"options", Partial<Options>>>;

type HookSimilarProps<Result> = {
  initialData?: HasBaseData<Result>[];
  enabled?: boolean;
};

export type UploaderProps<Result> = {
  uploader: UploaderFunction<Result>;
} & OptionsProp &
  HookSimilarProps<Result>;

export type ConnectToUploaderProps<Result> = {
  initialData?: HasBaseData<Result>[];
  storeId: symbol;
} & HookSimilarProps<Result>;

export type InternalDataItem<T> = BaseItemData &
  (
    | {
        status: "loading";
        discard: () => void;
      }
    | {
        status: "error";
      }
    | {
        status: "loaded";
        data: HasBaseData<T>;
      }
  );

export type UseUploaderData<T> = {
  data: UseStateWithGetterResult<InternalDataItem<T>[]>["state"];
  setData: UseStateWithGetterResult<InternalDataItem<T>[]>["setter"];
  getData: UseStateWithGetterResult<InternalDataItem<T>[]>["getter"];
};

export type GetData<T> = InternalDataItem<T>[];

export type DataForSync<T> = Extract<
  InternalDataItem<T>,
  { status: "loaded" }
>["data"];

export type HookResult<T> = {
  readonly dragRef: React.RefCallback<HTMLElement>;
  readonly files: {
    id: string;
    status: "loading" | "error" | "loaded";
    name: string;
    size: number;
    remove: null | (() => void);
    data: HasBaseData<T> | null;
  }[];
  readonly inputProps: Pick<
    React.ComponentPropsWithoutRef<"input">,
    "accept" | "onChange" | "multiple" | "disabled"
  >;
  readonly enrich: (filesForEnrich: DataForSync<T>[]) => void;
} & Readonly<Record<"isDragging" | "isDraggingOverTargets", boolean>>;

export type LoadFiles = (files: File[]) => void;
export type FilesChecker = (files: FileList) => boolean;

export type UseProvideUploaderStore<T> = Omit<UploaderProps<T>, "initialData">;
export type UseCreateStoreEnabledProps = {
  id: symbol;
  options?: Partial<Options>;
  uploader: UploaderFunction;
};
