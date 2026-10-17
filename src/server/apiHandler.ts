import type { IncomingMessage, ServerResponse } from 'http';
import { analyzeFace, generateTimeTravelPortrait } from './geminiService.ts';

// Helper to parse JSON body from incoming Node HTTP request
async function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Safeguard against extremely large payloads (> 25MB)
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        if (!body) return resolve({});
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', (err) => reject(err));
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next?: () => void
): Promise<void> {
  const url = req.url || '';

  if (!url.startsWith('/api/')) {
    if (next) return next();
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  // Handle CORS and preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (url === '/api/analyze-face' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { imageBase64, mimeType } = body as { imageBase64?: string; mimeType?: string };

      if (!imageBase64) {
        return sendJson(res, 400, { error: 'imageBase64 is required' });
      }

      const result = await analyzeFace(imageBase64, mimeType);
      return sendJson(res, 200, result);
    }

    if (url === '/api/time-travel' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { userPhotoBase64, eraName, userPrompt } = body as {
        userPhotoBase64?: string;
        eraName?: string;
        userPrompt?: string;
      };

      if (!userPhotoBase64) {
        return sendJson(res, 400, { error: 'userPhotoBase64 is required' });
      }

      const result = await generateTimeTravelPortrait(
        userPhotoBase64,
        eraName || 'Historical Era',
        userPrompt || ''
      );
      return sendJson(res, 200, result);
    }

    // Health check endpoint
    if (url === '/api/health') {
      return sendJson(res, 200, {
        status: 'ok',
        hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      });
    }

    if (next) {
      return next();
    }
    sendJson(res, 404, { error: 'Endpoint not found' });
  } catch (error: unknown) {
    console.error('API Error:', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
}
