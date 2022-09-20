import Deque from "double-ended-queue";

import {
  ExternalUploader,
  Fiber,
  Store,
  Uploader,
  WorkingFiber,
} from "./types";
import {
  createGuid,
  createRelatedAbortController,
  doFunc,
  isNotUndefined,
} from "./utils";

type Options = {
  /**
   * Target chunk size
   */
  chunkSize?: number;
  /**
   * Maximal count of concurrent connections
   */
  concurrentConnections?: number;
};

/**
 * @params options Uploader settings. Can be adjusted for best performance
 */
export const createUploaderStore = doFunc(() => {
  let isStoreCreated = false;

  return (options?: Options): ExternalUploader => {
    if (isStoreCreated) throw new Error("store can be created only once");

    isStoreCreated = true;
    const DEFAULT_CONSTANTS = doFunc(() => {
      const DEFAULT_CHUNK_SIZE = 1_024_000 / 2;

      const MAXIMUM_CONCURRENT_HTTP_CONNECTIONS = 6;
      const MAXIMUM_CONCURRENT_CONNECTIONS_FOR_FILE_UPLOADER =
        MAXIMUM_CONCURRENT_HTTP_CONNECTIONS - 2;

      return {
        CHUNK_SIZE: DEFAULT_CHUNK_SIZE,
        MAXIMUM_CONCURRENT_CONNECTIONS_FOR_FILE_UPLOADER,
      } as const;
    });

    const CONSTANTS: typeof DEFAULT_CONSTANTS = {
      CHUNK_SIZE: options?.chunkSize ?? DEFAULT_CONSTANTS.CHUNK_SIZE,
      MAXIMUM_CONCURRENT_CONNECTIONS_FOR_FILE_UPLOADER:
        options?.concurrentConnections ??
        DEFAULT_CONSTANTS?.MAXIMUM_CONCURRENT_CONNECTIONS_FOR_FILE_UPLOADER,
    };

    const { CHUNK_SIZE } = CONSTANTS;

    const uploadInternal: Uploader = {
      workingQueue: new Set(),
      queue: new Deque(),
      abortedFilesSignals: new WeakSet(),
      finalizeLoading(signal, fileData) {
        this.filesData.delete(signal);

        const { storeId } = fileData;

        const store = this.stores[storeId];
        if (!store) return;

        const fileModel = fileData.loadedChunks.find(isNotUndefined);

        const fileId = store.files.get(signal);
        if (!fileId) throw new Error("file with no id is loaded");

        if (!fileModel) {
          this.emitEvent(storeId, {
            status: "error",
            fileId,
            reason: "Model was not founded in results",
          });

          return;
        }

        this.emitEvent(storeId, {
          status: "success",
          fileId,
          data: fileModel,
        });

        store.files.delete(signal);
      },
      updateFileData(data, signal) {
        const fileData = this.filesData.get(signal);

        if (!fileData) throw new Error("Chunk is loaded detached from file");

        fileData.loadedChunks.push(data);

        if (fileData.loadedChunks.length < fileData.totalChunks) {
          return;
        }
        this.finalizeLoading(signal, fileData);
      },
      startNextTask(finishedTask) {
        if (finishedTask) {
          this.workingQueue.delete(finishedTask.fiber);
          this.updateFileData(
            finishedTask.result,
            finishedTask.fiber.fileSignal
          );
        }

        while (
          this.workingQueue.size <
            CONSTANTS.MAXIMUM_CONCURRENT_CONNECTIONS_FOR_FILE_UPLOADER &&
          this.queue.length
        ) {
          const fiber = this.queue.shift();

          if (!fiber) return;

          if (this.abortedFilesSignals.has(fiber.fileSignal)) {
            continue;
          }

          // Создаем замыкание, чтобы при вызове then ссылаться
          // на нужный WorkingFiber
          const workingFiber: WorkingFiber = doFunc(() => {
            const newFiber: WorkingFiber = {
              fileSignal: fiber.fileSignal,
              work: fiber
                .task()
                .then((result) => ({ result, fiber: newFiber }))
                .then((result) => this.startNextTask(result))
                .catch(() => this.workingQueue.delete(newFiber)),
            };

            return newFiber;
          });

          this.workingQueue.add(workingFiber);
        }
      },
      stores: {},
      filesData: new Map(),
      notifySubscribers(storeId) {
        const store = this.getStore(storeId);
        if (!store.subscribers.size) return;

        const events = store.unlistenedEvents;
        store.unlistenedEvents = [];
        events.forEach((event) =>
          store.subscribers.forEach((notify) => notify(event))
        );
      },
      load(storeId, file) {
        const store = this.getStore(storeId);

        const fileId = createGuid();
        const totalChunksCount = Math.ceil(file.size / CHUNK_SIZE);

        const { uploader, signal: storeSignal } = store;
        const fileAbortController = createRelatedAbortController(storeSignal);
        const fileSignal = fileAbortController.signal;
        const fileAbort = () =>
          fileAbortController.abort("file loading discarded");

        const addFibersToQueue = () => {
          const chunks = Array.from({ length: totalChunksCount }, (__, index) =>
            file.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
          );

          const tasks = chunks.map(
            (blob, index) => () =>
              uploader({
                index,
                content: blob,
                id: fileId,
                totalCount: chunks.length,
                signal: fileSignal,
                name: file.name,
              }).catch(fileAbort)
          );

          const fibers = tasks.map<Fiber>((task) => ({
            task,
            fileSignal,
          }));

          this.queue.push(...fibers);
        };

        const manageAborts = () => {
          fileSignal.addEventListener(
            "abort",
            (event) => {
              this.abortedFilesSignals.add(fileSignal);
              this.emitEvent(storeId, {
                status: "error",
                fileId,
                reason: ["Cannot load file", event] as const,
              });
            },
            {
              once: true,
            }
          );
        };

        addFibersToQueue();
        manageAborts();

        store.files.set(fileSignal, fileId);
        this.filesData.set(fileSignal, {
          storeId,
          loadedChunks: [],
          totalChunks: totalChunksCount,
        });

        this.startNextTask(null);

        return { id: fileId, abortLoad: fileAbort };
      },
      createStore({ id: storeId, uploader, options }) {
        const aborter = new AbortController();
        if (this.stores[storeId]) {
          throw new Error(`store with ${storeId.toString()} already exist`);
        }

        const store: Store = {
          signal: aborter.signal,
          files: new Map(),
          uploader,
          subscribers: new Set(),
          unlistenedEvents: [],
          options,
          cache: null,
        };

        this.stores[storeId] = store;

        aborter.signal.addEventListener(
          "abort",
          () => {
            delete this.stores[storeId];
          },
          { once: true }
        );

        return () => aborter.abort();
      },
      subscribe(storeId, callback) {
        this.getStore(storeId).subscribers.add(callback);
        this.notifySubscribers(storeId);

        return () => this.stores[storeId]?.subscribers?.delete?.(callback);
      },
      getStore(id) {
        const store = this.stores[id];

        if (!store) {
          throw new Error("store should exist but does not");
        }

        return store;
      },
      getOptions(storeId) {
        return this.stores?.[storeId]?.options;
      },
      emitEvent(storeId, event) {
        if (this.stores[storeId]?.unlistenedEvents?.push(event)) {
          this.notifySubscribers(storeId);
        }
      },
      readCache(storeId) {
        return this.stores?.[storeId]?.cache;
      },
      writeCache(storeId, data) {
        const store = this.stores?.[storeId];
        if (!store) return;

        store.cache = data;
      },
    };

    return uploadInternal;
  };
});
