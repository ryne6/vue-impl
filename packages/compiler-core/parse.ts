import { AttributeNode, DirectiveNode, ElementNode, InterpolationNode, NodeTypes, Position, SourceLocation, TemplateChildNode, TextNode } from "./ast"

export interface ParserContext {
  // 原始模板字符串
  readonly originalSource: string

  source: string

  // 此解析器正在读取的当前位置
  offset: number
  line: number
  column: number
}

function createParserContext(content: string): ParserContext {
  return {
    originalSource: content,
    source: content,
    column: 1,
    line: 1,
    offset: 0,
  }
}

export const baseParse = (
  content: string,
): { children: TemplateChildNode[] } => {
  const context = createParserContext(content)
  const children = parseChildren(context, []) // 解析子节点
  return { children: children }
}

function parseChildren(
  context: ParserContext,

  // 由于 HTML 具有递归结构，我们将祖先元素保持为堆栈，并在每次嵌套到子元素中时推送它们。
  // 当找到结束标签时，parseChildren 结束并弹出祖先。
  ancestors: ElementNode[],
): TemplateChildNode[] {
  const nodes: TemplateChildNode[] = []

  while (!isEnd(context, ancestors)) {
    const s = context.source
    let node: TemplateChildNode | undefined = undefined

    if (startsWith(s, "{{")) { // 这里
      node = parseInterpolation(context);
    } else if (s[0] === '<') {
      // 如果 s 以 "<" 开头且下一个字符是字母，则将其解析为元素。
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors) // TODO: 稍后实现这个。
      }
    }

    if (!node) {
      // 如果不匹配上述条件，则将其解析为 TextNode。
      node = parseText(context) // TODO: 稍后实现这个。
    }

    pushNode(nodes, node)
  }

  return nodes
}

function parseInterpolation(
  context: ParserContext,
): InterpolationNode | undefined {
  const [open, close] = ['{{', '}}']
  const closeIndex = context.source.indexOf(close, open.length)
  if (closeIndex === -1) return undefined

  const start = getCursor(context)
  advanceBy(context, open.length)

  const innerStart = getCursor(context)
  const innerEnd = getCursor(context)
  const rawContentLength = closeIndex - open.length
  const rawContent = context.source.slice(0, rawContentLength)
  const preTrimContent = parseTextData(context, rawContentLength)

  const content = preTrimContent.trim()

  const startOffset = preTrimContent.indexOf(content)

  if (startOffset > 0) {
    advancePositionWithMutation(innerStart, rawContent, startOffset)
  }
  const endOffset =
    rawContentLength - (preTrimContent.length - content.length - startOffset)
  advancePositionWithMutation(innerEnd, rawContent, endOffset)
  advanceBy(context, close.length)

  return {
    type: NodeTypes.INTERPOLATION,
    content,
    loc: getSelection(context, start),
  }
}

// 确定解析子元素的 while 循环结束的函数
function isEnd(context: ParserContext, ancestors: ElementNode[]): boolean {
  const s = context.source

  // 如果 s 以 "</" 开头且祖先的标签名跟随，它确定是否有闭合标签（parseChildren 是否应该结束）。
  if (startsWith(s, '</')) {
    for (let i = ancestors.length - 1; i >= 0; --i) {
      if (startsWithEndTagOpen(s, ancestors[i].tag)) {
        return true
      }
    }
  }

  return !s
}

function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString)
}

function pushNode(nodes: TemplateChildNode[], node: TemplateChildNode): void {
  // 如果 Text 类型的节点是连续的，它们会被合并。
  if (node.type === NodeTypes.TEXT) {
    const prev = last(nodes)
    if (prev && prev.type === NodeTypes.TEXT) {
      prev.content += node.content
      return
    }
  }

  nodes.push(node)
}

function last<T>(xs: T[]): T | undefined {
  return xs[xs.length - 1]
}

function startsWithEndTagOpen(source: string, tag: string): boolean {
  return (
    startsWith(source, '</') &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
    /[\t\r\n\f />]/.test(source[2 + tag.length] || '>')
  )
}

function parseText(context: ParserContext): TextNode {
  const endTokens = ['<', '{{'] // 如果 <span v-pre>`{{`</span> 出现，parseText 结束

  let endIndex = context.source.length

  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i], 1)
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  const start = getCursor(context)
  const content = parseTextData(context, endIndex)

  return {
    type: NodeTypes.TEXT,
    content,
    loc: getSelection(context, start),
  }
}

// 根据内容和长度提取文本。
function parseTextData(context: ParserContext, length: number): string {
  const rawText = context.source.slice(0, length)
  advanceBy(context, length)
  return rawText
}

// -------------------- 以下是实用程序（也在 parseElement 等中使用） --------------------

function advanceBy(context: ParserContext, numberOfCharacters: number): void {
  const { source } = context
  advancePositionWithMutation(context, source, numberOfCharacters)
  context.source = source.slice(numberOfCharacters)
}

function advanceSpaces(context: ParserContext): void {
  const match = /^[\t\r\n\f ]+/.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length);
  }
}

