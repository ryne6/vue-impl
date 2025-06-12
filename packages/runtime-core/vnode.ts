import { ComponentInternalInstance } from "./component";
import { RendererNode } from "./renderer";

export interface VNode<HostNode = RendererNode> {
  type: VNodeTypes
  props: VNodeProps
  children: VNodeNormalizedChildren
  el: HostNode | null
  component: ComponentInternalInstance | null // 添加
}

export interface VNodeProps {
  [key: string]: any
}

export const Text = Symbol();

export type VNodeTypes = string | typeof Text | object;

export type VNodeNormalizedChildren = string | VNodeArrayChildren;
export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>;

export type VNodeChild = VNodeChildAtom | VNodeArrayChildren;
type VNodeChildAtom = VNode | string;

export function createVNode(
  type: VNodeTypes,
  props: VNodeProps | null,
  children: VNodeNormalizedChildren,
): VNode {
  const vnode: VNode = { type, props: props || {}, children: children, el: null, component: null }
  return vnode
}

export function normalizeVNode(child: VNodeChild): VNode {
  if (typeof child === "object") {
    return { ...child } as VNode;
  } else {
    // 将字符串转换为前面介绍的所需形式
    return createVNode(Text, null, String(child));
  }
}