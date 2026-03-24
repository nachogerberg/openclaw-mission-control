/**
 * Lead Enrichment Script for Reclutas Digitales
 * Uses Apollo API to enrich contacts with company data, contact details, and lead scoring
 */

import { createClient } from '@supabase/supabase-js';

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.MANTA_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.MANTA_SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

interface ApolloPerson {
  id: string;
  name?: string;
  title?: string;
  linkedin_url?: string;
  email?: string;
  phone?: string;
  organization?: {
    name?: string;
    logo_url?: string;
    website_url?: string;
   industries?: string[];
    employees?: number;
  };
}

interface ApolloSearchResult {
  people?: ApolloPerson[];
  total_entries?: number;
}

interface EnrichedContact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  linkedin_url?: string;
  apollo_person_id?: string;
  apollo_data?: any;
  lead_score?: number;
  enriched_at?: string;
}

/**
 * Search Apollo for person by email
 */
async function enrichWithApollo(email: string): Promise<{ person?: ApolloPerson; score: number }> {
  try {
    const response = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        api_key: APOLLO_API_KEY,
        person_email: email,
        page: 1,
      }),
    });

    if (!response.ok) {
      console.error(`Apollo API error: ${response.status}`);
      return { score: 0 };
    }

    const data: ApolloSearchResult = await response.json();
    
    if (data.people && data.people.length > 0) {
      const person = data.people[0];
      const score = calculateLeadScore(person);
      return { person, score };
    }

    return { score: 0 };
  } catch (error) {
    console.error(`Apollo enrichment error for ${email}:`, error);
    return { score: 0 };
  }
}

/**
 * Calculate lead score based on Apollo data
 */
function calculateLeadScore(person: ApolloPerson): number {
  let score = 0;

  // Has name (10 points)
  if (person.name) score += 10;

  // Has valid title (20 points)
  if (person.title && !['CEO', 'Founder', 'Owner'].some(t => person.title?.includes(t))) {
    score += 20;
  }

  // Has LinkedIn (15 points)
  if (person.linkedin_url) score += 15;

  // Has phone (15 points)
  if (person.phone) score += 15;

  // Has organization (20 points)
  if (person.organization) score += 20;

  // Organization has website (10 points)
  if (person.organization?.website_url) score += 10;

  // Organization has employees (10 points)
  if (person.organization?.employees && person.organization.employees > 10) score += 10;

  return Math.min(score, 100);
}

/**
 * Main enrichment process
 */
async function main() {
  console.log('🚀 Starting Lead Enrichment for Reclutas Digitales');
  console.log(`📡 Apollo API Key: ${APOLLO_API_KEY ? '✓ Present' : '✗ Missing'}`);

  if (!APOLLO_API_KEY) {
    console.error('❌ APOLLO_API_KEY not found. Aborting.');
    process.exit(1);
  }

  // Fetch contacts needing enrichment (contacts without apollo_person_id or enriched over 7 days ago)
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('source', 'reclutas_digitales')
    .or('apollo_person_id.is.null,enriched_at.lt.' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(50);

  if (error) {
    console.error('❌ Failed to fetch contacts:', error);
    process.exit(1);
  }

  if (!contacts || contacts.length === 0) {
    console.log('📭 No contacts need enrichment.');
    printResults(0, 0, []);
    return;
  }

  console.log(`📋 Found ${contacts.length} contacts to enrich`);

  const enrichedContacts: EnrichedContact[] = [];
  let totalScore = 0;

  for (const contact of contacts) {
    if (!contact.email) {
      console.log(`⚠️ Skipping contact ${contact.id} - no email`);
      continue;
    }

    console.log(`🔍 Enriching: ${contact.email}`);

    const { person, score } = await enrichWithApollo(contact.email);

    const enrichedContact: EnrichedContact = {
      id: contact.id,
      email: contact.email,
      first_name: contact.first_name,
      last_name: contact.last_name,
      phone: person?.phone || contact.phone,
      company_name: person?.organization?.name || contact.company_name,
      job_title: person?.title || contact.job_title,
      linkedin_url: person?.linkedin_url || contact.linkedin_url,
      apollo_person_id: person?.id,
      apollo_data: person,
      lead_score: score,
      enriched_at: new Date().toISOString(),
    };

    enrichedContacts.push(enrichedContact);
    totalScore += score;

    // Update in Supabase
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        phone: enrichedContact.phone,
        company_name: enrichedContact.company_name,
        job_title: enrichedContact.job_title,
        linkedin_url: enrichedContact.linkedin_url,
        apollo_person_id: enrichedContact.apollo_person_id,
        apollo_data: enrichedContact.apollo_data,
        lead_score: enrichedContact.lead_score,
        enriched_at: enrichedContact.enriched_at,
      })
      .eq('id', contact.id);

    if (updateError) {
      console.error(`❌ Failed to update ${contact.email}:`, updateError);
    } else {
      console.log(`✅ Enriched: ${contact.email} (Score: ${score})`);
    }

    // Rate limit - Apollo allows 100 requests/min on free tier
    await new Promise(resolve => setTimeout(resolve, 600));
  }

  const avgScore = enrichedContacts.length > 0 ? Math.round(totalScore / enrichedContacts.length) : 0;
  const topLeads = enrichedContacts
    .sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0))
    .slice(0, 5);

  printResults(enrichedContacts.length, avgScore, topLeads);
}

function printResults(count: number, avgScore: number, topLeads: EnrichedContact[]) {
  console.log('\n━━━━━━━━━━━ ENRICHMENT REPORT ━━━━━━━━━━━');
  console.log(`📊 Contacts Enriched: ${count}`);
  console.log(`📈 Average Lead Score: ${avgScore}`);
  console.log('\n🏆 Top Scored Leads:');
  topLeads.forEach((lead, idx) => {
    console.log(`   ${idx + 1}. ${lead.email} — Score: ${lead.lead_score} — ${lead.job_title || 'N/A'} @ ${lead.company_name || 'N/A'}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);