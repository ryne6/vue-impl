import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vueImplPlugin from '../../packages/@extensions/vite-plugin-vueImpl'

const dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))
export default defineConfig({
  resolve: {
    alias: {
      vueImpl: path.resolve(dirname, '../../packages'),
    },
  },
  plugins: [vueImplPlugin()],
})