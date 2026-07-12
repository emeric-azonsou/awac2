<template>
  <!-- Admin layout skeleton — no business UI here. Use slots and <router-view> in pages. -->
  <div class="min-h-screen bg-gray-50 text-awac-dark">
    <header class="shadow-sm">
      <!-- reuse Navbar from vitrine if needed; admin-specific nav goes here later -->
    </header>

    <main class="p-6">
      <slot />
      <router-view />
    </main>

    <footer class="mt-auto text-center text-sm text-gray-500">AWAC Admin</footer>
  </div>
</template>

<script setup>
// Layout intentionally minimal — do not implement business UI until DB layer is validated.
</script>
