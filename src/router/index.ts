import { createRouter, createWebHashHistory } from 'vue-router'
import CollectionItemView from '@/views/CollectionItemView.vue'
import CollectionList from '../shared/components/CollectionList.vue'
import BulkInsertView from '../views/BulkInsertView.vue'
import HtmlBulkInsertView from '../views/HtmlBulkInsertView.vue'

const routes = [
  { path: '/', redirect: '/collections' },
  {
    path: '/collections',
    name: 'collections',
    component: CollectionList
  },
  {
    path: '/collections/:id',
    name: 'collectionView',
    component: CollectionItemView,
    props: true
  },
  {
    path: '/bulk-insert',
    name: 'bulkInsert',
    component: BulkInsertView
  },
  {
    path: '/html-bulk-insert',
    name: 'htmlBulkInsert',
    component: HtmlBulkInsertView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router