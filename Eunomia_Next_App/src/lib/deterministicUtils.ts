/**
 * Utility functions for generating deterministic values based on input seeds
 */

/**
 * Generates a deterministic number of conversation turns based on a conversation ID
 * This ensures that the same conversation ID will always produce the same number of turns
 * within the specified range, enabling reproducible testing.
 * 
 * @param conversationId - The unique identifier for the conversation
 * @param minTurns - Minimum number of turns
 * @param maxTurns - Maximum number of turns
 * @returns A deterministic number of turns between minTurns and maxTurns (inclusive)
 */
export function getDeterministicConversationTurns(
  conversationId: string,
  minTurns: number,
  maxTurns: number
): number {
  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < conversationId.length; i++) {
    const char = conversationId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get a positive number within range
  const range = maxTurns - minTurns + 1;
  const deterministicValue = Math.abs(hash) % range;
  
  return minTurns + deterministicValue;
}

/**
 * Generates a deterministic boolean value based on a seed
 * 
 * @param seed - The seed string
 * @param probability - Probability of returning true (0-1)
 * @returns A deterministic boolean value
 */
export function getDeterministicBoolean(seed: string, probability: number = 0.5): boolean {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Normalize to 0-1 range
  const normalized = Math.abs(hash) / 2147483647; // Max 32-bit int
  
  return normalized < probability;
}

/**
 * Generates a deterministic choice from an array of options
 * 
 * @param seed - The seed string
 * @param options - Array of options to choose from
 * @returns A deterministic choice from the options array
 */
export function getDeterministicChoice<T>(seed: string, options: T[]): T {
  if (options.length === 0) {
    throw new Error('Options array cannot be empty');
  }
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % options.length;
  return options[index];
}
