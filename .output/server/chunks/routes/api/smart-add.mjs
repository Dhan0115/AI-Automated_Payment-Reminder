import { d as defineEventHandler, r as readBody, g as getQuery, c as createError } from '../../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '@iconify/utils';
import 'consola';

function fallbackParse(prompt) {
  const normalized = prompt.toLowerCase();
  const amountMatch = prompt.match(/(?:₱|\$|php\s*|val\s*)?(\d+(?:\.\d+)?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
  let name = "Custom Bill";
  const names = ["netflix", "spotify", "electricity", "water", "rent", "wifi", "globe", "meralco", "insurance", "card"];
  for (const n of names) {
    if (normalized.includes(n)) {
      name = n.charAt(0).toUpperCase() + n.slice(1);
      break;
    }
  }
  let category = "Other";
  if (["netflix", "spotify"].includes(name.toLowerCase())) {
    category = "Subscription";
  } else if (["electricity", "water", "meralco"].includes(name.toLowerCase())) {
    category = "Utilities";
  } else if (name.toLowerCase() === "rent") {
    category = "Rent";
  } else if (["wifi", "globe"].includes(name.toLowerCase())) {
    category = "Utilities";
  }
  const dayMatch = normalized.match(/(\d+)(?:st|nd|rd|th)?/);
  let day = 5;
  if (dayMatch) {
    const parsedDay = parseInt(dayMatch[1]);
    if (parsedDay >= 1 && parsedDay <= 31) {
      day = parsedDay;
    }
  }
  const today = /* @__PURE__ */ new Date();
  let year = today.getFullYear();
  let month = today.getMonth();
  if (today.getDate() >= day) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  const dueDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  let recurrence = "monthly";
  if (normalized.includes("one-time") || normalized.includes("once")) {
    recurrence = "one-time";
  } else if (normalized.includes("weekly")) {
    recurrence = "weekly";
  } else if (normalized.includes("yearly") || normalized.includes("annual")) {
    recurrence = "yearly";
  }
  let paymentMethod = "";
  if (normalized.includes("card") || normalized.includes("credit")) {
    paymentMethod = "Credit Card";
  } else if (normalized.includes("gcash")) {
    paymentMethod = "GCash";
  } else if (normalized.includes("cash")) {
    paymentMethod = "Cash";
  }
  return {
    name,
    category,
    amount,
    dueDate: dueDateStr,
    daysBefore: 2,
    email: "you@example.com",
    paid: false,
    recurrence,
    paymentMethod,
    _isMock: true
    // Flag to notify frontend
  };
}
const smartAdd = defineEventHandler(async (event) => {
  var _a, _b, _c, _d, _e, _f, _g;
  const method = event.node.req.method;
  let prompt = "";
  if (method === "POST") {
    const body = await readBody(event);
    prompt = body == null ? void 0 : body.prompt;
  } else if (method === "GET") {
    const query = getQuery(event);
    prompt = query.prompt;
  }
  if (!prompt) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing prompt. Please provide a prompt in the request body (POST) or as a query parameter (GET)."
    });
  }
  const apiKey = (_b = (_a = globalThis.process) == null ? void 0 : _a.env) == null ? void 0 : _b.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("\u26A0\uFE0F GEMINI_API_KEY is not configured. Falling back to local smart regex parser.");
    return fallbackParse(prompt);
  }
  const today = /* @__PURE__ */ new Date();
  const todayStr = today.toISOString().split("T")[0];
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayOfWeek = daysOfWeek[today.getDay()];
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
  amount: number | null; // Just the number, e.g. 598 (from \u20B1598) or null if not specified
  dueDate: string; // YYYY-MM-DD format. Must be a valid, resolved future calendar date!
  daysBefore: number; // Number of days before the due date to send a reminder. Default to 2 if not mentioned.
  email: string; // Email to send the reminder to, default to "" if not mentioned.
  paid: boolean; // default to false.
  recurrence: string; // "monthly", "weekly", "one-time", "yearly" etc. Default to "monthly" if recurring is implied.
  paymentMethod: string; // e.g. "Credit Card", "ATM Card", "Gcash", "Cash", etc. Default to "" if not mentioned.
}
`;
  try {
    const response = await $fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        body: {
          contents: [
            {
              role: "user",
              parts: [{ text: `Process this reminder instruction and extract the JSON: "${prompt}"` }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING", description: "The name of the bill, e.g. Netflix, Rent, Electricity" },
                category: { type: "STRING", description: "Category like Subscription, Utilities, Rent, Loan, Insurance, Credit Card, etc." },
                amount: { type: "NUMBER", nullable: true, description: "Numeric amount of the bill, e.g., 598" },
                dueDate: { type: "STRING", description: "The next due date in YYYY-MM-DD format, calculated relative to today" },
                daysBefore: { type: "INTEGER", description: "Days before to remind, default 2" },
                email: { type: "STRING", description: "Email address if mentioned, else empty string" },
                paid: { type: "BOOLEAN", description: "Whether it is paid, default false" },
                recurrence: { type: "STRING", description: "Recurrence frequency, e.g., monthly, weekly, yearly, one-time" },
                paymentMethod: { type: "STRING", description: "Method of payment like ATM card, credit card, GCash, etc." }
              },
              required: ["name", "category", "amount", "dueDate", "daysBefore", "email", "paid", "recurrence", "paymentMethod"]
            }
          }
        }
      }
    );
    const responseText = (_g = (_f = (_e = (_d = (_c = response.candidates) == null ? void 0 : _c[0]) == null ? void 0 : _d.content) == null ? void 0 : _e.parts) == null ? void 0 : _f[0]) == null ? void 0 : _g.text;
    if (!responseText) {
      throw new Error("Gemini API returned an empty response");
    }
    const extractedData = JSON.parse(responseText);
    return extractedData;
  } catch (error) {
    console.error("Error in smart-add API, falling back to regex parser:", error);
    return fallbackParse(prompt);
  }
});

export { smartAdd as default };
//# sourceMappingURL=smart-add.mjs.map
