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

export const tradeSchema = z
  .object({
    courseCode: z.string().min(1, 'Course code is required').max(50),
    courseName: z.string().max(255).optional(),
    sectionOffered: z.string().min(1, 'Section offered is required').max(20),
    sectionWanted: z.string().min(1, 'Section wanted is required').max(20),
    description: z.string().max(2000).optional(),
  })
  .refine((d) => d.sectionOffered !== d.sectionWanted, {
    message: 'Offered and wanted sections must differ',
    path: ['sectionWanted'],
  });

export const tradeUpdateSchema = z
  .object({
    courseCode: z.string().min(1).max(50).optional(),
    courseName: z.string().max(255).optional(),
    sectionOffered: z.string().min(1).max(20).optional(),
    sectionWanted: z.string().min(1).max(20).optional(),
    description: z.string().max(2000).optional(),
    status: z.enum(['open', 'filled', 'cancelled']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
  .refine(
    (d) =>
      d.sectionOffered === undefined ||
      d.sectionWanted === undefined ||
      d.sectionOffered !== d.sectionWanted,
    { message: 'Offered and wanted sections must differ', path: ['sectionWanted'] },
  );

export const optionalPhoneSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, ''))
  .pipe(
    z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Phone number must be at most 15 digits')
      .or(z.literal('')),
  )
  .nullish()
  .transform((val) => val ?? undefined);

export type TradeInput = z.infer<typeof tradeSchema>;
export type TradeUpdateInput = z.infer<typeof tradeUpdateSchema>;

export const userProfileSchema = z.object({
  phone: optionalPhoneSchema,
  semesterId: z.string().max(50).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  courseSelections: z.record(z.string(), z.string()).optional(),
  pinnedSelections: z.record(z.string(), z.string()).optional(),
  pushNotificationToken: z.string().max(2048).optional(),
});

export const userProfileUpdateSchema = userProfileSchema.partial();

export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;

export const professorRatingSchema = z.object({
  professorId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  difficulty: z.number().int().min(1).max(5),
  comment: z
    .string()
    .min(10, 'Comment must be at least 10 characters')
    .max(1000)
    .refine((v) => /[a-zA-Z]/.test(v), 'Comment must contain meaningful text'),
  courseCode: z.string().min(1, 'Course code is required').max(50),
  semesterId: z.string().min(1, 'Semester ID is required').max(50),
  takeAgain: z.boolean().default(true),
});

export type ProfessorRatingInput = z.infer<typeof professorRatingSchema>;

export const scheduleGenerateSchema = z.object({
  courses: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      subject: z.string(),
      credits: z.number(),
      description: z.string().optional(),
    }),
  ),
  sections: z.array(
    z.object({
      id: z.string(),
      courseId: z.string(),
      sectionNumber: z.string(),
      instructor: z.string(),
      capacity: z.number(),
      enrolled: z.number(),
      timeSlots: z.array(
        z.object({
          day: z.enum(['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su']),
          startTime: z.string(),
          endTime: z.string(),
          location: z.string().optional(),
        }),
      ),
    }),
  ),
  scheduleSections: z
    .array(
      z.object({
        id: z.string(),
        courseId: z.string(),
        sectionNumber: z.string(),
        instructor: z.string(),
        capacity: z.number(),
        enrolled: z.number(),
        timeSlots: z.array(z.any()),
      }),
    )
    .optional(),
  pinnedSelections: z.record(z.string(), z.string()).optional(),
  preferences: z.record(z.string(), z.unknown()),
  options: z
    .object({
      maxSchedules: z.number().int().min(1).max(2000).optional(),
    })
    .optional(),
});

export type ScheduleGenerateInput = z.infer<typeof scheduleGenerateSchema>;

export const courseSearchQuerySchema = z.object({
  semesterId: z.string().min(1, 'semesterId is required'),
  q: z.string().optional(),
  subject: z.string().optional(),
  openSeatsOnly: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CourseSearchQueryInput = z.infer<typeof courseSearchQuerySchema>;

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
