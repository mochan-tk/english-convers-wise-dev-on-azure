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
const chatSystemPrompt = process.env.AZURE_OPENAI_CHAT_SYSTEM_PROMPT
const chatTransOnOff = process.env.AZURE_OPENAI_CHAT_TRANSLATION_ON_OFF
const chatTransSystemPrompt = process.env.AZURE_OPENAI_CHAT_TRANSLATION_SYSTEM_PROMPT

// Explanation API用の環境変数
const explanationApiKey = process.env.AZURE_OPENAI_EXPLANATION_API_KEY;
const explanationEndpoint = process.env.AZURE_OPENAI_EXPLANATION_ENDPOINT;
const explanationDeploymentName = process.env.AZURE_OPENAI_EXPLANATION_DEPLOYMENT_NAME;
const explanationApiVersion = process.env.AZURE_OPENAI_EXPLANATION_API_VERSION;
const explanationSystemPrompt = process.env.AZURE_OPENAI_EXPLANATION_SYSTEM_PROMPT

// Translation API用の環境変数
const translationApiKey = process.env.AZURE_OPENAI_TRANSLATION_API_KEY;
const translationEndpoint = process.env.AZURE_OPENAI_TRANSLATION_ENDPOINT;
const translationDeploymentName = process.env.AZURE_OPENAI_TRANSLATION_DEPLOYMENT_NAME;
const translationApiVersion = process.env.AZURE_OPENAI_TRANSLATION_API_VERSION;
const translationSystemPrompt = process.env.AZURE_OPENAI_TRANSLATION_SYSTEM_PROMPT

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
    const { userMessage } = req.body;
    
    // Server-side prompt for chat conversation
    const messages = [
      {
        role: 'system',
        content: chatSystemPrompt
      },
      {
        role: 'user',
        content: userMessage
      }
    ];
    
    const response = await fetch(`${chatEndpoint}/openai/deployments/${chatDeploymentName}/chat/completions?api-version=${chatApiVersion}`, {
      method: 'POST',
      headers: {
        'api-key': chatApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        temperature: 0.7
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

// API route for translation
app.post('/api/translate', async (req, res) => {
  try {
    const { text } = req.body;
    
    const messages = [
      {
        role: 'system',
        content: translationSystemPrompt
      },
      {
        role: 'user',
        content: text
      }
    ];
    
    const response = await fetch(`${translationEndpoint}/openai/deployments/${translationDeploymentName}/chat/completions?api-version=${translationApiVersion}`, {
      method: 'POST',
      headers: {
        'api-key': translationApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        temperature: 0.3
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Translation API call failed');
    }
    
    res.json({
      content: data.choices[0].message.content
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Failed to translate text' });
  }
});

// API route for generating explanations
app.post('/api/explanation', async (req, res) => {
  try {
    const { userText, aiText } = req.body;
    
    const messages = [
      {
        role: 'system',
        content: explanationSystemPrompt
      },
      {
        role: 'user',
        content: `User said: "${userText}"\nAI responded: "${aiText}"`
      }
    ];
    
    const response = await fetch(`${explanationEndpoint}/openai/deployments/${explanationDeploymentName}/chat/completions?api-version=${explanationApiVersion}`, {
      method: 'POST',
      headers: {
        'api-key': explanationApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        response_format: { type: 'json_object' }
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
    console.error('Explanation generation error:', error);
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

// Vite middleware for serving the frontend
app.use(vite.middlewares);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
