<template>
  <div>
    <v-navigation-drawer v-model="drawer" app width="180" class="pa-4">
      <v-list>
        <v-list-item class="my-4" :to="{ name: 'collections' }">
          Collections
        </v-list-item>
        <v-list-item class="my-4" :to="{ name: 'bulkInsert' }">
          Bulk Insert
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<script>
export default {
  props: {
    initialOpen: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      drawer: this.initialOpen
    }
  }
}
</script>