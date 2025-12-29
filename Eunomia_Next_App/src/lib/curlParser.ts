// Utility functions for parsing curl commands and extracting tokens

export interface CurlParsedData {
  url: string;
  authorization: string | null;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  method: string;
  body?: any;
}

/**
 * Parse a curl command string and extract relevant information
 */
export function parseCurlCommand(curlCommand: string): CurlParsedData | null {
  try {
    // Remove extra whitespace and normalize line breaks
    const normalizedCommand = curlCommand.trim().replace(/\s+/g, ' ');
    
    // Extract URL (first argument after 'curl') - handle both quoted and unquoted URLs
    const urlMatch = normalizedCommand.match(/curl\s+['"`]?([^'"`\s]+)['"`]?/);
    if (!urlMatch) {
      throw new Error('Could not find URL in curl command');
    }
    
    let url = urlMatch[1];
    
    // Clean up URL - remove any remaining quotes
    url = url.replace(/^['"`]|['"`]$/g, '');
    
    // Extract method (default to GET if not specified)
    const methodMatch = normalizedCommand.match(/-X\s+(\w+)/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
    
    // Extract headers
    const headers: Record<string, string> = {};
    const headerMatches = normalizedCommand.matchAll(/-H\s+['"`]([^'"`]+)['"`]/g);
    
    for (const match of headerMatches) {
      const headerLine = match[1];
      const colonIndex = headerLine.indexOf(':');
      if (colonIndex > 0) {
        const key = headerLine.substring(0, colonIndex).trim();
        const value = headerLine.substring(colonIndex + 1).trim();
        
        // Avoid duplicate headers by only keeping the first occurrence
        if (!headers[key]) {
          headers[key] = value;
        }
      }
    }
    
    // Extract cookies
    const cookies: Record<string, string> = {};
    const cookieMatch = normalizedCommand.match(/-b\s+['"`]([^'"`]+)['"`]/);
    if (cookieMatch) {
      const cookieString = cookieMatch[1];
      const cookiePairs = cookieString.split(';');
      for (const pair of cookiePairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          cookies[key.trim()] = value.trim();
        }
      }
    }
    
    // Extract body data
    let body: any = undefined;
    const dataMatch = normalizedCommand.match(/--data-raw\s+['"`]([^'"`]+)['"`]/);
    if (dataMatch) {
      try {
        body = JSON.parse(dataMatch[1]);
      } catch (e) {
        // If not JSON, store as string
        body = dataMatch[1];
      }
    }
    
    // Extract authorization header specifically
    const authorization = headers['authorization'] || headers['Authorization'] || null;
    
    return {
      url,
      authorization,
      headers,
      cookies,
      method,
      body
    };
  } catch (error) {
    console.error('Error parsing curl command:', error);
    return null;
  }
}

/**
 * Extract just the authorization token from a curl command
 */
export function extractAuthTokenFromCurl(curlCommand: string): string | null {
  const parsed = parseCurlCommand(curlCommand);
  return parsed?.authorization || null;
}

/**
 * Extract all headers from a curl command
 */
export function extractHeadersFromCurl(curlCommand: string): Record<string, string> {
  const parsed = parseCurlCommand(curlCommand);
  return parsed?.headers || {};
}

/**
 * Extract cookies from a curl command
 */
export function extractCookiesFromCurl(curlCommand: string): Record<string, string> {
  const parsed = parseCurlCommand(curlCommand);
  return parsed?.cookies || {};
}

/**
 * Extract URL from a curl command
 */
export function extractUrlFromCurl(curlCommand: string): string | null {
  const parsed = parseCurlCommand(curlCommand);
  return parsed?.url || null;
}

/**
 * Validate if a string looks like a curl command
 */
export function isValidCurlCommand(command: string): boolean {
  const trimmed = command.trim();
  return trimmed.toLowerCase().startsWith('curl') && trimmed.includes('http');
}

/**
 * Format extracted data for display
 */
export function formatCurlData(data: CurlParsedData): string {
  const lines = [
    `URL: ${data.url}`,
    `Method: ${data.method}`,
    `Authorization: ${data.authorization ? 'Present' : 'Not found'}`,
    `Headers: ${Object.keys(data.headers).length} found`,
    `Cookies: ${Object.keys(data.cookies).length} found`
  ];
  
  if (data.body) {
    lines.push(`Body: ${typeof data.body === 'string' ? 'Text data' : 'JSON data'}`);
  }
  
  return lines.join('\n');
}
