import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function testConnection(label: string, connectionString: string) {
  console.log(`\n--- Testing: ${label} ---`);
  console.log(`URL: ${connectionString.replace(/:([^:@]+)@/, ':****@')}`);
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`✅ Success: ${res.rows[0].now}`);
    await client.end();
    return true;
  } catch (err: any) {
    console.log(`❌ Failed: ${err.message}`);
    // console.log(`Code: ${err.code}`);
    return false;
  }
}

async function runTests() {
  const projectRef = 'rzelenhltxeyzrhnycpj';
  const pass = 'apstnd194187';
  const host = 'aws-1-ap-northeast-1.pooler.supabase.com';

  // 1. Current attempt
  await testConnection('Original (no-verify)', `postgresql://postgres.${projectRef}:${pass}@${host}:6543/postgres?sslmode=no-verify`);
  
  // 2. Try port 5432 (Session mode)
  await testConnection('Session Mode (5432)', `postgresql://postgres.${projectRef}:${pass}@${host}:5432/postgres?sslmode=no-verify`);

  // 3. Try aws-0 host
  await testConnection('AWS-0 Host', `postgresql://postgres.${projectRef}:${pass}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=no-verify`);

  // 4. Try without . in username (Direct-like but on pooler host)
  await testConnection('No identifier in user', `postgresql://postgres:${pass}@${host}:6543/postgres?sslmode=no-verify`);
}

runTests();
