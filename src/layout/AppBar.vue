<template>
  <div>
    <v-navigation-drawer v-model="drawer" app width="180" class="pa-4">
      <v-list>
        <!-- <v-btn icon @click="drawer = !drawer">
          <v-icon>mdi-menu</v-icon>
        </v-btn> -->
        <v-list-item class="my-4">
          <v-icon>mdi-home</v-icon>
          Schedule
        </v-list-item>
        <v-list-item class="my-4">
          <v-icon>mdi-account</v-icon>
          Collections
        </v-list-item>
        <v-list-item class="my-4">
          <v-icon>mdi-account</v-icon>
          Settings
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<script>
export default {
  props: {
    initialOpen: { // opcional, para pasar si empieza abierto o cerrado
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