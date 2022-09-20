import { Dispatch, SetStateAction } from "react";

export type ValueOfArray<T> = T extends Array<infer U>
  ? U
  : T extends ReadonlyArray<infer U>
  ? U
  : never;

export type Extends<Source, Target> = Source extends Target ? Source : never;

export type SetUseState<T> = Dispatch<SetStateAction<T>>;

export type Replace<
  Target extends Record<string, any>,
  Key extends keyof Target,
  To
> = Omit<Target, Key> & Record<Key, To>;

export type AnyFunction = (...args: any[]) => any;
