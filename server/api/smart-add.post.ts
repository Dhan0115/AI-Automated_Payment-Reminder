import { defineEventHandler, readBody, createError, getQuery } from 'h3'

// Robust local regex fallback parser to run when GEMINI_API_KEY is not configured
function fallbackParse(prompt: string): any {
  // Normalize spoken email address representations like " at " and " dot " to standard email characters
  let normalized = prompt.toLowerCase()
    .replace(/\s+(?:at|@)\s+/g, "@")
    .replace(/\s+dot\s+/g, ".")
    .replace(/\s+/g, " ")

  // Spoken number word mapping for dates
  const spokenDays: Record<string, number> = {
    first: 1, "1st": 1,
    second: 2, "2nd": 2,
    third: 3, "3rd": 3,
    fourth: 4, "4th": 4,
    fifth: 5, "5th": 5,
    sixth: 6, "6th": 6,
    seventh: 7, "7th": 7,
    eighth: 8, "8th": 8,
    ninth: 9, "9th": 9,
    tenth: 10, "10th": 10,
    eleven: 11, eleventh: 11, "11th": 11,
    twelve: 12, twelfth: 12, "12th": 12,
    thirteen: 13, thirteenth: 13, "13th": 13,
    fourteen: 14, fourteenth: 14, "14th": 14,
    fifteen: 15, fifteenth: 15, "15th": 15,
    sixteen: 16, sixteenth: 16, "16th": 16,
    seventeen: 17, seventeenth: 17, "17th": 17,
    eighteen: 18, eighteenth: 18, "18th": 18,
    nineteen: 19, nineteenth: 19, "19th": 19,
    twenty: 20, twentieth: 20, "20th": 20,
    thirty: 30, thirtieth: 30, "30th": 30
  }
  
  // 1. Extract Amount
  // matches ₱598, $50, Php 1200, 500, etc.
  const amountMatch = prompt.match(/(?:₱|\$|php\s*|val\s*)?(\d+(?:\.\d+)?)/i)
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null

  // 2. Extract Name
  let name = "Custom Bill"
  const names = ["netflix", "spotify", "electricity", "water", "rent", "wifi", "globe", "meralco", "insurance", "card"]
  for (const n of names) {
    if (normalized.includes(n)) {
      name = n.charAt(0).toUpperCase() + n.slice(1)
      break
    }
  }

  // 3. Extract Category
  let category = "Other"
  if (["netflix", "spotify"].includes(name.toLowerCase())) {
    category = "Subscription"
  } else if (["electricity", "water", "meralco"].includes(name.toLowerCase())) {
    category = "Utilities"
  } else if (name.toLowerCase() === "rent") {
    category = "Rent"
  } else if (["wifi", "globe"].includes(name.toLowerCase())) {
    category = "Utilities"
  }

  // 4. Extract Due Date Day
  let day = 5
  let dayFound = false

  // Try matching text-based words first (e.g., "fifth", "twelfth")
  for (const [word, val] of Object.entries(spokenDays)) {
    const wordPattern = new RegExp(`\\b${word}\\b`, 'i')
    if (wordPattern.test(normalized)) {
      day = val
      dayFound = true
      break
    }
  }

  // If no text-based word found, isolate a digit that isn't the amount (prefixed with context helper terms)
  if (!dayFound) {
    const dayContextMatch = normalized.match(/(?:on\s+the\s+|on\s+|every\s+|day\s+)(\d+)(?:st|nd|rd|th)?/i)
    if (dayContextMatch) {
      const parsedDay = parseInt(dayContextMatch[1])
      if (parsedDay >= 1 && parsedDay <= 31) {
        day = parsedDay
        dayFound = true
      }
    }
  }

  // Fallback check to avoid choosing the amount (e.g. 598) as the day if a simple number was matched
  if (!dayFound) {
    const numbers = normalized.match(/\b\d+\b/g)
    if (numbers) {
      for (const num of numbers) {
        const val = parseInt(num)
        if (val !== amount && val >= 1 && val <= 31) {
          day = val
          break
        }
      }
    }
  }

  // Calculate next occurrence of this day
  const today = new Date()
  let year = today.getFullYear()
  let month = today.getMonth() // 0-indexed
  
  if (today.getDate() >= day) {
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  
  const dueDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // 5. Recurrence
  let recurrence = "monthly"
  if (normalized.includes("one-time") || normalized.includes("once")) {
    recurrence = "one-time"
  } else if (normalized.includes("weekly")) {
    recurrence = "weekly"
  } else if (normalized.includes("yearly") || normalized.includes("annual")) {
    recurrence = "yearly"
  }

  // 6. Payment Method
  let paymentMethod = ""
  if (normalized.includes("card") || normalized.includes("credit")) {
    paymentMethod = "Credit Card"
  } else if (normalized.includes("gcash")) {
    paymentMethod = "GCash"
  } else if (normalized.includes("cash")) {
    paymentMethod = "Cash"
  }

  // 7. Extract Email
  let email = "you@example.com"
  const emailMatch = normalized.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) {
    email = emailMatch[0]
  }

  return {
    name,
    category,
    amount,
    dueDate: dueDateStr,
    daysBefore: 2,
    email,
    paid: false,
    recurrence,
    paymentMethod,
    _isMock: true
  }
}

