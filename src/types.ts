import Deque from "double-ended-queue";

type DeleteStore = () => void;
type Unsubscribe = () => void;

type Id = string;

export type UploaderFunctionParams = {
  content: Blob;
  index: number;
  totalCount: number;
  id: string;
  signal: AbortSignal;
  name: string;
};

export type UploaderFunction<Result = unknown> = (
  data: UploaderFunctionParams
) => Promise<Result | undefined>;

interface DefaultFiber {
  fileSignal: AbortSignal;
}

export interface Fiber extends DefaultFiber {
  task: () => Promise<any>;
}

export interface WorkingFiber extends DefaultFiber {
  work: Promise<any>;
}

type UploaderEvent = {
  fileId: string;
} & (
  | {
      status: "error";
      reason:
        | "Model was not founded in results"
        | readonly ["Cannot load file", Event];
    }
  | {
      status: "success";
      data: unknown;
    }
);

type AllExtensions = null;

export type Options = {
  /**
   * Max files count
   */
  filesCount: number;
  /**
   * Extensions, like accept attribute and input receive or null if need
   * to receive all extensions
   */
  extensions: string[] | AllExtensions;
  retryCount: number;
  maxWeight: number;
};

export type Store = {
  signal: AbortSignal;
  files: Map<AbortSignal, Id>;
  uploader: UploaderFunction;
  subscribers: Set<(event: UploaderEvent) => void>;
  unlistenedEvents: UploaderEvent[];

  options: Options;
  cache: any;
};

type FileData = {
  storeId: symbol;
  totalChunks: number;
  loadedChunks: unknown[];
};

export type Uploader = {
  queue: Deque<Fiber>;
  workingQueue: Set<WorkingFiber>;
  startNextTask: (
    finishedTask: { fiber: WorkingFiber; result: unknown } | null
  ) => void;
  stores: Record<symbol, Store | undefined>;
  filesData: Map<AbortSignal, FileData>;
  abortedFilesSignals: WeakSet<AbortSignal>;
  updateFileData: (data: unknown, signal: AbortSignal) => void;
  load: (storeId: symbol, file: File) => { id: Id; abortLoad: () => void };
  createStore: (args: {
    id: symbol;
    uploader: UploaderFunction;
    options: Options;
  }) => DeleteStore;
  subscribe: (
    storeId: symbol,
    callback: (changes: UploaderEvent) => void
  ) => Unsubscribe;
  getOptions: (storeId: symbol) => Options | undefined;
  notifySubscribers(storeId: symbol): void;
  getStore(id: symbol): Store;
  emitEvent(storeId: symbol, event: UploaderEvent): void;
  finalizeLoading(signal: AbortSignal, fileData: FileData): void;
  readCache<T>(storeId: symbol): T[] | undefined;
  writeCache(storeId: symbol, data: any): void;
};

export type ExternalUploader = Pick<
  Uploader,
  | "createStore"
  | "subscribe"
  | "load"
  | "getOptions"
  | "writeCache"
  | "readCache"
>;

export type ApiFunctionType<Model, Result> = (
  model: Model,
  init?: RequestInit
) => Promise<Result>;

export type MaybePromise<T> = Promise<T> | T;
