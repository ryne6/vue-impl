export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N
export * from './general'
export * from './isObject'
export const isFunction = (val: unknown): val is Function => typeof val === 'function'