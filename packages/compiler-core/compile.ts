import { generate } from './codegen'
import { CompilerOptions } from './options'
import { baseParse } from './parse'

export function baseCompile(template: string, options: Required<CompilerOptions>) {
  const parseResult = baseParse(template.trim())
  const code = generate({ children: parseResult.children }, options)
  return code
}