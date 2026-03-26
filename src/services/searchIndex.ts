import { Index } from 'flexsearch';
import type { Course, Section } from '../types';

interface SearchIndexData {
  courseIndex: Index;
  sectionIndex: Index;
  courseMap: Map<string, Course>;
  sectionMap: Map<string, Section>;
  timestamp: number;
}

/**
 * Search result from FlexSearch
 */
export interface SearchMatch {
  id: string | number;
  type: 'course' | 'section';
  score?: number;
}

/**
 * Manages FlexSearch indexes for courses and sections
 * Provides fast, indexed search with multi-field support
 */
class SearchIndexService {
  private index: SearchIndexData | null = null;
  private readonly INDEX_VERSION = '1.0';

  /**
   * Build search index from courses and sections
   * Call this when semester data loads
   */
  buildIndex(courses: Course[], sections: Section[]): void {
    // Create indexes with optimized settings
    const courseIndex = new Index({
      preset: 'performance',
      tokenize: 'forward',
      cache: true,
    });

    const sectionIndex = new Index({
      preset: 'performance',
      tokenize: 'forward',
      cache: true,
    });

    const courseMap = new Map<string, Course>();
    const sectionMap = new Map<string, Section>();

    // Index courses
    courses.forEach((course) => {
      courseMap.set(course.id, course);

      // Create searchable text from multiple fields
      const searchText = this.buildSearchText([
        course.code,
        course.name,
        course.subject,
        course.description || '',
      ]);

      courseIndex.add(course.id, searchText);
    });

    // Index sections
    sections.forEach((section) => {
      sectionMap.set(section.id, section);

      const searchText = this.buildSearchText([
        section.sectionNumber,
        section.instructor,
        section.courseId,
      ]);

      sectionIndex.add(section.id, searchText);
    });

    this.index = {
      courseIndex,
      sectionIndex,
      courseMap,
      sectionMap,
      timestamp: Date.now(),
    };
  }

  /**
   * Search courses and sections
   * Returns matching IDs sorted by relevance
   */
  search(
    query: string,
    limit = 100,
  ): {
    courseIds: (string | number)[];
    sectionIds: (string | number)[];
  } {
    if (!this.index || !query.trim()) {
      return { courseIds: [], sectionIds: [] };
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Search courses
    const courseResults = this.index.courseIndex.search(normalizedQuery, {
      limit,
      suggest: true,
    });

    // Search sections
    const sectionResults = this.index.sectionIndex.search(normalizedQuery, {
      limit,
      suggest: true,
    });

    return {
      courseIds: Array.isArray(courseResults) ? courseResults : [],
      sectionIds: Array.isArray(sectionResults) ? sectionResults : [],
    };
  }

  /**
   * Get course by ID from index cache
   */
  getCourse(id: string): Course | undefined {
    return this.index?.courseMap.get(id);
  }

  /**
   * Get section by ID from index cache
   */
  getSection(id: string): Section | undefined {
    return this.index?.sectionMap.get(id);
  }

  /**
   * Get all courses from index
   */
  getAllCourses(): Course[] {
    return this.index ? Array.from(this.index.courseMap.values()) : [];
  }

  /**
   * Get all sections from index
   */
  getAllSections(): Section[] {
    return this.index ? Array.from(this.index.sectionMap.values()) : [];
  }

  /**
   * Check if index exists
   */
  hasIndex(): boolean {
    return this.index !== null;
  }

  /**
   * Clear the index
   */
  clear(): void {
    if (this.index) {
      this.index.courseIndex.clear();
      this.index.sectionIndex.clear();
      this.index.courseMap.clear();
      this.index.sectionMap.clear();
      this.index = null;
    }
  }

  /**
   * Build searchable text from multiple fields
   * Normalizes case and removes extra whitespace
   */
  private buildSearchText(fields: string[]): string {
    return fields
      .filter((f) => f?.trim())
      .map((f) => f.toLowerCase().trim())
      .join(' ');
  }

  /**
   * Get index statistics
   */
  getStats(): {
    courseCount: number;
    sectionCount: number;
    timestamp: number;
    version: string;
  } | null {
    if (!this.index) return null;

    return {
      courseCount: this.index.courseMap.size,
      sectionCount: this.index.sectionMap.size,
      timestamp: this.index.timestamp,
      version: this.INDEX_VERSION,
    };
  }
}

// Singleton instance
export const searchIndex = new SearchIndexService();
