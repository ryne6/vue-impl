import { parse } from '@babel/parser'
import MagicString from 'magic-string'

const defaultExportRE = /((?:^|\n|;)\s*)export(\s*)default/
const namedDefaultExportRE = /((?:^|\n|;)\s*)export(.+)(?:as)?(\s*)default/s

function specifierEnd(input: string, end: number, nodeEnd: number | null) {
  // export { default   , foo } ...
  let hasCommas = false
  let oldEnd = end
  while (end < nodeEnd!) {
    if (/\s/.test(input.charAt(end))) {
      end++
    } else if (input.charAt(end) === ',') {
      end++
      hasCommas = true
      break
    } else if (input.charAt(end) === '}') {
      break
    }
  }
  return hasCommas ? end : oldEnd
}


export function rewriteDefault(input: string, as: string): string {
  if (!hasDefaultExport(input)) {
    return input + `\nconst ${as} = {}`
  }

  const s = new MagicString(input)
  const ast = parse(input, {
    sourceType: 'module',
  }).program.body

  ast.forEach(node => {
    // 在默认导出的情况下
    if (node.type === 'ExportDefaultDeclaration') {
      if (node.declaration.type === 'ClassDeclaration') {
        // 如果是 `export default class Hoge {}`，将其替换为 `class Hoge {}`
        s.overwrite(node.start!, node.declaration.id.start!, `class `)
        // 然后，在末尾添加像 `const ${as} = Hoge;` 这样的代码。
        s.append(`\nconst ${as} = ${node.declaration.id.name}`)
      } else {
        // 对于其他默认导出，将声明部分替换为变量声明。
        // 例如 1) `export default { setup() {}, }`  ->  `const ${as} = { setup() {}, }`
        // 例如 2) `export default Hoge`  ->  `const ${as} = Hoge`
        s.overwrite(node.start!, node.declaration.start!, `const ${as} = `)
      }
    }

    // 即使在命名导出的情况下，声明中也可能有默认导出。
    // 主要有 3 种模式
    //   1. 在像 `export { default } from "source";` 这样的声明情况下
    //   2. 在像 `export { hoge as default }` from 'source' 这样的声明情况下
    //   3. 在像 `export { hoge as default }` 这样的声明情况下
    if (node.type === 'ExportNamedDeclaration') {
      for (const specifier of node.specifiers) {
        if (
          specifier.type === 'ExportSpecifier' &&
          specifier.exported.type === 'Identifier' &&
          specifier.exported.name === 'default'
        ) {
          // 如果有关键字 `from`
          if (node.source) {
            if (specifier.local.name === 'default') {
              // 1. 在像 `export { default } from "source";` 这样的声明情况下
              // 在这种情况下，将其提取到导入语句中并给它一个名称，然后将其绑定到最终变量。
              // 例如) `export { default } from "source";`  ->  `import { default as __VUE_DEFAULT__ } from 'source'; const ${as} = __VUE_DEFAULT__`
              const end = specifierEnd(input, specifier.local.end!, node.end!)
              s.prepend(
                `import { default as __VUE_DEFAULT__ } from '${node.source.value}'\n`,
              )
              s.overwrite(specifier.start!, end, ``)
              s.append(`\nconst ${as} = __VUE_DEFAULT__`)
              continue
            } else {
              // 2. 在像 `export { hoge as default }` from 'source' 这样的声明情况下
              // 在这种情况下，将所有说明符按原样重写为导入语句，并将作为默认值的变量绑定到最终变量。
              // 例如) `export { hoge as default } from "source";`  ->  `import { hoge } from 'source'; const ${as} = hoge
              const end = specifierEnd(
                input,
                specifier.exported.end!,
                node.end!,
              )
              s.prepend(
                `import { ${input.slice(
                  specifier.local.start!,
                  specifier.local.end!,
                )} } from '${node.source.value}'\n`,
              )

              // 3. 在像 `export { hoge as default }` 这样的声明情况下
              // 在这种情况下，简单地将其绑定到最终变量。
              s.overwrite(specifier.start!, end, ``)
              s.append(`\nconst ${as} = ${specifier.local.name}`)
              continue
            }
          }
          const end = specifierEnd(input, specifier.end!, node.end!)
          s.overwrite(specifier.start!, end, ``)
          s.append(`\nconst ${as} = ${specifier.local.name}`)
        }
      }
    }
  })
  return s.toString()
}

export function hasDefaultExport(input: string): boolean {
  return defaultExportRE.test(input) || namedDefaultExportRE.test(input)
}