import { createApp } from 'vue'
import App from './App.vue'
import { vuetify } from './plugins/vuetify'
import { watchSystemTheme } from '@/shared/composables/useAppTheme'
import router from './router'

// Follow the OS setting while the user has not pinned a preference.
watchSystemTheme(name => vuetify.theme.change(name))

createApp(App)
  .use(router)
  .use(vuetify)
  .mount('#app')
