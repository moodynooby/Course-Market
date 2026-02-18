import type { CSVParsingRule } from '../types';

const NETLIFY_FUNCTION_URL = import.meta.env.VITE_NETLIFY_FUNCTION_URL;
const CSV_RULES_KEY = 'course_market_csv_rules';

let isOnlineMode = !!NETLIFY_FUNCTION_URL;

async function fetchFromNetlify(path: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${NETLIFY_FUNCTION_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Netlify function error: ${response.statusText}`);
  }

  return response.json();
}

export async function getCSVParsingRules(userId: string): Promise<CSVParsingRule[]> {
  if (isOnlineMode) {
    try {
      const result = await fetchFromNetlify(`/csvRules?userId=${userId}`);
      return result.rules || [];
    } catch (error) {
      console.warn('Failed to fetch CSV rules online, falling back to local:', error);
      isOnlineMode = false;
    }
  }

  try {
    const saved = localStorage.getItem(CSV_RULES_KEY);
    const rules = saved ? JSON.parse(saved) : [];
    return rules.filter((r: any) => r.userId === userId);
  } catch {
    return [];
  }
}

export async function saveCSVParsingRule(rule: Partial<CSVParsingRule>): Promise<CSVParsingRule> {
  const fullRule: any = {
    ...rule,
    id: rule.id || Math.random().toString(36).substring(2, 15),
    createdAt: rule.createdAt || new Date().toISOString()
  };

  if (isOnlineMode) {
    try {
      const result = await fetchFromNetlify('/csvRules', {
        method: 'POST',
        body: JSON.stringify({ rule: fullRule }),
      });
      return result.rule || fullRule;
    } catch (error) {
      console.warn('Failed to save CSV rule online, falling back to local:', error);
      isOnlineMode = false;
    }
  }

  try {
    const saved = localStorage.getItem(CSV_RULES_KEY);
    const rules = saved ? JSON.parse(saved) : [];
    rules.push(fullRule);
    localStorage.setItem(CSV_RULES_KEY, JSON.stringify(rules));
  } catch (e) {
    console.warn('Failed to store CSV rule locally:', e);
  }

  return fullRule;
}
