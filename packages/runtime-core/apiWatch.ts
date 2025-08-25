import { ReactiveEffect } from "../reactivity";
import { Ref, isRef } from "../reactivity";
import {
  hasChanged,
  isFunction,
  isMap,
  isObject,
  isPlainObject,
  isSet,
} from "../shared";

export type WatchEffect = (onCleanup: OnCleanup) => void;

export type WatchSource<T = any> = Ref<T> | (() => T);

type OnCleanup = (cleanupFn: () => void) => void;

interface WatchOptions {
  immediate?: boolean;
  deep?: boolean | number;
}

export function watch<T>(
  source: WatchSource<T> | WatchSource<T>[],
  cb: (newValue: T | T[], oldValue: T | T[]) => void,
  options?: WatchOptions
) {
  doWatch(source, cb, options);
}

export function watchEffect(source: WatchEffect) {
  doWatch(source, null)
}

function doWatch<T>(
  source: WatchSource<T> | WatchSource<T>[] | WatchEffect,
  cb: null | ((newValue: T | T[], oldValue: T | T[]) => void),
  options?: WatchOptions
) {
  const { immediate = false, deep = false } = options || {};
  let getter: () => any;
  let isMultiSource = false;
  if (isFunction(source)) {
    getter = source as () => any;
  } else if (isRef(source)) {
    getter = () => source.value;
  } else if (Array.isArray(source)) {
    isMultiSource = true;
    getter = () => {
      return source.map((s) => {
        if (isRef(s)) {
          return s.value;
        }
        return s();
      });
    };
  } else {
    getter = () => source;
  }

  if (deep) {
    const baseGetter = getter;
    getter = () => traverse(baseGetter());
  }

  const job = () => {
    const newValue = effect.run();
    if (
      isMultiSource
        ? (newValue as any[]).some((v, i) =>
            hasChanged(v, (oldValue as T[])?.[i])
          )
        : hasChanged(newValue, oldValue)
    ) {
      cb?.(newValue, oldValue);
      oldValue = newValue;
    }
  };
  const effect = new ReactiveEffect(getter, job);
  let oldValue: any;
  if (immediate) {
    job();
  } else {
    oldValue = effect.run();
  }
}

export function traverse(value: unknown, seen?: Set<unknown>) {
  if (!isObject(value)) return value;

  seen = seen || new Set();
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);
  if (isRef(value)) {
    traverse(value.value, seen);
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen);
    }
  } else if (isSet(value) || isMap(value)) {
    value.forEach((v: any) => {
      traverse(v, seen);
    });
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], seen);
    }
  }
  return value;
}
