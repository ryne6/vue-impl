import { ReactiveEffect } from "../reactivity"
import { Component, ComponentInternalInstance, createComponentInstance, InternalRenderFunction } from "./component"
import { initProps, updateProps } from "./componentProps"
import { createVNode, normalizeVNode, Text, VNode, VNodeArrayChildren } from "./vnode"

export interface RendererOptions<HostNode = RendererNode, HostElement = RendererElement> {
  createElement(type: string): HostNode // Added

  createText(text: string): HostNode // Added

  setElementText(node: HostNode, text: string): void

  insert(child: HostNode, parent: HostNode, anchor?: HostNode | null): void // Added

  patchProp(el: HostElement, key: string, value: any): void;

  parentNode(node: HostNode): HostNode | null
}

export interface RendererNode {
  [key: string]: any
}

export interface RendererElement extends RendererNode {}

export type RootRenderFunction<HostElement = RendererElement> = (
  rootComponent: Component,
  container: HostElement,
) => void

export function createRenderer(options: RendererOptions) {
  const {
    createElement: hostCreateElement,
    createText: hostCreateText,
    insert: hostInsert,
    patchProp: hostPatchProp,
    setElementText: hostSetText,
    parentNode: hostParentNode,
  } = options

  const patchElement = (n1: VNode, n2: VNode) => {
    const el = (n2.el = n1.el!)
  
    const props = n2.props
  
    patchChildren(n1, n2, el)
  
    for (const key in props) {
      if (props[key] !== n1.props?.[key]) {
        hostPatchProp(el, key, props[key])
      }
    }
  }

  const patchText = (n1: VNode, n2: VNode) => {
    const el = (n2.el = n1.el!)
    if (n2.children !== n1.children) {
      hostSetText(el, n2.children as unknown as string)
    }
  }
  
  const patchChildren = (n1: VNode, n2: VNode, container: RendererElement) => {
    const c1 = n1.children as VNode[]
    const c2 = n2.children as VNode[]
  
    for (let i = 0; i < c2.length; i++) {
      const child = (c2[i] = normalizeVNode(c2[i]))
      patch(c1[i], child, container)
    }
  }

  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
  ) => {
    if (n1 === null) {
      mountElement(n2, container)
    } else {
      patchElement(n1, n2);
    }
  }

  const processText = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
  ) => {
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children as string)), container)
    } else {
      patchText(n1, n2)
    }
  }

  const processComponent = (n1: VNode | null, n2: VNode, container: RendererElement) => {
    if (n1 == null) {
      mountComponent(n2, container)
    } else {
      updateComponent(n1, n2)
    }
  }

  const mountComponent = (initVNode: VNode, container: RendererElement) => {
    const instance: ComponentInternalInstance = (initVNode.component =
      createComponentInstance(initVNode))
    const component = initVNode.type as Component

    const { props } = instance.vnode;
    initProps(instance, props);
    
    if (component.setup) {
      instance.render = component.setup(instance.props) as InternalRenderFunction
    }
    setupRenderEffect(instance, initVNode, container)
  }

  const updateComponent = (n1: VNode, n2: VNode) => {
    const instance = (n2.component = n1.component)!
    instance.next = n2
    instance.update()
  }

  const setupRenderEffect = (instance: ComponentInternalInstance, initVNode: VNode, container: RendererElement) => {
    const componentUpdateFn = () => {
      const { render } = instance
  
      if (!instance.isMounted) {
        // mount process 转为 vnode
        const subTree = (instance.subTree = normalizeVNode(render()))
        // patch  patch 后 有 el
        patch(null, subTree, container)
        // 保存 el
        initVNode.el = subTree.el 
        // 设置状态
        instance.isMounted = true
      } else {
        // patch process 
        let { next, vnode } = instance
        
        if (next) {
          next.el = vnode.el
          next.component = instance
          instance.vnode = next
          instance.next = null
          updateProps(instance, next.props)
        } else {
          next = vnode
        }
  
        const prevTree = instance.subTree
        const nextTree = normalizeVNode(render())
        instance.subTree = nextTree
  
        patch(prevTree, nextTree, hostParentNode(prevTree.el!)!)
        next.el = nextTree.el
      }
    }
  
    const effect = (instance.effect = new ReactiveEffect(componentUpdateFn))
    const update = (instance.update = () => effect.run()) // 注册到 instance.update
    update()
  }


  const mountChildren = (children: VNode[], container: RendererElement) => {
    for (let i = 0; i < children.length; i++) {
      const child = (children[i] = normalizeVNode(children[i]))
      patch(null, child, container)
    }
  }

  const mountElement = (vnode: VNode, container: RendererElement) => {
    let el: RendererElement
    const { type, props, children } = vnode
    el = vnode.el = hostCreateElement(type as string)

    mountChildren(children as VNode[], el)

    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, props[key])
      }
    }

    hostInsert(el, container)
  }

  const patch = (n1: VNode | null, n2: VNode, container: RendererElement) => {
    const { type } = n2
    if (type === Text) {
      processText(n1, n2, container);
    } else if (typeof type === 'object') {
      processComponent(n1, n2, container);
    } else {
      processElement(n1, n2, container);
    }
  }


  const render: RootRenderFunction = (rootComponent, container) => {
    const vnode = createVNode(rootComponent, {}, [])
    patch(null, vnode, container)
  }

  return { render }
}