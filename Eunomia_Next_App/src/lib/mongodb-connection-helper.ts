// Helper to ensure MongoDB connection string is properly formatted for Vercel

export function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // Parse the URI to avoid duplicate parameters
  const url = new URL(uri);
  const params = new URLSearchParams(url.search);
  
  // Clear existing parameters to avoid duplicates
  params.delete('retryWrites');
  params.delete('w');
  params.delete('ssl');
  params.delete('tls');
  params.delete('appName');
  
  // Add the required parameters for Vercel
  params.set('retryWrites', 'true');
  params.set('w', 'majority');
  params.set('ssl', 'true');
  params.set('tls', 'true');
  
  // Reconstruct the URI
  const formattedUri = `${url.protocol}//${url.host}${url.pathname}?${params.toString()}`;

  console.log('Using MongoDB URI:', formattedUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Log without credentials
  
  return formattedUri;
}

export function validateMongoUri(uri: string): boolean {
  try {
    new URL(uri);
    return uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
  } catch {
    return false;
  }
}