// 虽然有点长，但它只是计算位置。
// 它破坏性地更新作为参数接收的 pos 对象。
function advancePositionWithMutation(
  pos: Position,
  source: string,
  numberOfCharacters: number = source.length,
): Position {
  let linesCount = 0
  let lastNewLinePos = -1
  for (let i = 0; i < numberOfCharacters; i++) {
    if (source.charCodeAt(i) === 10 /* newline char code */) {
      linesCount++
      lastNewLinePos = i
    }
  }

  pos.offset += numberOfCharacters
  pos.line += linesCount
  pos.column =
    lastNewLinePos === -1
      ? pos.column + numberOfCharacters
      : numberOfCharacters - lastNewLinePos

  return pos
}

function getCursor(context: ParserContext): Position {
  const { column, line, offset } = context
  return { column, line, offset }
}

function getSelection(
  context: ParserContext,
  start: Position,
  end?: Position,
): SourceLocation {
  end = end || getCursor(context)
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset),
  }
}

const enum TagType {
  Start,
  End,
}

function parseElement(
  context: ParserContext,
  ancestors: ElementNode[],
): ElementNode | undefined {
  // 开始标签。
  const element = parseTag(context, TagType.Start) // TODO:

  // 如果它是像 <img /> 这样的自闭合元素，我们在这里结束（因为没有子元素或结束标签）。
  if (element.isSelfClosing) {
    return element
  }

  // 子元素。
  ancestors.push(element)
  const children = parseChildren(context, ancestors)
  ancestors.pop()

  element.children = children

  // 结束标签。
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End) // TODO:
  }

  return element
}

function parseTag(context: ParserContext, type: TagType): ElementNode {
  // 标签打开。
  const start = getCursor(context)
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)!
  const tag = match[1]

  advanceBy(context, match[0].length)
  advanceSpaces(context)

  // 属性。
  let props = parseAttributes(context, type)

  // 标签关闭。
  let isSelfClosing = false

  // 如果下一个字符是 "/>"，它是一个自闭合标签。
  isSelfClosing = startsWith(context.source, '/>')
  advanceBy(context, isSelfClosing ? 2 : 1)

  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children: [],
    isSelfClosing,
    loc: getSelection(context, start),
  }
}

// 解析整个属性（多个属性）。
// 例如 `id="app" class="container" style="color: red"`
function parseAttributes(
  context: ParserContext,
  type: TagType,
): (AttributeNode | DirectiveNode)[] {
  const props = []
  const attributeNames = new Set<string>()

  // 继续读取直到标签结束。
  while (
    context.source.length > 0 &&
    !startsWith(context.source, '>') &&
    !startsWith(context.source, '/>')
  ) {
    const attr = parseAttribute(context, attributeNames)

    if (type === TagType.Start) {
      props.push(attr)
    }

    advanceSpaces(context) // 跳过空格。
  }

  return props
}

type AttributeValue =
  | {
      content: string
      loc: SourceLocation
    }
  | undefined

// 解析单个属性。
// 例如 `id="app"`
function parseAttribute(
  context: ParserContext,
  nameSet: Set<string>,
): AttributeNode | DirectiveNode {
  // 名称。
  const start = getCursor(context)
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)!
  const name = match[0]

  nameSet.add(name)

  advanceBy(context, name.length)

  // 值
  let value: AttributeValue = undefined

  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    advanceSpaces(context)
    advanceBy(context, 1)
    advanceSpaces(context)
    value = parseAttributeValue(context)
  }

  const loc = getSelection(context, start)

  if (/^(v-[A-Za-z0-9-]|@)/.test(name)) {
    const match =
      /(?:^v-([a-z0-9-]+))?(?:(?::|^\.|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(
        name
      )!;

    let dirName = match[1] || (startsWith(name, "@") ? "on" : "");

    let arg = "";

    if (match[2]) arg = match[2];

    return {
      type: NodeTypes.DIRECTIVE,
      name: dirName,
      exp: value?.content ?? "",
      loc,
      arg,
    };
  }

  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content,
      loc: value.loc,
    },
    loc,
  }
}

// 解析属性的值。
// 此实现允许解析值，无论它们是单引号还是双引号。
// 它只是提取引号中包含的值。
function parseAttributeValue(context: ParserContext): AttributeValue {
  const start = getCursor(context)
  let content: string

  const quote = context.source[0]
  const isQuoted = quote === `"` || quote === `'`
  if (isQuoted) {
    // 引用值。
    advanceBy(context, 1)

    const endIndex = context.source.indexOf(quote)
    if (endIndex === -1) {
      content = parseTextData(context, context.source.length)
    } else {
      content = parseTextData(context, endIndex)
      advanceBy(context, 1)
    }
  } else {
    // 未引用
    const match = /^[^\t\r\n\f >]+/.exec(context.source)
    if (!match) {
      return undefined
    }
    content = parseTextData(context, match[0].length)
  }

  return { content, loc: getSelection(context, start) }
}