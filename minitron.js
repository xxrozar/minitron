#!/usr/bin/env node
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const COMPANIES_FILE = "companies_found.json";
const TRACKING_FILE = "tracking.json";

async function findAICompanies() {
  console.log("🔍 Finding 10 AI companies...");

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Find 10 emerging AI companies that are:
1. Founded in last 3 years
2. Have less than 100 employees (target early stage)
3. Focus on B2B SaaS or enterprise AI
4. Based in US/EU

For each company, provide:
- Name
- Website
- Brief description (1 line)
- LinkedIn company page URL (estimate based on name)
- CEO/Founder name (if known)

Format as JSON array.`,
      },
    ],
  });

  try {
    const content = response.content[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const companies = JSON.parse(jsonMatch[0]);
      fs.writeFileSync(COMPANIES_FILE, JSON.stringify(companies, null, 2));
      console.log(`✅ Found ${companies.length} companies`);
      return companies;
    }
  } catch (e) {
    console.error("Failed to parse companies:", e.message);
  }
  return [];
}

async function generateLinkedInMessage(company, founder) {
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Write a personalized LinkedIn connection message for ${founder} at ${company}.
The message should be:
- Genuine and specific (mention their company)
- Short (under 200 chars)
- Reference their work in AI/tech
- Ask to connect for industry insights

Just the message, no preamble.`,
      },
    ],
  });

  return response.content[0].text;
}

async function generateColdEmail(company, website, founder) {
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `Write a cold email to ${founder} at ${company} (${website}).
Subject line + body.
Positioning: You help AI companies scale their GTM.
Keep it short, benefit-focused, with a soft CTA (coffee chat).
Format:
SUBJECT: [subject]
BODY:
[email body]`,
      },
    ],
  });

  return response.content[0].text;
}

async function trackOutreach(companies) {
  const tracking = {
    timestamp: new Date().toISOString(),
    total_companies: companies.length,
    linkedin_messages_generated: companies.length,
    cold_emails_generated: companies.length,
    companies: companies.map((c) => ({
      name: c.name,
      website: c.website,
      linkedin_status: "pending",
      email_status: "pending",
      created_at: new Date().toISOString(),
    })),
  };

  fs.writeFileSync(TRACKING_FILE, JSON.stringify(tracking, null, 2));
  console.log("📊 Tracking file created");
  return tracking;
}

async function main() {
  console.log("🤖 MINITRON - AI Prospecting Bot\n");

  try {
    // Step 1: Find companies
    const companies = await findAICompanies();
    if (companies.length === 0) {
      console.log("No companies found");
      return;
    }

    // Step 2: Generate messages for first 3 companies (demo)
    console.log("\n💬 Generating LinkedIn messages...");
    for (let i = 0; i < Math.min(3, companies.length); i++) {
      const company = companies[i];
      const message = await generateLinkedInMessage(
        company.name,
        company.founder || "Team"
      );
      console.log(`\n[${company.name}]\n${message}`);
    }

    // Step 3: Generate emails for first 3 companies (demo)
    console.log("\n\n📧 Generating cold emails...");
    for (let i = 0; i < Math.min(3, companies.length); i++) {
      const company = companies[i];
      const email = await generateColdEmail(
        company.name,
        company.website,
        company.founder || "Team"
      );
      console.log(`\n[${company.name}]\n${email}`);
    }

    // Step 4: Track everything
    await trackOutreach(companies);

    console.log("\n✅ DONE! Check companies_found.json and tracking.json");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
