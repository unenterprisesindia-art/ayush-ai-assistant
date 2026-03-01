import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Firebase setup
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/suggest", async (req, res) => {
  try {
    const userProblem = req.body.problem;

    // 1️⃣ Get all herbs from Firebase
    const snapshot = await db.collection("Herbs").get();

    let herbList = [];
    snapshot.forEach(doc => {
      herbList.push(doc.data());
    });

    // 2️⃣ Format herbs for AI
    const formattedHerbs = herbList.map(h =>
      `${h.name} - ${h.benefits} - Used for: ${h.used_for}`
    ).join("\n");

    // 3️⃣ Ask AI to suggest only from database
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are an Ayurvedic expert.
Only suggest herbs from the list provided.
Do not suggest anything outside the list.
Give answer in structured format:

Herb Name:
Why:
Dosage:
Precaution:
`
        },
        {
          role: "user",
          content: `
User problem: ${userProblem}

Available herbs:
${formattedHerbs}
`
        }
      ],
    });

    res.json({
      reply: response.choices[0].message.content
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating suggestion");
  }
});

app.listen(3000, () => console.log("AI + Firebase Server Running"));
