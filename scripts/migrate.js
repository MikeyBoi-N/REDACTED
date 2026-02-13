const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  // Read .env.local manually to avoid installing dotenv if not present
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrlLine = envContent.split(/\r?\n/).find(line => line.startsWith('DATABASE_URL='));
  if (!dbUrlLine) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
  }
  const dbUrl = dbUrlLine.split('=')[1].trim();
  
  // Mask password for logging
  const maskedUrl = dbUrl.replace(/:([^@]+)@/, ':***@');
  console.log(`Using DB URL: ${maskedUrl}`);

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260213000000_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('Connected to database. Running migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
