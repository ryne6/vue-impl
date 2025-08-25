export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N
export * from './general'
export const isFunction = (val: unknown): val is Function => typeof val === 'function'
export const hasChanged = (value: any, oldValue: any) => !Object.is(value, oldValue)