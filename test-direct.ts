import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function testDirect() {
  const projectRef = 'rzelenhltxeyzrhnycpj';
  const pass = 'apstnd194187';
  const host = `db.${projectRef}.supabase.co`;
  
  console.log(`Testing Direct Connection to ${host}:5432...`);
  
  const client = new Client({
    host,
    port: 5432,
    user: 'postgres',
    password: pass,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`✅ Success: ${res.rows[0].now}`);
    await client.end();
  } catch (err: any) {
    console.log(`❌ Failed: ${err.message}`);
    console.log(`Code: ${err.code}`);
  }
}

testDirect();
