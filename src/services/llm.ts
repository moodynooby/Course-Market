import type { Schedule, Preferences, OptimizationResult } from '../types';

const DEFAULT_LLM_ENDPOINT = 'http://localhost:11434/api/chat';

export interface LLMConfig {
  endpoint?: string;
  model?: string;
  timeout?: number;
}

let llmConfig: LLMConfig = {
  endpoint: import.meta.env.VITE_LLM_ENDPOINT || DEFAULT_LLM_ENDPOINT,
  model: 'llama3.2',
  timeout: 30000
};

export function configureLLM(config: Partial<LLMConfig>): void {
  llmConfig = { ...llmConfig, ...config };
}

export function getLLMConfig(): LLMConfig {
  return { ...llmConfig };
}

function formatScheduleForLLM(schedule: Schedule): string {
  const sectionsList = schedule.sections.map(s => {
    const times = s.timeSlots.map(t => `${t.day} ${t.startTime}-${t.endTime}`).join(', ');
    return `- ${s.sectionNumber}: ${s.instructor}, ${times}, ${s.location}`;
  }).join('\n');
  
  return `Schedule (Score: ${schedule.score}/100, Credits: ${schedule.totalCredits}):
${sectionsList}`;
}

function formatPreferencesForLLM(prefs: Preferences): string {
  return `User Preferences:
- Preferred time: ${prefs.preferredStartTime} - ${prefs.preferredEndTime}
- Max gap between classes: ${prefs.maxGapMinutes} minutes
- Prefer consecutive days: ${prefs.preferConsecutiveDays ? 'Yes' : 'No'}
- Prefer morning classes: ${prefs.preferMorning ? 'Yes' : 'No'}
- Prefer afternoon classes: ${prefs.preferAfternoon ? 'Yes' : 'No'}
- Credit range: ${prefs.minCredits} - ${prefs.maxCredits}
- Avoid days: ${prefs.avoidDays.join(', ') || 'None'}
- Excluded instructors: ${prefs.excludeInstructors.join(', ') || 'None'}`;
}

export async function isLLMAvailable(): Promise<boolean> {
  try {
    const response = await fetch(llmConfig.endpoint?.replace('/api/chat', '/api/tags') || '', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function queryLLM(prompt: string, systemPrompt?: string): Promise<string> {
  const isAvailable = await isLLMAvailable();
  if (!isAvailable) {
    throw new Error('LLM not available');
  }

  try {
    const response = await fetch(llmConfig.endpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: llmConfig.model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false
      }),
      signal: AbortSignal.timeout(llmConfig.timeout || 30000)
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || data.response || '';
  } catch (error) {
    throw new Error(`LLM query failed: ${(error as Error).message}`);
  }
}

export async function optimizeWithLLM(
  schedules: Schedule[],
  preferences: Preferences
): Promise<OptimizationResult> {
  if (schedules.length === 0) {
    return {
      schedules,
      bestSchedule: null,
      error: 'No schedules to optimize'
    };
  }

  const isAvailable = await isLLMAvailable();
  
  if (!isAvailable) {
    return {
      schedules,
      bestSchedule: schedules[0] || null,
      aiAnalysis: 'LLM not available. Using deterministic scoring.'
    };
  }

  const schedulesText = schedules.slice(0, 10).map((s, i) => 
    `Option ${i + 1}:\n${formatScheduleForLLM(s)}`
  ).join('\n\n');

  const prompt = `You are a course schedule advisor. Analyze the following schedule options and recommend the best one based on user preferences.

${formatPreferencesForLLM(preferences)}

Available Schedules:
${schedulesText}

Based on the preferences, analyze each schedule and provide:
1. Which schedule is best and why (give the option number)
2. A brief analysis of each option's strengths and weaknesses
3. Any specific suggestions for improvement

Respond in this format:
RECOMMENDED: [option number]
ANALYSIS: [your detailed analysis]`;

  try {
    const response = await fetch(llmConfig.endpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: llmConfig.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false
      }),
      signal: AbortSignal.timeout(llmConfig.timeout || 30000)
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.message?.content || data.response || '';
    
    const match = aiResponse.match(/RECOMMENDED:\s*(\d+)/i);
    const recommendedIndex = match ? parseInt(match[1], 10) - 1 : 0;
    
    const bestSchedule = schedules[Math.min(recommendedIndex, schedules.length - 1)] || schedules[0];

    return {
      schedules,
      bestSchedule,
      aiAnalysis: aiResponse
    };

  } catch (error) {
    return {
      schedules,
      bestSchedule: schedules[0] || null,
      error: `LLM optimization failed: ${(error as Error).message}. Using deterministic scoring.`,
      aiAnalysis: 'LLM request failed. Falling back to deterministic scoring.'
    };
  }
}