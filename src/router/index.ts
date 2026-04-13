import { createRouter, createWebHistory } from 'vue-router'
import CollectionItemView from '@/views/CollectionItemView.vue'
import CollectionList from '../shared/components/CollectionList.vue'
import BulkInsertView from '../views/BulkInsertView.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router