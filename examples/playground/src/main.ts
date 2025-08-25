import { createApp, h, reactive, ref, watchEffect, watch } from 'vueImpl'

const app = createApp({
  setup() {
    const state = ref(0)
    const state2 = ref(0)
    const state3 = reactive({ count: 0 })
    watch<number>(
      [state, state2, () => state3.count],
      (newValue, oldValue) => {
        console.log('newValue', newValue)
        console.log('oldValue', oldValue)
      },
      {
        immediate: true,
      },
    )

    watchEffect(() => {
      console.log('state3.count', state3.count)
    })

    return () =>
      h('div', {}, [
        h('p', {}, [`count: ${state.value}`]),
        h('button', { onClick: () => state.value++ }, ['update state']),
        h('button', { onClick: () => state2.value++ }, ['update state2']),
        h('button', { onClick: () => state3.count++ }, ['update state3']),
      ])
  },
})

app.mount('#app')