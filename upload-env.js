const fs = require('fs');
const { execSync } = require('child_process');

const content = fs.readFileSync('.env', 'utf-8');
const lines = content.split('\n');

for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
        let key = match[1];
        let val = match[2];
        // strip quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
        }
        console.log(`Adding ${key}...`);
        try {
            fs.writeFileSync('.temp_val', val);
            // using npx vercel env add is tricky if it prompts. But with a pipe or redirect it shouldn't.
            execSync(`npx vercel env add ${key} production --force < .temp_val`, { stdio: 'ignore' });
            execSync(`npx vercel env add ${key} preview --force < .temp_val`, { stdio: 'ignore' });
            execSync(`npx vercel env add ${key} development --force < .temp_val`, { stdio: 'ignore' });
        } catch (e) {
            console.error(`Failed to add ${key}`);
        }
    }
}
if(fs.existsSync('.temp_val')) fs.unlinkSync('.temp_val');
console.log("Done adding env variables.");
