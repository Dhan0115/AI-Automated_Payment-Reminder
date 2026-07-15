<script setup lang="ts">
import { ref, onMounted } from 'vue'

const bills = ref<any[]>([])
const showNew = ref(false)

const aiPrompt = ref("")
const aiLoading = ref(false)
const aiError = ref("")
const aiPrefillData = ref<any>(null)

// Custom Delete Confirmation Modal States
const showDeleteConfirm = ref(false)
const billToDelete = ref<any>(null)

// Voice / Speech Recognition States
const isSpeechSupported = ref(false)
const isListening = ref(false)
let recognition: any = null

// Later you’ll replace this with API calls
function loadBills() {
  bills.value = [
    {
      id: 1,
      name: "Electricity",
      category: "Utilities",
      amount: 50,
      dueDate: "2026-07-15",
      daysBefore: 3,
      email: "you@example.com",
      paid: false,
    },
  ]
}

onMounted(() => {
  loadBills()
  
  // Initialize Web Speech API for Speak AI Assistant
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (SpeechRecognition) {
    isSpeechSupported.value = true
    recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      isListening.value = true
      aiError.value = ""
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      aiPrompt.value = transcript
      // Automatically send spoken command to AI parser for a seamless magical experience!
      handleSmartAdd()
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        aiError.value = "Microphone access denied. Please enable microphone permission in browser settings."
      } else {
        aiError.value = "Voice Recognition Error: " + event.error
      }
      isListening.value = false
    }

    recognition.onend = () => {
      isListening.value = false
    }
  }
})

// Toggle the listening state
function toggleListening() {
  if (!recognition) return
  if (isListening.value) {
    recognition.stop()
  } else {
    try {
      recognition.start()
    } catch (e) {
      console.error(e)
    }
  }
}

async function handleSmartAdd() {
  if (!aiPrompt.value.trim()) return

  aiLoading.value = true
  aiError.value = ""
  
  try {
    const data = await $fetch<any>('/api/smart-add', {
      method: 'POST' as const,
      body: { prompt: aiPrompt.value }
    })
    
    aiPrefillData.value = data
    showNew.value = true
    aiPrompt.value = ""
  } catch (error: any) {
    aiError.value = error.data?.statusMessage || error.message || "Failed to process prompt"
  } finally {
    aiLoading.value = false
    isListening.value = false
  }
}

function handleSaved(savedBill: any) {
  // Check if we are updating an existing bill or adding a new one
  const index = bills.value.findIndex(b => b.id === savedBill.id)
  if (index !== -1) {
    bills.value[index] = savedBill
  } else {
    bills.value.push(savedBill)
  }
  showNew.value = false
  aiPrefillData.value = null
}

function handleCancel() {
  showNew.value = false
  aiPrefillData.value = null
}

function openManualAdd() {
  aiPrefillData.value = null
  showNew.value = true
}

function editBill(bill: any) {
  aiPrefillData.value = { ...bill }
  showNew.value = true
}

// Request confirmation using the custom modal
function confirmDeleteBill(bill: any) {
  billToDelete.value = bill
  showDeleteConfirm.value = true
}

// Execute deletion after modal confirmation
function executeDeleteBill() {
  if (billToDelete.value) {
    bills.value = bills.value.filter(b => b.id !== billToDelete.value.id)
  }
  closeDeleteConfirm()
}

// Close the confirmation modal and reset state
function closeDeleteConfirm() {
  showDeleteConfirm.value = false
  billToDelete.value = null
}
</script>

