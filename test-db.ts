import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function test() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Testing connection string:', connectionString);
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Success!', res.rows[0]);
  } catch (err: any) {
    console.error('Connection failed:');
    console.error('Message:', err.message);
    console.error('Code:', err.code);
    console.error('Full error:', err);
  } finally {
    await pool.end();
  }
}

test();
