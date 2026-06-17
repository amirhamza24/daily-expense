import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function testRegions() {
  const projectRef = 'rzelenhltxeyzrhnycpj';
  const pass = 'apstnd194187';
  
  const regions = [
    'aws-0-ap-northeast-1',
    'aws-1-ap-northeast-1',
    'aws-0-ap-southeast-1',
    'aws-0-us-east-1',
    'aws-0-eu-central-1'
  ];

  for (const region of regions) {
    const host = `${region}.pooler.supabase.com`;
    console.log(`\n--- Testing Region: ${region} ---`);
    
    const client = new Client({
      connectionString: `postgresql://postgres.${projectRef}:${pass}@${host}:6543/postgres?sslmode=no-verify`
    });

    try {
      await client.connect();
      console.log(`✅ Success in ${region}!`);
      await client.end();
      break;
    } catch (err: any) {
      console.log(`❌ Failed in ${region}: ${err.message}`);
    }
  }
}

testRegions();
