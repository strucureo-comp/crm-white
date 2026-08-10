#!/usr/bin/env node

/**
 * Seed 1000 enquiry entries into the CRM via the /api/enquiries endpoint.
 *
 * Usage:
 *   node scripts/seed-enquiries.js
 *
 * Make sure the Next.js dev server is running on http://localhost:3000
 */

const COMPANY_ID = '-Oz1oUw2yKMRrRUymxq6';
const API_URL = 'http://localhost:3000/api/enquiries';
const TOTAL = 1000;
const CONCURRENCY = 10; // parallel requests

// ─── Fake data pools ──────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Aarav','Vivaan','Aditya','Arjun','Sai','Rohan','Vihaan','Krishna','Reyansh','Dhruv',
  'Diya','Ananya','Priya','Neha','Isha','Kavya','Meera','Sara','Aanya','Riya',
  'James','Oliver','Liam','Noah','Ethan','Lucas','Mason','Logan','Alexander','Sebastian',
  'Emma','Olivia','Ava','Isabella','Sophia','Mia','Charlotte','Amelia','Harper','Evelyn',
  'Wei','Yuki','Hiroshi','Sakura','Akira','Jin','Soo','Min','Lian','Xiao',
  'Omar','Fatima','Yusuf','Layla','Hassan','Noor','Zain','Aisha','Khalid','Maryam',
  'Carlos','Maria','Diego','Sofia','Luis','Valentina','Miguel','Camila','Juan','Isabella',
  'Ahmed','Sara','Ali','Zara','Hussein','Leila','Tariq','Nadia','Karim','Salma',
  'Raj','Pooja','Amit','Sunita','Vikram','Anita','Sanjay','Geeta','Rahul','Deepa',
  'Chen','Ming','Fang','Liu','Yang','Zhao','Huang','Lin','Wu','Zhou',
];

const LAST_NAMES = [
  'Sharma','Patel','Kumar','Singh','Reddy','Nair','Gupta','Joshi','Desai','Mehta',
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Anderson','Taylor','Thomas','Jackson','White','Harris','Martin','Thompson','Moore','Allen',
  'Kim','Lee','Park','Chen','Wang','Li','Zhang','Liu','Yang','Huang',
  'Tanaka','Yamamoto','Suzuki','Watanabe','Itō','Nakamura','Kobayashi','Saitō','Takahashi','Satō',
  'Al-Hassan','Khan','Malik','Hussain','Rahman','Farooqi','Sheikh','Qureshi','Ansari','Siddiqui',
  'Gonzalez','Lopez','Hernandez','Gomez','Perez','Sanchez','Ramirez','Torres','Flores','Rivera',
  'Muller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Koch',
  'Dubois','Moreau','Laurent','Berger','Rousseau','Petit','Robert','Durand','Leroy','Mercier',
  'Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco',
];

const DOMAINS = [
  'gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com',
  'company.com','business.org','enterprise.net','techcorp.io','startup.co',
  'example.com','mail.com','protonmail.com','zoho.com','fastmail.com',
  'corp.co','industry.com','services.net','global.org','digital.io',
];

const SUBJECTS = [
  'Product Inquiry',
  'Service Request',
  'Pricing Information',
  'Partnership Opportunity',
  'Technical Support',
  'General Question',
  'Demo Request',
  'Feedback',
  'Bug Report',
  'Feature Request',
  'Account Issue',
  'Billing Inquiry',
  'Integration Help',
  'Custom Solution',
  'Enterprise Plan',
  'Trial Extension',
  'API Documentation',
  'Onboarding Question',
  'Security Inquiry',
  'Compliance Question',
  'Migration Assistance',
  'Performance Issue',
  'Data Export Request',
  'Custom Training',
  'Scheduling a Call',
  'Contract Renewal',
  'Referral Program',
  'White Label Option',
  'Multi-tenant Setup',
  'Mobile App Inquiry',
];

