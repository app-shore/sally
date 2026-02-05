const fs = require('fs');
const path = require('path');
const https = require('https');

const OPENAPI_URL = process.env.OPENAPI_URL || 'https://sally-api.apps.appshore.in/api/openapi.json';
const OUTPUT_PATH = path.join(__dirname, '../public/openapi.json');

async function syncOpenAPI() {
  console.log('🔄 Syncing OpenAPI spec from backend...');
  console.log(`   URL: ${OPENAPI_URL}`);

  return new Promise((resolve, reject) => {
    const protocol = OPENAPI_URL.startsWith('https') ? https : require('http');

    protocol.get(OPENAPI_URL, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const spec = JSON.parse(data);

          // Validate spec has required fields
          if (!spec.openapi && !spec.swagger) {
            throw new Error('Invalid OpenAPI spec (missing openapi/swagger field)');
          }

          if (!spec.paths) {
            throw new Error('Invalid OpenAPI spec (missing paths)');
          }

          fs.writeFileSync(OUTPUT_PATH, JSON.stringify(spec, null, 2));

          const endpointCount = Object.keys(spec.paths || {}).length;
          console.log('✅ OpenAPI spec synced successfully!');
          console.log(`   Version: ${spec.info?.version || 'unknown'}`);
          console.log(`   Endpoints: ${endpointCount}`);

          resolve();
        } catch (error) {
          console.error('❌ Failed to parse OpenAPI spec:', error.message);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('❌ Failed to fetch OpenAPI spec:', error.message);
      console.error('   Make sure the backend is running or OPENAPI_URL is correct');
      reject(error);
    });
  });
}

// Run if called directly
if (require.main === module) {
  syncOpenAPI()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { syncOpenAPI };
