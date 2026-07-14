<template>
  <AdminCandidateForm :candidate="null" />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
</script>
