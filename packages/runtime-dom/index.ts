import { createAppAPI, CreateAppFunction } from '../runtime-core'
import { createRenderer } from '../runtime-core/renderer'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'
export { h } from '../runtime-core'

const { render } = createRenderer({ ...nodeOps, patchProp })

const _createApp = createAppAPI(render)

export const createApp = ((...args) => {
  const app = _createApp(...args)
  const { mount } = app
  app.mount = (selector: string) => {
    const container = document.querySelector(selector)
    if (!container) return
    mount(container)
  }

  return app
}) as CreateAppFunction<Element>