export default defineEventHandler(async (event) => {
  // Handle both POST requests and simple GET tests
  const method = event.node.req.method
  let prompt = ''

  if (method === 'POST') {
    const body = await readBody(event)
    prompt = body?.prompt
  } else if (method === 'GET') {
    const query = getQuery(event)
    prompt = query.prompt as string
  }

  if (!prompt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing prompt. Please provide a prompt in the request body (POST) or as a query parameter (GET).',
    })
  }

  const apiKey = (globalThis as any).process?.env?.GEMINI_API_KEY

  // If API Key is not configured, fall back to our ultra-smart local regex parser!
  if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY is not configured. Falling back to local smart regex parser.")
    return fallbackParse(prompt)
  }

  // Get current date to provide context for relative date parsing
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const currentDayOfWeek = daysOfWeek[today.getDay()]

  const systemInstruction = `
You are an expert AI data extraction assistant for a payment reminder app.
Your task is to parse a natural language reminder prompt and extract a structured JSON representation of the bill.

Today's date is: ${todayStr} (which is a ${currentDayOfWeek}).

Use this today's date context to resolve relative dates or recurring schedules into an exact calendar date for the next "dueDate" in YYYY-MM-DD format.
Examples of date resolution:
- Today is July 9, 2026. "On the 5th of every month": The next occurrence is August 5, 2026 (2026-08-05).
- Today is July 9, 2026. "On the 15th": The next occurrence is July 15, 2026 (2026-07-15).
- Today is July 9, 2026. "Next Monday": The next Monday is July 13, 2026 (2026-07-13).
- Today is July 9, 2026. "Every August 12": The next occurrence is August 12, 2026 (2026-08-12).
- If the user says "remind me on the 1st" and today is the 9th, the next 1st is next month's 1st.

Extract the following schema exactly. Return ONLY a valid JSON object matching this TypeScript type:
{
  name: string; // The name of the bill, e.g. "Netflix", "Electricity", "Rent"
  category: string; // e.g. "Subscription", "Utilities", "Rent", "Insurance", "Credit Card", "Loan", "Other"
  amount: number | null; // Just the number, e.g. 598 (from ₱598) or null if not specified
  dueDate: string; // YYYY-MM-DD format. Must be a valid, resolved future calendar date!
  daysBefore: number; // Number of days before the due date to send a reminder. Default to 2 if not mentioned.
  email: string; // Email to send the reminder to, default to "" if not mentioned.
  paid: boolean; // default to false.
  recurrence: string; // "monthly", "weekly", "one-time", "yearly" etc. Default to "monthly" if recurring is implied.
  paymentMethod: string; // e.g. "Credit Card", "ATM Card", "Gcash", "Cash", etc. Default to "" if not mentioned.
}
`

  try {
    const response = await $fetch<any>(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        body: {
          contents: [
            {
              role: 'user',
              parts: [{ text: `Process this reminder instruction and extract the JSON: "${prompt}"` }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING', description: 'The name of the bill, e.g. Netflix, Rent, Electricity' },
                category: { type: 'STRING', description: 'Category like Subscription, Utilities, Rent, Loan, Insurance, Credit Card, etc.' },
                amount: { type: 'NUMBER', nullable: true, description: 'Numeric amount of the bill, e.g., 598' },
                dueDate: { type: 'STRING', description: 'The next due date in YYYY-MM-DD format, calculated relative to today' },
                daysBefore: { type: 'INTEGER', description: 'Days before to remind, default 2' },
                email: { type: 'STRING', description: 'Email address if mentioned, else empty string' },
                paid: { type: 'BOOLEAN', description: 'Whether it is paid, default false' },
                recurrence: { type: 'STRING', description: 'Recurrence frequency, e.g., monthly, weekly, yearly, one-time' },
                paymentMethod: { type: 'STRING', description: 'Method of payment like ATM card, credit card, GCash, etc.' }
              },
              required: ['name', 'category', 'amount', 'dueDate', 'daysBefore', 'email', 'paid', 'recurrence', 'paymentMethod']
            }
          }
        }
      }
    )

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text
    if (!responseText) {
      throw new Error('Gemini API returned an empty response')
    }

    const extractedData = JSON.parse(responseText)
    return extractedData

  } catch (error: any) {
    console.error('Error in smart-add API, falling back to regex parser:', error)
    return fallbackParse(prompt)
  }
})
