import express from 'express';
import { createServer as createViteServer } from 'vite';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Realtime API用の環境変数
const realtimeApiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY;
const realtimeEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
const realtimeDeploymentName = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_NAME;
const realtimeApiVersion = process.env.AZURE_OPENAI_REALTIME_API_VERSION;

// Chat API用の環境変数
const chatApiKey = process.env.AZURE_OPENAI_CHAT_API_KEY;
const chatEndpoint = process.env.AZURE_OPENAI_CHAT_ENDPOINT;
const chatDeploymentName = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT_NAME;
const chatApiVersion = process.env.AZURE_OPENAI_CHAT_API_VERSION;

// Create Vite server in middleware mode
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'spa',
});

app.use(express.json());

// API routes BEFORE vite middleware
// API route for token generation
app.get('/api/token', async (req, res) => {
  try {
    // Generate ephemeral token for the client
    // see: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio-webrtc
    const response = await fetch(
      `${realtimeEndpoint}/openai/realtimeapi/sessions?api-version=${realtimeApiVersion}`,
      {
        method: 'POST',
        headers: {
          'api-key': realtimeApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: realtimeDeploymentName,
          voice: 'verse',
        }),
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      details: error.message 
    });
  }
});

// API route for chat completion
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, parseJSON = false } = req.body;
    
    const response = await fetch(`${chatEndpoint}/openai/deployments/${chatDeploymentName}/chat/completions?api-version=${chatApiVersion}`, {
      method: 'POST',
      headers: {
        'api-key': chatApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        ...(parseJSON && { response_format: { type: 'json_object' } })
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'API call failed');
    }
    
    res.json({
      content: data.choices[0].message.content
    });
  } catch (error) {
    console.error('Chat completion error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Vite middleware for serving the frontend
app.use(vite.middlewares);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
