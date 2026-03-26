import { similarity } from 'ml-distance';
import { kmeans } from 'ml-kmeans';
import type { GeneratedSchedule } from './schedule-types';

/**
 * TF-IDF (Term Frequency - Inverse Document Frequency) implementation
 * for converting schedules to numerical vectors.
 */
class TFIDF {
  private documents: Map<string, string>;
  private idf: Map<string, number>;
  private vocabulary: Set<string>;
  private isDirty: boolean;

  constructor() {
    this.documents = new Map();
    this.idf = new Map();
    this.vocabulary = new Set();
    this.isDirty = false;
  }

  /**
   * Add a document to the corpus
   * @param id - Unique identifier for the document
   * @param text - Text content of the document
   */
  addDocument(id: string, text: string): void {
    this.documents.set(id, text.toLowerCase());
    this.isDirty = true;
  }

  /**
   * Remove a document from the corpus
   */
  removeDocument(id: string): boolean {
    const deleted = this.documents.delete(id);
    if (deleted) {
      this.isDirty = true;
    }
    return deleted;
  }

  /**
   * Compute inverse document frequency for all terms
   */
  private computeIdf(): void {
    if (!this.isDirty) return;

    const df = new Map<string, number>();
    const totalDocs = this.documents.size;

    // Count document frequency for each term
    for (const text of this.documents.values()) {
      const terms = new Set(this.tokenize(text));
      for (const term of terms) {
        df.set(term, (df.get(term) || 0) + 1);
      }
    }

    // Compute IDF: log(N / df) + 1
    this.idf.clear();
    for (const [term, docFreq] of df.entries()) {
      this.idf.set(term, Math.log(totalDocs / docFreq) + 1);
    }

    // Build vocabulary
    this.vocabulary = new Set(this.idf.keys());
    this.isDirty = false;
  }

  /**
   * Tokenize text into terms (simple word splitting)
   */
  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }

  /**
   * Compute term frequency for a document
   */
  private computeTermFrequency(text: string): Map<string, number> {
    const terms = this.tokenize(text);
    const tf = new Map<string, number>();

    for (const term of terms) {
      tf.set(term, (tf.get(term) || 0) + 1);
    }

    // Normalize by total terms
    const totalTerms = terms.length;
    if (totalTerms > 0) {
      for (const [term, count] of tf.entries()) {
        tf.set(term, count / totalTerms);
      }
    }

    return tf;
  }

  /**
   * Get TF-IDF vector for a text document
   * @param text - Input text
   * @returns TF-IDF vector aligned with vocabulary
   */
  getTfIdfVector(text: string): number[] {
    this.computeIdf();

    const tf = this.computeTermFrequency(text.toLowerCase());
    const vocabulary = Array.from(this.vocabulary).sort();

    return vocabulary.map((term) => {
      const termFreq = tf.get(term) || 0;
      const idf = this.idf.get(term) || 1;
      return termFreq * idf;
    });
  }

  /**
   * Get all document vectors as a matrix
   */
  getAllVectors(): { vectors: number[][]; ids: string[] } {
    this.computeIdf();

    const ids: string[] = [];
    const vectors: number[][] = [];

    for (const [id, text] of this.documents.entries()) {
      ids.push(id);
      vectors.push(this.getTfIdfVector(text));
    }

    return { vectors, ids };
  }

  /**
   * Get vocabulary size
   */
  getVocabularySize(): number {
    this.computeIdf();
    return this.vocabulary.size;
  }
}

/**
 * Convert a schedule to text representation for embedding
 */
function scheduleToText(schedule: GeneratedSchedule): string {
  const parts: string[] = [];

  // Course and section info
  for (const section of schedule.sections) {
    parts.push(`${section.courseId} ${section.sectionNumber}`);
    if (section.instructor) {
      parts.push(section.instructor);
    }
  }

  // Time slot info
  for (const section of schedule.sections) {
    for (const slot of section.timeSlots) {
      const dayStr = slot.day;
      const timeStr = `${slot.startTime}-${slot.endTime}`;
      parts.push(`${dayStr} ${timeStr}`);
    }
  }

  // Add score and credits as text tokens for clustering
  parts.push(`score${Math.round(schedule.score / 10)}`);
  parts.push(`credits${schedule.totalCredits}`);

  return parts.join(' ');
}

/**
 * Embed a single schedule using TF-IDF
 */
export function embedSchedule(schedule: GeneratedSchedule, tfidf: TFIDF): number[] {
  const text = scheduleToText(schedule);
  return tfidf.getTfIdfVector(text);
}

