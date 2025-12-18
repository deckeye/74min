const fs = require('fs');
const path = require('path');

const apiKey = process.env.YOUTUBE_API_KEY || '';

const configContent = `export const CONFIG = {
    YOUTUBE_API_KEY: '${apiKey}'
};
`;

const configPath = path.join(__dirname, '..', 'js', 'config.js');

try {
    // Ensure the directory exists
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(configPath, configContent);
    console.log('✅ js/config.js generated successfully.');
    if (!apiKey) {
        console.warn('⚠️ Warning: YOUTUBE_API_KEY environment variable is empty.');
    }
} catch (error) {
    console.error('❌ Error generating js/config.js:', error);
    process.exit(1);
}
