export { createApp } from './runtime-dom/index';
export * from './runtime-core/index';
export * from './reactivity/index';

import { baseCompile } from './compiler-core'
import { InternalRenderFunction, registerRuntimeCompiler } from './runtime-core'
import * as runtimeDom from './runtime-dom'

function compileToFunction(template: string): InternalRenderFunction {
  const code = baseCompile(template)
  return new Function('vueImpl', code)(runtimeDom)
}

registerRuntimeCompiler(compileToFunction)