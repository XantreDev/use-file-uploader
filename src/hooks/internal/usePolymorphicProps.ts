import { useConstant } from "use-common-hook";
import { useFileUploaderContext } from "../../context";
import { ConnectToUploaderProps, UploaderProps } from "../../hookTypes";
import { useCreateStore } from "./useCreateStore";
import { useSymbol } from "./useSymbol";
import { useUploaderOptions } from "./useUploaderOptions";

export const usePolymorphicProps = <T>(
  rest:
    | Omit<ConnectToUploaderProps<T>, "initialData">
    | Omit<UploaderProps<T>, "initialData">
) => {
  const internalId = useSymbol("store id");
  const id = "storeId" in rest ? rest.storeId : internalId;

  const hasStoreId = "storeId" in rest;
  const forCreateOptions = useUploaderOptions(
    "options" in rest ? rest.options : {}
  );
  const fileUploader = useFileUploaderContext();

  const existedUploaderOptions = useConstant(() => fileUploader.getOptions(id));
  const options = existedUploaderOptions ?? forCreateOptions;

  const createStoreProps =
    "uploader" in rest
      ? ({
          enabled: true,
          ...rest,
          options,
          id,
        } as const)
      : ({ enabled: false } as const);

  useCreateStore(createStoreProps);

  return { options, id, hasStoreId } as const;
};
