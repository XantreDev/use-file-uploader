import React, { useMemo } from "react";
import { useStableCallback } from "use-common-hook";

import { FilesChecker, LoadFiles } from "../../hookTypes";
import { Options } from "../../types";

export const useInputProps = ({
  loadFiles,
  filesChecker,
  options,
  enabled,
}: {
  filesChecker: FilesChecker;
  loadFiles: LoadFiles;
  options: Options;
  enabled: boolean;
}) => {
  const onChange = useStableCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files;
      if (!fileList) return;
      const files = Array.from(fileList);

      if (!filesChecker(fileList)) {
        event.target.value = "";

        return;
      }
      event.target.value = "";

      loadFiles(files);
    }
  );

  return useMemo(
    () => ({
      multiple: options.filesCount > 1,
      onChange,
      disabled: !enabled,
      ...(options.extensions
        ? {
            accept: options.extensions
              .map((extensionName: string) => `.${extensionName}`)
              .join(", "),
          }
        : {}),
    }),
    [enabled, onChange, options.extensions, options.filesCount]
  );
};
