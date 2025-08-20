import { isObject } from '../shared/isObject'
import { mutableHandlers } from './baseHandler'
import { Dep } from './dep'
import { activeEffect, ReactiveEffect } from './effect'

export function reactive<T extends object>(target: T): T {
  const proxy = new Proxy(target, mutableHandlers)
  return proxy as T
}

export const toReactive = <T extends unknown>(value: T): T =>
  isObject(value) ? reactive(value) : value

export function trackEffects(dep: Dep) {
  if (activeEffect) {
    dep.add(activeEffect)
  }
}

export function triggerEffects(dep: Dep | ReactiveEffect[]) {
  const effects = Array.isArray(dep) ? dep : [...dep]
  for (const effect of effects) {
    triggerEffect(effect)
  }
}

export function triggerEffect(effect: ReactiveEffect) {
  if (effect.scheduler) {
    effect.scheduler()
  } else {
    effect.run()
  }
}