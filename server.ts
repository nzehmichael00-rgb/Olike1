import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Lazy-loaded Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// REST route for chat proxy
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Attempt to invoke the lazy-loaded client
    let ai;
    try {
      ai = getGeminiClient();
    } catch (apiErr: any) {
      return res.status(401).json({ 
        error: "Gemini API key is not configured or is missing. Please add it in Settings > Secrets." 
      });
    }
    
    // We can use the chat API
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: `You are an expert AI Coding Coach and Workspace Companion for Google AI Studio. 
The user is working in an interactive web coding environment.
Your purpose is to help the user design, structure, or brainstorm their next web application idea, write code patterns, or refine their thoughts.
Keep your responses highly friendly, encouraging, clear, and professional. 
Utilize clean Markdown with concise code blocks when writing code examples.`,
      },
      history: history || []
    });
    
    const response = await chat.sendMessage({ message: prompt });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred with the Gemini API. Please try again." });
  }
});

// REST route for Paystack transaction verification
app.get('/api/paystack/verify/:reference', async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    if (!reference) {
      return res.status(400).json({ error: "Reference parameter is required" });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ error: "PAYSTACK_SECRET_KEY environment variable is missing on the server." });
    }
    
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data: any = await response.json();
    if (data && data.status && data.data && data.data.status === 'success') {
      res.json({
        success: true,
        amount: data.data.amount / 100, // Paystack returns amount in kobo, convert to Naira
        reference: data.data.reference,
        status: data.data.status,
        customer: data.data.customer
      });
    } else {
      res.status(400).json({
        success: false,
        error: (data && data.message) || "Transaction verification failed"
      });
    }
  } catch (err: any) {
    console.error("Paystack verification exception:", err);
    res.status(500).json({ error: err.message || "An error occurred during Paystack verification." });
  }
});

// REST route for Paystack transaction initialization
app.post('/api/paystack/initialize', async (req: Request, res: Response) => {
  try {
    const { email, amount, callbackUrl } = req.body;
    if (!email || !amount) {
      return res.status(400).json({ error: "Email and amount are required" });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ error: "PAYSTACK_SECRET_KEY environment variable is missing on the server." });
    }
    
    const body: any = {
      email,
      amount: Math.round(amount * 100), // convert to kobo
    };
    
    if (callbackUrl) {
      body.callback_url = callbackUrl;
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data: any = await response.json();
    if (data && data.status && data.data) {
      res.json({
        success: true,
        authorization_url: data.data.authorization_url,
        reference: data.data.reference
      });
    } else {
      res.status(400).json({
        success: false,
        error: (data && data.message) || "Failed to initialize Paystack transaction"
      });
    }
  } catch (err: any) {
    console.error("Paystack initialization exception:", err);
    res.status(500).json({ error: err.message || "An error occurred during Paystack initialization." });
  }
});

// Serve frontend in production, or mount Vite middleware in development
const isProd = process.env.NODE_ENV === 'production' || 
               !import.meta.url.includes('server.ts');
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

if (!isProd) {
  // ESM dynamic import to avoid production bundling issue with Vite dev deps
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  console.log(`[FULLSTACK] Server running in DEVELOPMENT mode on http://localhost:${port}`);
} else {
  // Serve built static files
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  // Fallback to index.html for SPA router
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log(`[FULLSTACK] Server running in PRODUCTION mode on http://localhost:${port}`);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`[FULLSTACK] Listening on 0.0.0.0:${port}`);
});
