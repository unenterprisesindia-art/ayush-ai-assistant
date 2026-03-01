import express from "express";
import OpenAI from "openai";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

// Your AI endpoint
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/suggest", async (req, res) => {
  const { problem } = req.body;
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert Ayurvedic assistant" },
      { role: "user", content: problem }
    ],
  });
  res.json({ reply: response.choices[0].message.content });
});

// Default fallback to index
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});