<template>
  <section class="space-y-6 max-w-4xl mx-auto p-4">
    <!-- Premium AI Assistant Card -->
    <div class="bg-linear-to-r from-violet-600 via-indigo-600 to-blue-600 rounded-2xl shadow-xl overflow-hidden p-6 text-white relative">
      <div class="absolute inset-0 bg-white/5 backdrop-blur-3xl -z-0"></div>
      <div class="relative z-10 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="p-2 bg-white/20 rounded-lg animate-pulse text-lg flex items-center justify-center">✨</span>
            <div>
              <h1 class="text-xl font-bold tracking-tight flex items-center gap-1.5">
                AI Smart Bill Assistant
                <span v-if="isListening" class="inline-flex items-center gap-1 text-[10px] bg-red-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                  ● Listening
                </span>
              </h1>
              <p class="text-xs text-indigo-100">Add bills instantly by typing or speaking natural sentences</p>
            </div>
          </div>
          <!-- <div v-if="isSpeechSupported" class="text-xs bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 flex items-center gap-1 text-indigo-100">
            🎙️ Voice enabled
          </div> -->
        </div>

        <form @submit.prevent="handleSmartAdd" class="flex gap-2">
          <div class="relative flex-1">
            <input
              v-model="aiPrompt"
              type="text"
              required
              :disabled="aiLoading"
              placeholder="e.g., Remind me to pay Netflix ₱598 on the 5th of every month using my card."
              class="w-full rounded-xl bg-white/10 border border-white/20 pl-4 pr-12 py-3 text-sm placeholder:text-indigo-200/70 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/15 disabled:opacity-50 transition-all duration-200"
            />
            <!-- Premium Speak Assistant Button inside Input -->
            <button
              v-if="isSpeechSupported && !aiLoading"
              type="button"
              @click="toggleListening"
              :class="isListening ? 'text-red-400 bg-red-500/20 ring-2 ring-red-500/50' : 'text-indigo-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200 flex items-center justify-center shadow-inner"
              title="Speak your command"
            >
              <svg v-if="isListening" class="h-4 w-4 animate-bounce text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            
            <div v-if="aiLoading" class="absolute right-3 top-1/2 -translate-y-1/2">
              <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
          <button
            type="submit"
            :disabled="aiLoading"
            class="bg-white text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md flex items-center gap-1 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <span>Analyze</span>
          </button>
        </form>

        <div v-if="aiError" class="text-xs text-red-200 bg-red-900/30 border border-red-500/30 rounded-lg p-2 flex items-center gap-2">
          ⚠️ {{ aiError }}
        </div>
      </div>
    </div>

    <!-- Dashboard Title / Actions -->
    <div class="flex items-center justify-between border-b pb-2">
      <h2 class="text-lg font-semibold text-gray-800">Your Bills</h2>
      <button
        class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        @click="openManualAdd"
      >
        Add Bill Manually
      </button>
    </div>

    <div class="bg-white shadow-sm rounded-lg overflow-x-auto border">
      <table class="min-w-full text-sm whitespace-nowrap">
        <thead class="bg-gray-100 border-b ">
          <tr class="text-left ">
            <th class="px-4 py-2 text-gray-600 font-medium">Name</th>
            <th class="px-4 py-2 text-gray-600 font-medium">Category</th>
            <th class="px-4 py-2 text-gray-600 font-medium">Amount</th>
            <th class="px-4 py-2 text-gray-600 font-medium">Due Date</th>
            <th class="px-4 py-2 text-gray-600 font-medium">Days Before</th>
            <th class="px-4 py-2 text-gray-600 font-medium">Email</th>
            <th class="px-4 py-2 text-gray-600 font-medium">Paid</th>
            <th class="px-4 py-2 text-gray-600 font-medium text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="bill in bills"
            :key="bill.id"
            class="border-b last:border-0 hover:bg-gray-50/50 transition-colors"
          >
            <td class="px-4 py-2 font-medium text-gray-900">{{ bill.name }}</td>
            <td class="px-4 py-2 text-gray-600">{{ bill.category || "-" }}</td>
            <td class="px-4 py-2 text-gray-600">
              {{ bill.amount != null ? '₱' + bill.amount : "-" }}
            </td>
            <td class="px-4 py-2 text-gray-600">{{ bill.dueDate }}</td>
            <td class="px-4 py-2 text-gray-600">{{ bill.daysBefore }} days</td>
            <td class="px-4 py-2 text-gray-600">{{ bill.email }}</td>
            <td class="px-4 py-2">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                :class="bill.paid
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'"
              >
                {{ bill.paid ? "Yes" : "No" }}
              </span>
            </td>
            <td class="px-4 py-2">
              <div class="flex items-center justify-center gap-2">
                <button
                  @click="editBill(bill)"
                  class="inline-flex items-center rounded-md border h-7 border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-all duration-150 active:scale-95 gap-2"
                >
                  <span>✏️</span> Edit
                </button>
                <button
                  @click="confirmDeleteBill(bill)"
                  class="inline-flex items-center rounded-md border h-7 border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all duration-150 active:scale-95 gap-2"
                >
                  <span>🗑️</span> Delete
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!bills.length">
            <td class="px-4 py-4 text-center text-gray-500" colspan="8">
              No bills yet. Try typing something above to smart-add!
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Simple modal -->
    <div
      v-if="showNew"
      class="fixed inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <span>{{ aiPrefillData && aiPrefillData.id ? '✏️ Edit Bill Details' : aiPrefillData ? '✨ AI Pre-filled Bill' : 'Add New Bill' }}</span>
          </h3>
          <button
            class="text-gray-400 hover:text-gray-600 transition-colors"
            @click="handleCancel"
          >
            ✕
          </button>
        </div>
        <BillForm :prefill="aiPrefillData" @saved="handleSaved" @cancel="handleCancel" />
      </div>
    </div>

    <!-- Custom Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
    >
      <div class="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150 text-center border">
        <!-- Red warning icon -->
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4 text-red-600">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h3 class="text-lg font-bold text-gray-950 mb-2">Delete Bill?</h3>
        
        <p class="text-sm text-gray-500 mb-6">
          Are you sure you want to delete <span class="font-semibold text-gray-800">"{{ billToDelete?.name }}"</span>? This action cannot be undone.
        </p>
        
        <div class="flex justify-center gap-3">
          <button
            class="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all duration-150 flex-1"
            @click="closeDeleteConfirm"
          >
            Cancel
          </button>
          <button
            class="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 active:scale-95 transition-all duration-150 flex-1"
            @click="executeDeleteBill"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </section>
</template>