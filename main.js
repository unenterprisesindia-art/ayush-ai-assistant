/**
 * main.js
 * Watson Assistant + Firestore herb lookup bridge.
 *
 * Paste this file as your chatbot handler script.
 * IMPORTANT: Keep the Watson embed script in index.html unchanged.
 */

// =============================
// 1) FIREBASE / FIRESTORE IMPORTS (paste at top of your chatbot JS)
// =============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// =============================
// 2) FIRESTORE INITIALIZATION (uses your existing firebaseConfig)
// =============================
const firebaseConfig = {
  apiKey: "AIzaSyDaQZ_N45ep9fq0ysOhqFfO7ougKhJpQUo",
  authDomain: "ayush-assistant-d52a3.firebaseapp.com",
  projectId: "ayush-assistant-d52a3",
  storageBucket: "ayush-assistant-d52a3.firebasestorage.app",
  messagingSenderId: "503934483863",
  appId: "1:503934483863:web:0e756682e8d648786698d2",
  measurementId: "G-F1JLEEQDKJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// =============================
// 3) FIRESTORE HERB MATCH FUNCTION
// =============================
async function checkHerbQuery(userMessage) {
  const normalizedMessage = (userMessage || "").toLowerCase().trim();
  if (!normalizedMessage) return null;

  const snapshot = await getDocs(collection(db, "herbs"));

  for (const herbDoc of snapshot.docs) {
    const herbData = herbDoc.data();
    const herbName = String(herbData.name || "").toLowerCase().trim();

    if (herbName && normalizedMessage.includes(herbName)) {
      return {
        id: herbDoc.id,
        ...herbData
      };
    }
  }

  return null;
}

function buildHerbResponse(herb) {
  const benefits = Array.isArray(herb.benefits) ? herb.benefits.join(", ") : "Not specified";
  const usedFor = Array.isArray(herb.used_for) ? herb.used_for.join(", ") : "Not specified";
  const precautions = Array.isArray(herb.precautions) ? herb.precautions.join(", ") : "Not specified";
  const forms = Array.isArray(herb.forms) ? herb.forms.join(", ") : "Not specified";

  return [
    `🌿 ${herb.name || "This herb"} (${herb.category || "AYUSH herb"})`,
    `Benefits: ${benefits}`,
    `Used for: ${usedFor}`,
    `Forms: ${forms}`,
    `Dosage: ${herb.dosage || "Consult a professional"}`,
    `Precautions: ${precautions}`
  ].join("\n");
}

// =============================
// 4) CHAT MESSAGE HANDLER HOOK
//    - checkHerbQuery() runs first.
//    - If matched: send Firestore-based custom reply.
//    - Else: continue normal Watson flow.
// =============================
function attachFirestoreOverride(instance) {
  // Intercept outgoing user messages before Watson handles them.
  instance.on({
    type: "pre:send",
    handler: async (event, next) => {
      try {
        const userMessage = event?.data?.input?.text || "";
        const herbData = await checkHerbQuery(userMessage);

        if (herbData) {
          // Custom local response from Firestore.
          await instance.send({
            input: {
              message_type: "text",
              text: buildHerbResponse(herbData)
            }
          });

          // Stop this message from being sent to Watson since we already replied.
          return;
        }
      } catch (error) {
        console.error("Firestore herb check failed:", error);
      }

      // No herb match (or error): continue standard Watson Assistant behavior.
      next();
    }
  });
}

// =============================
// 5) INSERT LOGIC INTO EXISTING WATSON SETUP (without editing index embed block)
//    This wraps existing onLoad and adds Firestore smart-routing.
// =============================
function wireWatsonOnLoad() {
  if (!window.watsonAssistantChatOptions) return false;

  const originalOnLoad = window.watsonAssistantChatOptions.onLoad;

  window.watsonAssistantChatOptions.onLoad = async (instance) => {
    attachFirestoreOverride(instance);

    if (typeof originalOnLoad === "function") {
      await originalOnLoad(instance);
    } else {
      await instance.render();
    }
  };

  return true;
}

// Retry until embed options are available (works with inline script in index.html)
if (!wireWatsonOnLoad()) {
  const watcher = setInterval(() => {
    if (wireWatsonOnLoad()) {
      clearInterval(watcher);
    }
  }, 50);
}
