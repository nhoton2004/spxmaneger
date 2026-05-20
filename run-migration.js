const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envFile, 'utf-8');

let supabaseUrl, supabaseKey;

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  } else if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim();
  }
});

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found');
  process.exit(1);
}

console.log('✅ Found Supabase URL:', supabaseUrl);
console.log('✅ Found Supabase Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('\n🔄 Running migration...');
    
    const sqlFile = path.join(__dirname, 'supabase/migrations/add_order_enhancements_safe.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
    
    // Split by semicolon but preserve statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      console.log(`\n[${i + 1}/${statements.length}] Executing...`);
      
      try {
        const { data, error } = await supabase.rpc('exec', { sql: stmt });
        
        if (error) {
          console.log(`⚠️  Note:`, error.message);
        } else {
          console.log(`✅ Step ${i + 1} completed`);
        }
      } catch (err) {
        console.log(`⚠️  Error executing step ${i + 1}:`, err.message);
      }
    }
    
    console.log('\n✅ Migration completed!');
    console.log('\n⚠️  IMPORTANT: If you see errors above, please:');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor > New Query');
    console.log('4. Copy content from supabase/migrations/add_order_enhancements_safe.sql');
    console.log('5. Run the query manually');
    
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
