/**
 * Environment variable validation for frontend
 * Ensures all required variables are present at build/runtime
 */

export function validateEnvironment() {
  const errors: string[] = [];

  // Required variables
  const required = {
    VITE_API_BASE: 'Backend API base URL',
    VITE_AGORA_APP_ID: 'Agora App ID for video streaming',
  };

  for (const [key, description] of Object.entries(required)) {
    const value = import.meta.env[key as keyof ImportMetaEnv];
    if (!value) {
      errors.push(`Missing ${key}: ${description}`);
    } else if (typeof value === 'string' && value.trim() === '') {
      errors.push(`Empty ${key}: ${description}`);
    }
  }

  if (errors.length > 0) {
    const errorMessage = `\n❌ Missing Environment Variables:\n${errors.map(e => `  • ${e}`).join('\n')}\n`;
    console.error(errorMessage);
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }

  console.info('✅ Environment variables validated');
  
  return {
    apiBase: import.meta.env.VITE_API_BASE,
    agoraAppId: import.meta.env.VITE_AGORA_APP_ID,
  };
}

// Validate on module load
if (typeof window !== 'undefined') {
  try {
    validateEnvironment();
  } catch (error) {
    console.error('Failed to validate environment:', error);
    // Don't throw - let app load and show error UI
  }
}