const MESSAGES = [
  'Hi, I would like to learn more about your product features and pricing.',
  'We are interested in implementing your CRM solution for our team of 50.',
  'Could you please share the documentation for your API integration?',
  'I need help setting up the WhatsApp connector for our business.',
  'What are the available plans for enterprise customers?',
  'We would like to schedule a demo for our management team.',
  'Is there a free trial available? How long does it last?',
  'We are experiencing issues with the email notifications not sending.',
  'Can you provide a comparison between your basic and professional plans?',
  'We need a custom integration with our existing ERP system.',
  'How does your platform handle data privacy and GDPR compliance?',
  'I am looking for a solution to manage our sales pipeline more effectively.',
  'Do you offer bulk data import from CSV files?',
  'What kind of support do you provide for onboarding new users?',
  'We are a startup with 10 employees, what plan would you recommend?',
  'Can I get access to your developer documentation?',
  'We need to integrate your system with our accounting software.',
  'How secure is the data stored on your platform?',
  'Do you support multi-language interfaces?',
  'I would like to know about your mobile app capabilities.',
  'What analytics and reporting features are included?',
  'Can you help us migrate data from our current CRM?',
  'We need role-based access control for our team.',
  'Is there an option for white-labeling the platform?',
  'What are the API rate limits for the professional plan?',
  'We need to set up automated follow-up emails.',
  'Do you offer custom workflow automation?',
  'How does your pricing scale with the number of users?',
  'We need to track customer interactions across multiple channels.',
  'Can you provide case studies from similar companies in our industry?',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone() {
  const codes = ['+91','+1','+44','+61','+81','+49','+33','+34','+39','+55','+86','+82','+971','+65','+60'];
  const code = pick(codes);
  const num = Array.from({ length: randomInt(8, 10) }, () => randomInt(0, 9)).join('');
  return `${code} ${num}`;
}

function generateEmail(firstName, lastName) {
  const domain = pick(DOMAINS);
  const separator = pick(['.', '_', '']);
  const num = Math.random() > 0.4 ? randomInt(1, 999) : '';
  return `${firstName.toLowerCase()}${separator}${lastName.toLowerCase()}${num}@${domain}`;
}

function generateEnquiry(index) {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const email = generateEmail(firstName, lastName);
  const phone = Math.random() > 0.3 ? generatePhone() : '';
  const subject = pick(SUBJECTS);
  const message = pick(MESSAGES);

  return {
    company_id: COMPANY_ID,
    name,
    email,
    phone,
    subject,
    message,
  };
}

// ─── Sender ───────────────────────────────────────────────────────────────────

let successCount = 0;
let failCount = 0;

async function sendEnquiry(data, index) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (res.ok && json.success) {
      successCount++;
    } else {
      failCount++;
      if (failCount <= 10) {
        console.error(`  ✗ #${index} failed: ${res.status} — ${json.error || JSON.stringify(json)}`);
      }
    }
  } catch (err) {
    failCount++;
    if (failCount <= 10) {
      console.error(`  ✗ #${index} error: ${err.message}`);
    }
  }
}

async function runBatch(items, concurrency) {
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const promises = batch.map((item, j) => sendEnquiry(item, i + j + 1));
    await Promise.all(promises);

    const progress = Math.min(i + concurrency, items.length);
    process.stdout.write(`\r  Progress: ${progress}/${TOTAL} (${Math.round(progress / TOTAL * 100)}%)`);
  }
  console.log();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀 Seeding ${TOTAL} enquiries for company: ${COMPANY_ID}\n`);
  console.log(`   Target: ${API_URL}`);
  console.log(`   Concurrency: ${CONCURRENCY}\n`);

  // Verify server is running
  try {
    const health = await fetch('http://localhost:3000');
    if (!health.ok && health.status !== 404) {
      console.error('⚠  Server responded with status', health.status, '— continuing anyway');
    }
  } catch {
    console.error('❌ Cannot reach http://localhost:3000 — make sure the dev server is running.\n');
    process.exit(1);
  }

  console.log('  Sending enquiries...\n');

  const enquiries = Array.from({ length: TOTAL }, (_, i) => generateEnquiry(i));
  const startTime = Date.now();

  await runBatch(enquiries, CONCURRENCY);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n  ────────────────────────────────────');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed:  ${failCount}`);
  console.log(`  ⏱  Time:    ${elapsed}s`);
  console.log('  ────────────────────────────────────\n');
}

main().catch(console.error);
