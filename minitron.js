#!/usr/bin/env node
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const COMPANIES_FILE = "companies_found.json";
const TRACKING_FILE = "tracking.json";

// Demo companies for testing
const DEMO_COMPANIES = [
  {
    name: "Replicant AI",
    website: "https://replicant.ai",
    description: "AI voice agents for customer service",
    linkedin: "https://linkedin.com/company/replicant-ai",
    founder: "Kailash Joshi"
  },
  {
    name: "Harvey AI",
    website: "https://harvey.ai",
    description: "AI for legal professionals",
    linkedin: "https://linkedin.com/company/harvey-ai",
    founder: "Gabriel Pereyra"
  },
  {
    name: "Mistral AI",
    website: "https://mistral.ai",
    description: "Open-source LLMs for enterprise",
    linkedin: "https://linkedin.com/company/mistral-ai",
    founder: "Arthur Mensch"
  },
  {
    name: "Anthropic",
    website: "https://anthropic.com",
    description: "Constitutional AI and safety research",
    linkedin: "https://linkedin.com/company/anthropic",
    founder: "Dario Amodei"
  },
  {
    name: "Cohere",
    website: "https://cohere.ai",
    description: "LLM API for enterprises",
    linkedin: "https://linkedin.com/company/cohere-ai",
    founder: "Aidan Gomez"
  },
  {
    name: "Perplexity AI",
    website: "https://perplexity.ai",
    description: "AI-powered search engine",
    linkedin: "https://linkedin.com/company/perplexity-ai",
    founder: "Aravind Srinivas"
  },
  {
    name: "Scale AI",
    website: "https://scale.com",
    description: "Data infrastructure for AI",
    linkedin: "https://linkedin.com/company/scale-ai",
    founder: "Alexandr Wang"
  },
  {
    name: "Hugging Face",
    website: "https://huggingface.co",
    description: "Open-source ML models hub",
    linkedin: "https://linkedin.com/company/hugging-face",
    founder: "Clement Delangue"
  },
  {
    name: "Twelve Labs",
    website: "https://twelvelabs.io",
    description: "Video understanding API",
    linkedin: "https://linkedin.com/company/twelve-labs",
    founder: "Julien Chaumond"
  },
  {
    name: "Jasper AI",
    website: "https://jasper.ai",
    description: "Generative AI for content",
    linkedin: "https://linkedin.com/company/jasper-ai",
    founder: "Dave Rogenmoser"
  }
];

async function findAICompanies() {
  console.log("🔍 Finding 10 AI companies...");

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.length < 20) {
    console.log("⚠️ API key not configured. Using demo data...");
    fs.writeFileSync(COMPANIES_FILE, JSON.stringify(DEMO_COMPANIES, null, 2));
    console.log(`✅ Using ${DEMO_COMPANIES.length} demo companies`);
    return DEMO_COMPANIES;
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Find 10 emerging AI companies that are:
1. Founded in last 3 years
2. Have less than 100 employees
3. Focus on B2B SaaS or enterprise AI
4. Based in US/EU

Format as JSON array with: name, website, description, linkedin, founder`,
        },
      ],
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const companies = JSON.parse(jsonMatch[0]);
      fs.writeFileSync(COMPANIES_FILE, JSON.stringify(companies, null, 2));
      console.log(`✅ Found ${companies.length} companies`);
      return companies;
    }
  } catch (e) {
    console.log("⚠️ API error. Using demo data...");
    fs.writeFileSync(COMPANIES_FILE, JSON.stringify(DEMO_COMPANIES, null, 2));
    return DEMO_COMPANIES;
  }
}

async function generateLinkedInMessage(company, founder) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.length < 20) throw new Error("No API key");

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Write a LinkedIn message for ${founder} at ${company}. Short, genuine, reference their AI work. Under 200 chars.`,
        },
      ],
    });
    return response.content[0].text;
  } catch (e) {
    return `Hi ${founder}, impressed by ${company}'s work in AI. Would love to connect and discuss industry trends!`;
  }
}

async function generateColdEmail(company, website, founder) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.length < 20) throw new Error("No API key");

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Cold email to ${founder} at ${company}. Format: SUBJECT: [line]\nBODY: [text]. Mention helping with GTM.`,
        },
      ],
    });
    return response.content[0].text;
  } catch (e) {
    return `SUBJECT: Quick GTM opportunity for ${company}\nBODY: Hi ${founder},\n\nSaw ${company}'s progress in AI. We help companies like yours scale revenue faster.\n\nWorth a 15-min coffee chat?\n\nBest`;
  }
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
