/**
 * Message Processor Utility
 * 
 * Handles dynamic message processing with placeholder replacement
 * Supports fallback values: {{placeholder??fallback}}
 */

export interface MessageData {
  [key: string]: any;
}

/**
 * Process a message template by replacing placeholders with actual values
 * Supports fallback values: {{placeholder??fallback}}
 * @param template The message template with placeholders like {{key??fallback}}
 * @param data The data object containing values to replace placeholders
 * @returns Processed message with placeholders replaced
 */
export function processMessage(template: string, data: MessageData): string {
  if (!template || !data) {
    return template || '';
  }

  // Find all placeholders in the template (double braces)
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  let processedMessage = template;

  // Replace each placeholder with the corresponding value
  processedMessage = processedMessage.replace(placeholderRegex, (match, placeholderWithFallback) => {
    // Split by ?? to get placeholder and fallback
    const parts = placeholderWithFallback.split('??');
    const placeholder = parts[0].trim();
    const fallback = parts[1] ? parts[1].trim() : '';
    
    const value = data[placeholder];
    return value !== undefined && value !== null && value !== '' ? String(value) : fallback;
  });

  return processedMessage;
}

/**
 * Extract all placeholders from a message template
 * @param template The message template
 * @returns Array of placeholder keys (without fallback values)
 */
export function extractPlaceholders(template: string): string[] {
  if (!template) {
    return [];
  }

  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders: string[] = [];
  let match;

  while ((match = placeholderRegex.exec(template)) !== null) {
    const placeholderWithFallback = match[1];
    // Split by ?? to get just the placeholder name
    const parts = placeholderWithFallback.split('??');
    const placeholder = parts[0].trim();
    placeholders.push(placeholder);
  }

  // Remove duplicates
  return [...new Set(placeholders)];
}

/**
 * Validate if all required placeholders are provided in the data
 * @param template The message template
 * @param data The data object
 * @returns Object with validation result and missing keys
 */
export function validatePlaceholders(template: string, data: MessageData): {
  isValid: boolean;
  missingKeys: string[];
  availableKeys: string[];
} {
  const requiredPlaceholders = extractPlaceholders(template);
  const availableKeys = Object.keys(data || {});
  const missingKeys = requiredPlaceholders.filter(key => !availableKeys.includes(key));

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
    availableKeys
  };
}

/**
 * Get a preview of the processed message with sample data
 * @param template The message template
 * @param sampleData Sample data for preview
 * @returns Preview of the processed message
 */
export function getMessagePreview(template: string, sampleData: MessageData = {}): string {
  return processMessage(template, sampleData);
} 