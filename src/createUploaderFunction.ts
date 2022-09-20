import { BaseItemData } from "./hookTypes";
import {
  ApiFunctionType,
  MaybePromise,
  UploaderFunction,
  UploaderFunctionParams,
} from "./types";
import { Extends, Replace } from "./utilityTypes";
import { pipe } from "./utils";

type NecessarySignal = Record<"signal", AbortSignal>;

export const createUploaderFunction =
  <ApiResult, RealModel, Result extends object | undefined>(params: {
    apiFunction: ApiFunctionType<RealModel, ApiResult>;
    resultTransformer: (result: ApiResult) => MaybePromise<Result>;
    modelTransformer: (
      model: UploaderFunctionParams
    ) => MaybePromise<readonly [RealModel, RequestInit & NecessarySignal]>;
  }): UploaderFunction<Result> =>
  async (model) => {
    const transformModel = async (localModel: UploaderFunctionParams) => {
      const transformed = params.modelTransformer(localModel);

      return transformed && !!("then" in transformed)
        ? await transformed
        : transformed;
    };

    const transformResult = async (result: ApiResult): Promise<Result> => {
      const transformed = params.resultTransformer(result);

      return transformed && !!("then" in transformed)
        ? await transformed
        : transformed;
    };

    return await params
      .apiFunction(...(await transformModel(model)))
      .then(transformResult);
  };

const transformContentFromBlob = async (blob: Blob) =>
  Array.from(new Uint8Array(await blob.arrayBuffer())) as unknown as string;

type Model = {
  name: string;
  content: string;
  fileId: string;
  number: number;
  totalCountChunks: number;
};

export const mapUploaderParametersToDefaultModel = ({
  content,
  name,
  id,
  index,
  totalCount,
}: Replace<
  Omit<UploaderFunctionParams, "signal">,
  "content",
  string
>): Model => ({
  name,
  content,
  fileId: id,
  number: index + 1,
  totalCountChunks: totalCount,
});

export const createDefaultUploaderFunction = <
  ApiResult extends { data: any },
  Result extends BaseItemData | undefined,
  RealModel
>({
  resultTransformer,
  ...args
}:
  | {
      apiFunction: ApiFunctionType<Extends<RealModel, Model>, ApiResult>;
      editModel: (model: Model) => Extends<RealModel, Model>;
      resultTransformer: (result: ApiResult["data"]) => MaybePromise<Result>;
    }
  | {
      apiFunction: ApiFunctionType<Model, ApiResult>;
      editModel?: never;
      resultTransformer: (result: ApiResult["data"]) => MaybePromise<Result>;
    }) => {
  if (args.editModel) {
    return createUploaderFunction({
      apiFunction: args.apiFunction,
      modelTransformer: async ({ content, signal, ...rest }) => {
        const arrayContent = await transformContentFromBlob(content);

        const defaultModel = mapUploaderParametersToDefaultModel({
          ...rest,
          content: arrayContent,
        });

        return [args.editModel(defaultModel), { signal }] as const;
      },
      resultTransformer,
    });
  }

  return createUploaderFunction({
    apiFunction: args.apiFunction,
    modelTransformer: async ({ content, signal, ...rest }) => {
      const arrayContent = await transformContentFromBlob(content);

      const defaultModel = mapUploaderParametersToDefaultModel({
        ...rest,
        content: arrayContent,
      });

      return [defaultModel, { signal }] as const;
    },
    resultTransformer: pipe((result) => result.data, resultTransformer),
  });
};
