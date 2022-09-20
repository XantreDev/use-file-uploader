import { Context } from "react";
import { v4 as uuidv4 } from "uuid";

export const valuesOfSetEquals = (a: Set<unknown>, b: Set<unknown>) =>
  a.size === b.size && [...a].every((item) => b.has(item));
export const createRelatedAbortController = (...signals: AbortSignal[]) => {
  const abortController = new AbortController();

  signals.forEach((signal) =>
    signal.addEventListener(
      "abort",
      () => abortController.abort("parent signal is aborted"),
      {
        once: true,
        signal: abortController.signal,
      }
    )
  );

  return abortController;
};

export const uniqueForFirstSet = <T>(first: Set<T>, second: Set<T>) => {
  const uniqueForFirst = new Set<T>();
  first.forEach((item) => {
    if (!second.has(item)) {
      uniqueForFirst.add(item);
    }
  });

  return uniqueForFirst;
};

export const doFunc = <T>(callback: () => T) => callback();

export const isNotUndefined = <T>(item: T): item is Exclude<T, undefined> =>
  typeof item !== "undefined";

export const createGuid = () => uuidv4();

export const retryAsync = async <T>(
  times: number,
  action: () => Promise<T>
) => {
  for (let i = 0; i < times; i += 1) {
    try {
      return await action();
    } catch (err) {
      console.error(`Attempt ${i + 1} was failed`, err);
    }
  }

  return Promise.reject("all attempts failed");
};

type CallbackMustBeAsyncFunction = never;
type AsyncFunction<T> = T extends (...args: any) => Promise<any>
  ? T
  : CallbackMustBeAsyncFunction;

export const withRetryAsync =
  (times: number) =>
  <T>(callback: AsyncFunction<T>): T =>
    ((...args: any) => {
      const action = () => callback(...args);

      return retryAsync(times, action);
    }) as unknown as T;

export const identity = <T>(item: T) => item;

export const pipe =
  <Input extends ReadonlyArray<any>, Return1, Return2>(
    callback1: (...args: Input) => Return1,
    callback2: (item: Return1) => Return2
  ) =>
  (...items: Input) =>
    callback2(callback1(...items)) as Return2;

export const prop =
  <Key extends string | symbol>(key: Key) =>
  <T extends Record<Key, any>>(target: T) =>
    target[key];

export const omit =
  <Keys extends string | number | symbol>(omitKeys: ReadonlyArray<Keys>) =>
  <T extends Record<any, any>>(target: T) =>
    omitKeys.reduce(
      (accumulator, keyForDelete) => {
        delete accumulator[keyForDelete];

        return accumulator;
      },
      { ...target }
    ) as Omit<T, Keys>;

export const pick =
  <Keys extends string | number | symbol>(pickKeys: ReadonlyArray<Keys>) =>
  <T extends Record<Keys, any>>(target: T) =>
    pickKeys.reduce((accumulator, keyForAdd) => {
      accumulator[keyForAdd] = target[keyForAdd];

      return accumulator;
    }, {} as Pick<T, Keys>);

export const zip = <T, U>(first: T[], second: U[]) =>
  first.map((current, index) => [current, second[index]] as const);

export const renameContext = <T>(context: Context<T>, name: string) => {
  (context as any).displayName = `${name}`;
  (context as any).Provider.displayName = `${name}.Provider`;
  (context as any).Consumer.displayName = `${name}.Consumer`;

  return context;
};
