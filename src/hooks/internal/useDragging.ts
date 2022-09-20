import { RefCallback, useCallback, useEffect, useState } from "react";

import { useActualRef, useConstant, useStableCallback } from "use-common-hook";
import { FilesChecker, LoadFiles } from "../../hookTypes";
import { SetUseState } from "../../utilityTypes";
import { pipe } from "../../utils";

export const useDragging = ({
  filesChecker,
  loadFiles,
  enabled,
}: {
  filesChecker: FilesChecker;
  loadFiles: LoadFiles;
  enabled: boolean;
}) => {
  const [isDragging, setIsDraggingOriginal] = useState(false);
  const [isDraggingOverTargets, setIsDraggingOverTargetsOriginal] =
    useState(false);

  const dragElements = useConstant(() => new Set<HTMLElement>());
  const enabledRef = useActualRef(enabled);

  const setIsDragging: SetUseState<boolean> = useCallback(
    (value) => (enabledRef.current ? setIsDraggingOriginal(value) : undefined),
    [enabledRef]
  );
  const setIsDraggingOverTargets: SetUseState<boolean> = useCallback(
    (value) =>
      enabledRef.current ? setIsDraggingOverTargetsOriginal(value) : undefined,
    [enabledRef]
  );

  const dragData = useConstant(() => ({
    checkDrag: filesChecker,
    isFilesRight: new WeakMap<FileList, boolean>(),
  }));

  const deleteFromSetIfUnused = useCallback(
    (node: HTMLElement) => (
      // eslint-disable-next-line no-sequences
      !node.isConnected && dragElements.delete(node), node
    ),
    [dragElements]
  );

  useEffect(() => {
    const abortController = new AbortController();

    const { signal } = abortController;

    const isFilesRight = (files: FileList) => {
      if (!dragData.isFilesRight.has(files)) {
        const isRight = dragData.checkDrag(files);
        dragData.isFilesRight.set(files, isRight);

        return isRight;
      }

      return !!dragData.isFilesRight.get(files);
    };

    const dragoverHandler = (event: DragEvent) => {
      const { dataTransfer } = event;
      const files = dataTransfer?.files;
      if (!files || !dataTransfer) return;

      let isDraggingOverOurElements = false;
      dragElements.forEach(
        pipe(deleteFromSetIfUnused, (element) => {
          if (!event.target) return;
          if (element.contains(event.target as any)) {
            isDraggingOverOurElements = true;
            dataTransfer.effectAllowed = "copy";
          }
        })
      );

      setIsDraggingOverTargets(isDraggingOverOurElements);

      if (!isDraggingOverOurElements) {
        dataTransfer.effectAllowed = "none";
      }
    };

    window.addEventListener(
      "dragover",
      (event: DragEvent) => {
        event.preventDefault();

        setIsDragging(true);
        dragoverHandler(event);
      },
      { signal }
    );

    const stopDrag = () => {
      setIsDragging(false);
      setIsDraggingOverTargets(false);
    };

    window.addEventListener("dragend", stopDrag, { signal });

    window.addEventListener(
      "dragleave",
      (e: DragEvent) => {
        e.preventDefault();

        if (!(e as any).fromElement) {
          stopDrag();
        }
      },
      { signal, capture: false }
    );

    window.addEventListener(
      "drop",
      (event) => {
        stopDrag();
        const files = event.dataTransfer?.files;
        if (!files) return;

        let draggingOver = false;

        dragElements.forEach(
          pipe(deleteFromSetIfUnused, (element) => {
            if (!event.target) return;
            if (element.contains(event.target as any)) {
              draggingOver = true;
            }
          })
        );

        if (!draggingOver) return;

        event.preventDefault();
        event.stopPropagation();

        const allowed = isFilesRight(files);
        if (!allowed) return;

        loadFiles(Array.from(files));
      },
      {
        signal,
      }
    );

    return () => abortController.abort();
  }, [
    deleteFromSetIfUnused,
    dragData,
    dragElements,
    loadFiles,
    setIsDragging,
    setIsDraggingOverTargets,
  ]);

  const dragRef = useStableCallback<RefCallback<HTMLElement>>((element) => {
    if (!element) return;
    dragElements.add(element);
  });

  return {
    dragRef,
    isDragging,
    isDraggingOverTargets,
  } as const;
};
