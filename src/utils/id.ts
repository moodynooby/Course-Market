/**
 * ID Generation utilities
 * Centralized ID generation to avoid duplication across the codebase
 */

/**
 * Generate a simple random ID (not cryptographically secure)
 * Used for client-side IDs where uniqueness is not critical
 * @returns Random string ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Generate a more unique ID by including timestamp
 * Used for higher uniqueness requirements
 * @returns Random string ID with timestamp
 */
export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
