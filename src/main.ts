import { createApp } from 'vue'
import App from './App.vue'
import { vuetify } from './plugins/vuetify'
import { watchSystemTheme } from '@/shared/composables/useAppTheme'
import router from './router'
import './shared/styles/richContent.scss'

// The extension popup needs a fixed minimum size (see App.vue). Only the popup:
// the manifest opens it as index.html?popup. Any other page — a browser tab, a
// phone, or the extension's own index.html opened in a tab — must not get it,
// or the page ends up wider than the screen.
if (new URLSearchParams(location.search).has('popup')) document.documentElement.classList.add('extension-popup')

// Follow the OS setting while the user has not pinned a preference.
watchSystemTheme(name => vuetify.theme.change(name))

createApp(App)
  .use(router)
  .use(vuetify)
  .mount('#app')
