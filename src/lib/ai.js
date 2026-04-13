// AI API helper for Bear Witness Dashboard

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

function getApiKey() {
  try {
    // Try bw2: prefix first (current), then bw: (legacy)
    const raw = localStorage.getItem('bw2:settings:global') || localStorage.getItem('bw:settings:global');
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings.apiKey) return settings.apiKey;
    }
    // Also check if there's a standalone key stored directly
    const directKey = localStorage.getItem('bw2:apiKey') || localStorage.getItem('bw:apiKey');
    if (directKey) return directKey;
    return null;
  } catch {
    return null;
  }
}

export async function callAI({ system, user, maxTokens = 1024, useWebSearch = false }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured. Go to Settings to add your Anthropic API key.');
  }

  const messages = [{ role: 'user', content: user }];

  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    messages,
  };

  if (system) {
    body.system = system;
  }

  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }];
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || `API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Extract text from content blocks
    const textBlocks = data.content.filter(block => block.type === 'text');
    if (textBlocks.length === 0) {
      return 'No response generated.';
    }

    return textBlocks.map(block => block.text).join('\n\n');
  } catch (error) {
    if (error.message.includes('API key')) throw error;
    if (error.message.includes('API request failed')) throw error;
    throw new Error(`AI request failed: ${error.message}`);
  }
}
