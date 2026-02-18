import type {
  Schedule,
  Preferences,
  OptimizationResult,
  ScheduleParseResult,
  HeaderMappingSuggestion
} from '../types';
import { getHeaderAliases, getScheduleCorrections, getAIRules } from './feedback';

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

export async function suggestMappingsWithLLM(
  headers: string[],
  sampleRows: Record<string, string>[],
  userInstructions?: string
): Promise<Record<string, string>> {
  const isAvailable = await isLLMAvailable();
  if (!isAvailable) return {};

  const learnedAliases = getHeaderAliases();
  const fewShotContext = Object.entries(learnedAliases)
    .slice(0, 5)
    .map(([alias, data]) => `"${alias}" -> "${data.canonicalHeader}"`)
    .join('\n');

  const aiRules = getAIRules()
    .filter(r => r.type === 'mapping')
    .map(r => `- ${r.instruction}`)
    .join('\n');

  const prompt = `You are a data engineer helping to map CSV headers to a standard course schema.
The standard fields are:
- courseCode (e.g., CS 101, CRN 12345)
- courseName (e.g., Intro to Programming)
- subject (e.g., CS, MATH)
- sectionNumber (e.g., 001, A)
- instructor (e.g., Dr. Smith)
- days (e.g., MWF, TTh)
- startTime (e.g., 09:00, 1:00 PM)
- endTime (e.g., 10:00, 2:15 PM)
- schedule (combined days and times, e.g., "MWF 9:00-9:50")
- location (e.g., Room 101)
- credits (e.g., 3, 4.0)
- term (e.g., Fall 2024)

Detected CSV Headers: ${headers.join(', ')}

Sample Data (first 3 rows):
${JSON.stringify(sampleRows.slice(0, 3), null, 2)}

${fewShotContext ? `Previous learned mappings for context:\n${fewShotContext}\n` : ''}
${aiRules ? `Learned Rules:\n${aiRules}\n` : ''}
${userInstructions ? `User Instructions: ${userInstructions}\n` : ''}

Respond ONLY with a JSON object mapping the CSV headers to the standard fields.
Example: {"CRN": "courseCode", "Title": "courseName"}
Unmapped headers should be omitted.`;

  try {
    const response = await fetch(llmConfig.endpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: llmConfig.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        format: 'json'
      }),
      signal: AbortSignal.timeout(llmConfig.timeout || 30000)
    });

    if (!response.ok) throw new Error('LLM request failed');
    const data = await response.json();
    const content = data.message?.content || data.response || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('AI mapping failed:', error);
    return {};
  }
}

export async function parseScheduleWithLLM(
  scheduleString: string,
  userInstructions?: string
): Promise<ScheduleParseResult> {
  const isAvailable = await isLLMAvailable();
  if (!isAvailable) return { timeSlots: [], isValid: false, error: 'LLM not available' };

  const learnedCorrections = getScheduleCorrections();
  const fewShotContext = Object.entries(learnedCorrections)
    .filter(([_, data]) => data.successCount > 0)
    .slice(0, 3)
    .map(([raw, data]) => `"${raw}" -> ${data.days.join('')} ${data.startTime}-${data.endTime}`)
    .join('\n');

  const aiRules = getAIRules()
    .filter(r => r.type === 'parsing')
    .map(r => `- ${r.instruction}`)
    .join('\n');

  const prompt = `Extract schedule information from this string: "${scheduleString}"

${fewShotContext ? `Examples of previous correct extractions:\n${fewShotContext}\n` : ''}
${aiRules ? `Learned Rules:\n${aiRules}\n` : ''}
${userInstructions ? `User Context/Instructions: ${userInstructions}\n` : ''}

Standard days are: M, T, W, Th, F, Sa, Su.
Times should be in 24-hour HH:mm format.

Respond ONLY with a JSON object:
{
  "timeSlots": [{"day": "M", "startTime": "09:00", "endTime": "09:50"}],
  "isValid": true
}
If it cannot be parsed, set isValid to false and provide an error message.`;

  try {
    const response = await fetch(llmConfig.endpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: llmConfig.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        format: 'json'
      }),
      signal: AbortSignal.timeout(llmConfig.timeout || 30000)
    });

    if (!response.ok) throw new Error('LLM request failed');
    const data = await response.json();
    const content = data.message?.content || data.response || '{}';
    const result = JSON.parse(content);
    return {
      timeSlots: result.timeSlots || [],
      isValid: !!result.isValid,
      error: result.error,
      formatUsed: 'AI'
    };
  } catch (error) {
    return { timeSlots: [], isValid: false, error: (error as Error).message };
  }
}

export async function induceParsingRuleWithLLM(
  instruction: string,
  sampleValue?: string
): Promise<{ pattern: string; separator: string; description: string } | null> {
  const isAvailable = await isLLMAvailable();
  if (!isAvailable) return null;

  const prompt = `You are a regex expert. Convert the following natural language instruction into a regex pattern and a separator for parsing schedule strings.
Instruction: "${instruction}"
${sampleValue ? `Sample Value: "${sampleValue}"` : ''}

The regex should have 3 capture groups:
1. Days (e.g. MWF, Mon)
2. Start Time
3. End Time

Respond ONLY with a JSON object:
{
  "pattern": "regex_pattern_here",
  "separator": "separator_here_if_any",
  "description": "short_description"
}`;

  try {
    const response = await fetch(llmConfig.endpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: llmConfig.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        format: 'json'
      }),
      signal: AbortSignal.timeout(llmConfig.timeout || 30000)
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.message?.content || data.response || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('AI rule induction failed:', error);
    return null;
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