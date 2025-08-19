import type { Plugin } from 'vite'

import { createFilter } from 'vite'
import { compile } from '../../compiler-dom'
import { parse, rewriteDefault } from '../../compiler-sfc'
import fs from 'node:fs'

export default function vitePluginVueImpl(): Plugin {
  const filter = createFilter(/\.vue$/)
  return {
    name: 'vite:vueImpl',
    resolveId(id) {
      // 这个 ID 是一个不存在的路径，但我们在 load 中虚拟处理它，所以我们返回 ID 以表明它可以被加载
      if (id.match(/\.vue\.css$/)) return id

      // 对于这里没有返回的 ID，如果文件实际存在，文件将被解析，如果不存在，将抛出错误
    },
    load(id) {
      // 处理加载 .vue.css 时（当声明 import 并加载时）
      if (id.match(/\.vue\.css$/)) {
        const filename = id.replace(/\.css$/, '')
        const content = fs.readFileSync(filename, 'utf-8') // 正常检索 SFC 文件
        const { descriptor } = parse(content, { filename }) // 解析 SFC

        // 连接内容并将其作为结果返回
        const styles = descriptor.styles.map(it => it.content).join('\n')
        return { code: styles }
      }
    },
    transform(code, id) {
      if (!filter(id)) return

      const outputs = []
      outputs.push("import * as vueImpl from 'vueImpl'\n")
      outputs.push(`import '${id}.css'`)

      const { descriptor } = parse(code, { filename: id })

      const SFC_MAIN = '_sfc_main'
      const scriptCode = rewriteDefault(
        descriptor.script?.content ?? '',
        SFC_MAIN,
      )
      outputs.push(scriptCode)

      const templateCode = compile(descriptor.template?.content ?? '', {
        isBrowser: false,
      })
      outputs.push(templateCode)

      outputs.push('\n')
      outputs.push(`export default { ...${SFC_MAIN}, render }`)

      return { code: outputs.join('\n') }
    },
  }
}