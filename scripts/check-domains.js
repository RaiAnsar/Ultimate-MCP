#!/usr/bin/env node

/**
 * Domain availability checker for Ultimate MCP
 * 
 * This script helps check potential domain names for the project
 */

const dns = require('dns').promises;
const https = require('https');

const domains = [
  // Premium options
  'ultimate-mcp.dev',
  'ultimatemcp.ai',
  'ultimate-mcp.io',
  'getultimatemcp.com',
  
  // Alternative options
  'ultimate-mcp.tools',
  'ultimate-mcp.codes',
  'mcp-ultimate.dev',
  'theultimatemcp.com',
  'ultimate-mcp.app',
  'ultimatemcp.dev',
  
  // Backup options
  'ultimate-mcp.tech',
  'ultimate-mcp.xyz',
  'ultimate-mcp.co',
  'ultimate-mcp.org'
];

async function checkDomain(domain) {
  try {
    // Try to resolve the domain
    await dns.resolve4(domain);
    return { domain, available: false, reason: 'DNS records exist' };
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      // Domain might be available
      return { domain, available: 'maybe', reason: 'No DNS records found' };
    }
    return { domain, available: 'error', reason: error.message };
  }
}

async function checkWhois(domain) {
  // Note: This is a simplified check. For production, use a proper WHOIS API
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.whoisxmlapi.com',
      path: `/whoisserver/WhoisService?apiKey=at_demo&domainName=${domain}&outputFormat=JSON`,
      method: 'GET'
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({
            domain,
            registered: result.WhoisRecord ? true : false
          });
        } catch {
          resolve({ domain, registered: 'unknown' });
        }
      });
    }).on('error', () => {
      resolve({ domain, registered: 'error' });
    });
  });
}

async function main() {
  console.log('🔍 Checking domain availability for Ultimate MCP...\n');
  
  console.log('⚡ Quick DNS Check:');
  console.log('=' .repeat(50));
  
  for (const domain of domains) {
    const result = await checkDomain(domain);
    const status = result.available === false ? '❌' : 
                  result.available === 'maybe' ? '🟡' : '⚠️';
    console.log(`${status} ${domain.padEnd(25)} - ${result.reason}`);
  }
  
  console.log('\n📝 Notes:');
  console.log('- 🟡 = Potentially available (needs WHOIS check)');
  console.log('- ❌ = Likely taken (has DNS records)');
  console.log('- ⚠️ = Error checking domain');
  
  console.log('\n💡 Recommendations:');
  console.log('1. Use a domain registrar to verify availability');
  console.log('2. Consider registering multiple domains for brand protection');
  console.log('3. Set up redirects from alternative domains to primary');
  console.log('4. Register matching social media handles');
  
  console.log('\n🌐 Suggested registrars:');
  console.log('- Namecheap: https://www.namecheap.com');
  console.log('- Google Domains: https://domains.google');
  console.log('- Cloudflare: https://www.cloudflare.com/products/registrar/');
}

main().catch(console.error);