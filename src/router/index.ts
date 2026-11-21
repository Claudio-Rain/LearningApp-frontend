import { createRouter, createWebHashHistory } from 'vue-router'
import CollectionListView from '../views/CollectionListView.vue'

// Only the landing view ships in the entry bundle. Every other view is its own
// chunk, fetched when its route is first visited, so opening the app does not
// download the editor, the charts or the bulk-insert tools up front.
const CollectionItemView = () => import('@/views/CollectionItemView.vue')

const routes = [
  { path: '/', redirect: '/collections' },
  {
    path: '/collections',
    name: 'collections',
    component: CollectionListView
  },
  {
    path: '/collections/:id',
    name: 'collectionView',
    component: CollectionItemView,
    props: true
  },
  {
    path: '/collections/:id/:itemId',
    name: 'collectionItemView',
    component: CollectionItemView,
    props: true
  },
  {
    path: '/study/:id?',
    name: 'study',
    component: () => import('../views/StudyView.vue'),
    props: true
  },
  {
    path: '/progress',
    name: 'progress',
    component: () => import('../views/StudyProgressView.vue')
  },
  {
    path: '/study-options',
    name: 'studyOptions',
    component: () => import('../views/StudyOptionsView.vue')
  },
  {
    path: '/bulk-insert',
    name: 'bulkInsert',
    component: () => import('../views/BulkInsertView.vue')
  },
  {
    path: '/html-bulk-insert',
    name: 'htmlBulkInsert',
    component: () => import('../views/HtmlBulkInsertView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
