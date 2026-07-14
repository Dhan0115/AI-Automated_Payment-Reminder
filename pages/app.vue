<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <header class="border-b bg-white">
      <div class="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
        <h1 class="text-xl font-semibold">My Bill Reminder</h1>
        <nav class="flex gap-4 text-sm">
          <NuxtLink to="/" class="hover:text-indigo-600">Bills</NuxtLink>
          <!-- You can add more pages later, e.g. /assistant -->
        </nav>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 py-6">
      <NuxtPage />
    </main>
  </div>
</template>