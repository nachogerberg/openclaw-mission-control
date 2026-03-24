#!/usr/bin/env npx tsx

const baseUrl = process.env.BASE_URL || 'http://localhost:4000';

async function main() {
  const res = await fetch(`${baseUrl}/api/insurance-ad-intel/seed`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Seed failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  console.log('Seeded insurance ad intel:', json);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