/**
 * Embed multiple schedules and return vectors with mapping
 */
export function embedSchedules(schedules: GeneratedSchedule[]): {
  vectors: number[][];
  tfidf: TFIDF;
} {
  const tfidf = new TFIDF();

  // Add all schedules to TF-IDF corpus
  schedules.forEach((schedule, idx) => {
    tfidf.addDocument(`schedule-${idx}`, scheduleToText(schedule));
  });

  const { vectors } = tfidf.getAllVectors();
  return { vectors, tfidf };
}

/**
 * Compute cosine similarity between two vectors
 * Uses ml-distance library for optimized computation
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }
  if (vec1.length === 0) {
    return 0;
  }
  // ml-distance similarity.cosine returns similarity (1 = identical, 0 = orthogonal)
  return similarity.cosine(vec1, vec2);
}

/**
 * Find most similar schedules to a query schedule
 * @param query - Query schedule
 * @param candidates - Candidate schedules to compare
 * @param topN - Number of results to return
 * @returns Sorted candidates with similarity scores
 */
export function findSimilarSchedules(
  query: GeneratedSchedule,
  candidates: GeneratedSchedule[],
  topN: number = 5,
): Array<{ schedule: GeneratedSchedule; similarity: number }> {
  const { vectors } = embedSchedules([query, ...candidates]);
  const queryVector = vectors[0];

  const results = candidates.map((schedule, idx) => ({
    schedule,
    similarity: cosineSimilarity(queryVector, vectors[idx + 1]),
  }));

  return results.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
}

/**
 * Cluster schedules using K-means algorithm
 * @param schedules - Schedules to cluster
 * @param k - Number of clusters
 * @returns Clustered schedules with assignments
 */
export function clusterSchedulesByEmbedding(
  schedules: GeneratedSchedule[],
  k: number = 5,
): {
  clusters: number[];
  centroids: number[][];
  assignments: Map<number, GeneratedSchedule[]>;
} {
  if (schedules.length === 0) {
    return { clusters: [], centroids: [], assignments: new Map() };
  }

  // Handle edge case: fewer schedules than clusters
  const effectiveK = Math.min(k, schedules.length);

  // Embed schedules
  const { vectors } = embedSchedules(schedules);

  // Run K-means
  const result = kmeans(vectors, effectiveK, {
    initialization: 'kmeans++',
    maxIterations: 100,
    tolerance: 1e-6,
  });

  // Group schedules by cluster assignment
  const assignments = new Map<number, GeneratedSchedule[]>();
  for (let i = 0; i < effectiveK; i++) {
    assignments.set(i, []);
  }

  result.clusters.forEach((clusterIdx, scheduleIdx) => {
    const group = assignments.get(clusterIdx) || [];
    group.push(schedules[scheduleIdx]);
    assignments.set(clusterIdx, group);
  });

  return {
    clusters: result.clusters,
    centroids: result.centroids,
    assignments,
  };
}

/**
 * Generate cluster labels based on schedule characteristics
 */
export function generateClusterLabel(schedules: GeneratedSchedule[]): string {
  if (schedules.length === 0) {
    return 'Unknown';
  }

  // Analyze common patterns
  const dayCounts = { M: 0, T: 0, W: 0, Th: 0, F: 0, Sa: 0, Su: 0 };
  const timeSlots: string[] = [];
  let totalCredits = 0;

  schedules.forEach((schedule) => {
    totalCredits += schedule.totalCredits;
    schedule.sections.forEach((section) => {
      section.timeSlots.forEach((slot) => {
        dayCounts[slot.day]++;
        const hour = parseInt(slot.startTime.split(':')[0], 10);
        if (hour < 12) {
          timeSlots.push('morning');
        } else if (hour < 17) {
          timeSlots.push('afternoon');
        } else {
          timeSlots.push('evening');
        }
      });
    });
  });

  const avgCredits = totalCredits / schedules.length;

  // Find dominant days
  const dominantDays = Object.entries(dayCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day]) => day);

  // Find dominant time
  const morningCount = timeSlots.filter((t) => t === 'morning').length;
  const afternoonCount = timeSlots.filter((t) => t === 'afternoon').length;
  const timePreference =
    morningCount > afternoonCount * 1.5
      ? 'Morning'
      : afternoonCount > morningCount * 1.5
        ? 'Afternoon'
        : 'Mixed';

  // Generate label
  const dayStr = dominantDays.join('');
  return `${dayStr || 'Flexible'} • ${timePreference} • ${avgCredits.toFixed(0)} Credits`;
}

export { TFIDF };
