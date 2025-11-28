/**
 * Diagnostic script to check environment variables in production
 * This helps debug why GOOGLE_APPLICATION_CREDENTIALS might not be loading
 */

console.log('\n' + '='.repeat(80));
console.log('🔍 ENVIRONMENT VARIABLES CHECK');
console.log('='.repeat(80) + '\n');

const envVars = [
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_CLOUD_PROJECT_ID',
  'DOCUMENT_AI_PROCESSOR_ID',
  'DOCUMENT_AI_LOCATION',
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MOLIT_API_KEY',
];

envVars.forEach(varName => {
  const value = process.env[varName];
  const exists = value !== undefined;
  const isEmpty = !value || value.trim() === '';
  const length = value?.length || 0;

  console.log(`\n${varName}:`);
  console.log(`  Exists: ${exists ? '✅' : '❌'}`);
  console.log(`  Is Empty: ${isEmpty ? '❌ YES' : '✅ NO'}`);
  console.log(`  Length: ${length} characters`);

  if (exists && !isEmpty) {
    // For credentials JSON, show first 50 chars
    if (varName === 'GOOGLE_APPLICATION_CREDENTIALS') {
      const preview = value!.substring(0, 50);
      console.log(`  Preview: ${preview}...`);
      console.log(`  Starts with '{': ${value!.trim().startsWith('{') ? '✅ YES' : '❌ NO'}`);

      // Try to parse as JSON
      try {
        const parsed = JSON.parse(value!);
        console.log(`  ✅ Valid JSON`);
        console.log(`  Service Account Email: ${parsed.client_email || 'NOT FOUND'}`);
        console.log(`  Project ID: ${parsed.project_id || 'NOT FOUND'}`);
      } catch (error) {
        console.log(`  ❌ INVALID JSON - Parse Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // For other vars, show first 20 chars
      const preview = value!.substring(0, 20);
      console.log(`  Preview: ${preview}${length > 20 ? '...' : ''}`);
    }
  }
});

console.log('\n' + '='.repeat(80) + '\n');
