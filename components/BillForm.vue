<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
const props = defineProps({
  prefill: {
    type: Object as () => any,
    default: null,
  },
})
const emit = defineEmits(["saved", "cancel"])
const form = reactive({
  name: "",
  category: "",
  amount: null as number | null,
  dueDate: "",
  daysBefore: 2,
  email: "",
  paid: false,
})
function applyPrefill() {
  if (props.prefill) {
    form.name = props.prefill.name ?? ""
    form.category = props.prefill.category ?? ""
    form.amount = props.prefill.amount ?? null
    form.dueDate = props.prefill.dueDate ?? ""
    form.daysBefore = props.prefill.daysBefore ?? 2
    form.email = props.prefill.email ?? ""
    form.paid = props.prefill.paid ?? false
  }
}
watch(() => props.prefill, () => {
  applyPrefill()
}, { deep: true, immediate: true })
onMounted(() => {
  applyPrefill()
})
const saving = ref(false)
async function save() {
  saving.value = true
  // Save changes, preserving existing ID if editing
  const created = { 
    id: props.prefill?.id ?? Date.now(), 
    ...form 
  }
  emit("saved", created)
  saving.value = false
}
function cancel() {
  emit("cancel")
}
</script>
<template>
  <form class="space-y-3" @submit.prevent="save">
    <div>
      <label class="block text-xs font-medium text-gray-700 mb-1">
        Bill Name
      </label>
      <input
        v-model="form.name"
        type="text"
        required
        class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        placeholder="Electricity"
      />
    </div>
    <div>
      <label class="block text-xs font-medium text-gray-700 mb-1">
        Category
      </label>
      <input
        v-model="form.category"
        type="text"
        class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        placeholder="Utilities, Rent, Loan…"
      />
    </div>
    <div class="flex gap-3">
      <div class="flex-1">
        <label class="block text-xs font-medium text-gray-700 mb-1">
          Amount
        </label>
        <input
          v-model="form.amount"
          type="number"
          min="0"
          step="0.01"
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="50"
        />
      </div>
      <div class="flex-1">
        <label class="block text-xs font-medium text-gray-700 mb-1">
          Due Date
        </label>
        <input
          v-model="form.dueDate"
          type="date"
          required
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
    <div class="flex gap-3">
      <div class="flex-1">
        <label class="block text-xs font-medium text-gray-700 mb-1">
          Days Before Reminder
        </label>
        <input
          v-model.number="form.daysBefore"
          type="number"
          min="0"
          step="1"
          required
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div class="flex-1">
        <label class="block text-xs font-medium text-gray-700 mb-1">
          Reminder Email
        </label>
        <input
          v-model="form.email"
          type="email"
          required
          class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="you@example.com"
        />
      </div>
    </div>
    <div class="flex items-center gap-2">
      <input
        id="paid"
        v-model="form.paid"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <label for="paid" class="text-xs font-medium text-gray-700">
        Mark as paid
      </label>
    </div>
    <div class="flex justify-end gap-2 pt-2">
      <button
        type="button"
        class="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        @click="cancel"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
        :disabled="saving"
      >
        {{ saving ? "Saving..." : "Save" }}
      </button>
    </div>
  </form>
</template>