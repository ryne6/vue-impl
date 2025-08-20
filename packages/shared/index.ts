export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N
export * from './general'
export * from './isObject'