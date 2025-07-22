// 这表示节点的类型。
// 应该注意的是，这里的 Node 不是指 HTML Node，而是指这个模板编译器处理的粒度。
// 所以，不仅 Element 和 Text，Attribute 也被视为一个 Node。
// 这与 Vue.js 的设计一致，在将来实现指令时会很有用。
export const enum NodeTypes {
  ELEMENT,
  TEXT,
  ATTRIBUTE,
}

// 所有 Node 都有 type 和 loc。
// loc 代表位置，保存关于这个 Node 在源代码（模板字符串）中对应位置的信息。
// （例如，哪一行和行上的哪个位置）
export interface Node {
  type: NodeTypes
  loc: SourceLocation
}

// Element 的 Node。
export interface ElementNode extends Node {
  type: NodeTypes.ELEMENT
  tag: string // 例如 "div"
  props: Array<AttributeNode> // 例如 { name: "class", value: { content: "container" } }
  children: TemplateChildNode[]
  isSelfClosing: boolean // 例如 <img /> -> true
}

// ElementNode 拥有的 Attribute。
// 它可以表达为只是 Record<string, string>，
// 但它被定义为像 Vue 一样具有 name(string) 和 value(TextNode)。
export interface AttributeNode extends Node {
  type: NodeTypes.ATTRIBUTE
  name: string
  value: TextNode | undefined
}

export type TemplateChildNode = ElementNode | TextNode

export interface TextNode extends Node {
  type: NodeTypes.TEXT
  content: string
}

// 关于位置的信息。
// Node 有这个信息。
// start 和 end 包含位置信息。
// source 包含实际代码（字符串）。
export interface SourceLocation {
  start: Position
  end: Position
  source: string
}

export interface Position {
  offset: number // 从文件开始
  line: number
  column: number
}