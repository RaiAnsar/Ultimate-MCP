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
  console.error('🔍 Checking domain availability for Ultimate MCP...\n');
  
  console.error('⚡ Quick DNS Check:');
  console.error('=' .repeat(50));
  
  for (const domain of domains) {
    const result = await checkDomain(domain);
    const status = result.available === false ? '❌' : 
                  result.available === 'maybe' ? '🟡' : '⚠️';
    console.error(`${status} ${domain.padEnd(25)} - ${result.reason}`);
  }
  
  console.error('\n📝 Notes:');
  console.error('- 🟡 = Potentially available (needs WHOIS check)');
  console.error('- ❌ = Likely taken (has DNS records)');
  console.error('- ⚠️ = Error checking domain');
  
  console.error('\n💡 Recommendations:');
  console.error('1. Use a domain registrar to verify availability');
  console.error('2. Consider registering multiple domains for brand protection');
  console.error('3. Set up redirects from alternative domains to primary');
  console.error('4. Register matching social media handles');
  
  console.error('\n🌐 Suggested registrars:');
  console.error('- Namecheap: https://www.namecheap.com');
  console.error('- Google Domains: https://domains.google');
  console.error('- Cloudflare: https://www.cloudflare.com/products/registrar/');
}

main().catch(console.error);