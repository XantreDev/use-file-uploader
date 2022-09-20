import { UseProvideUploaderStore } from "../hookTypes";
import { useCreateStore } from "./internal/useCreateStore";
import { useSymbol } from "./internal/useSymbol";

/**
 * @description Из-за уничтожения стора при размонтировании компонента
 * данные теряются. Данный хук позволяет создать стор в родительском компоненте
 * после чего подсоединиться к нему при помощи параметра storeId в useFileUploader
 */
export const useProvideUploaderStore = <T>({
  uploader,
  options,
}: UseProvideUploaderStore<T>) => {
  const id = useSymbol("store id");

  useCreateStore({ enabled: true, id, uploader, options });

  return { storeId: id } as const;
};
