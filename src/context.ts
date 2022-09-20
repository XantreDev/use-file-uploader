import { createContext, useContext } from "react";
import { ExternalUploader } from "./types";
import { renameContext } from "./utils";

const FileUploaderContext = renameContext(
  createContext(undefined as ExternalUploader | undefined),
  "FileUploaderContext"
);

export const useFileUploaderContext = () => {
  const contextValue = useContext(FileUploaderContext);

  if (!contextValue) {
    throw new Error(
      "you should to wrap an application with file uploader provider"
    );
  }

  return contextValue;
};

(FileUploaderContext.Provider as any).displayName = "UploaderProvider";

/**
 * @example
 * import { createUploaderStore, UploaderProvider } from 'use-file-uploader'
 *
 * const fileUploaderStore = createUploaderStore()
 *
 * const App = ({children}: React.PropsWithChildren<unknown>) => (
 *    <UploaderProvider value={fileUploaderStore}>
 *      {children}
 *    </UploaderProvider>)
 */
export const UploaderProvider = FileUploaderContext.Provider;
