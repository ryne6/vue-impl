import { Dep, createDep } from './dep'

type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

export let activeEffect: ReactiveEffect | undefined

export type EffectScheduler = (...args: any[]) => any


export class ReactiveEffect<T = any> {

  // fn 指 updateComponent()
  constructor(public fn: () => T, public scheduler?: EffectScheduler | null) {}

  run() {
    /**
     * 时间线：
        1. effect.run() 调用
        2. activeEffect = this (设置为当前effect)
        3. this.fn() 开始执行 (updateComponent)
        4. componentRender() 执行 
        5. 访问 state.count
        6. 触发 Proxy get 拦截器
        7. 调用 track(target, 'count')
        8. 此时 activeEffect 有值
        9. dep.add(activeEffect) 执行
        10. componentRender() 执行完毕
        11. updateComponent() 执行完毕
        12. activeEffect = parent (恢复为undefined)
     */
    let parent: ReactiveEffect | undefined = activeEffect
    activeEffect = this
    const res = this.fn()
    activeEffect = parent
    return res
  }
}

// 收集
export function track(target: object, key: unknown) {
  // targetMap ->  depMap -> dep
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = createDep()))
  }
  

  if (activeEffect) {
    dep.add(activeEffect)
  }
}

// 执行
export function trigger(target: object, key?: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const dep = depsMap.get(key)

  if (dep) {
    const effects = [...dep]
    for (const effect of effects) {
      if (effect.scheduler) {
        effect.scheduler()
      } else {
        effect.run()
      }
    }
  }
}