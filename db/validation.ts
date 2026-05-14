import { z } from 'zod';

export const phoneSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, ''))
  .pipe(
    z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Phone number must be at most 15 digits'),
  );

export const tradeSchema = z.object({
  courseCode: z.string().min(1, 'Course code is required').max(50),
  courseName: z.string().max(255).optional(),
  sectionOffered: z.string().min(1, 'Section offered is required').max(20),
  sectionWanted: z.string().min(1, 'Section wanted is required').max(20),
  description: z.string().optional(),
});

export const tradeUpdateSchema = tradeSchema
  .partial()
  .extend({
    status: z.enum(['open', 'filled', 'cancelled']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type TradeInput = z.infer<typeof tradeSchema>;
export type TradeUpdateInput = z.infer<typeof tradeUpdateSchema>;

export const userProfileSchema = z.object({
  phone: phoneSchema,
  semesterId: z.string().max(50).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  courseSelections: z.record(z.string(), z.string()).optional(),
  llmConfig: z.record(z.string(), z.unknown()).optional(),
});

export const userProfileUpdateSchema = userProfileSchema.partial();

export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;

export const llmMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
});

export const llmRequestSchema = z.object({
  provider: z.enum(['groq'], { message: 'Only Groq is supported' }),
  model: z.string().optional(),
  messages: z.array(llmMessageSchema).min(1, 'At least one message is required'),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().min(1).max(32000).optional(),
  saveKey: z.boolean().optional(),
  userApiKey: z.string().optional(),
});

export type LlmRequest = z.infer<typeof llmRequestSchema>;

export const professorRatingSchema = z.object({
  professorId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  difficulty: z.number().int().min(1).max(5),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(1000),
  courseCode: z.string().min(1, 'Course code is required').max(50),
  semesterId: z.string().min(1, 'Semester ID is required').max(50),
  takeAgain: z.boolean().default(true),
});

export type ProfessorRatingInput = z.infer<typeof professorRatingSchema>;

export function formatZodError(error: z.ZodError): {
  error: string;
  details: { field: string; message: string }[];
} {
  return {
    error: 'Validation failed',
    details: error.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  };
}
