const fs = require('fs');
const path = require('path');

// Parse .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let val = parts.slice(1).join('=').trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  });
}

// Set Node env to development
process.env.NODE_ENV = 'development';

const { db } = require('./src/lib/db');

async function testPrisma() {
  try {
    console.log('🔌 Querying User count via Prisma Pg Adapter...');
    const userCount = await db.user.count();
    console.log('✅ Connected successfully!');
    console.log('👤 Total Users:', userCount);
    
    console.log('📊 Querying Balances...');
    const balances = await db.balance.findMany({ take: 2 });
    console.log('💸 Sample Balances:', balances);
  } catch (err) {
    console.error('❌ PRISMA ERROR:', err);
  }
}

testPrisma();
