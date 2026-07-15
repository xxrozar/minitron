#!/usr/bin/env node
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
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

async function sendEmailViaSendGrid(toEmail, subject, body) {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.log("⚠️ SendGrid API key not set - skipping email");
      return false;
    }

    await axios.post("https://api.sendgrid.com/v3/mail/send", {
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: process.env.EMAIL_FROM || "gul@withstrive.in" },
      subject: subject,
      content: [{ type: "text/plain", value: body }],
    }, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    console.log(`✅ Email sent to ${toEmail}`);
    return true;
  } catch (e) {
    console.log(`⚠️ Email failed: ${e.message}`);
    return false;
  }
}

async function sendLinkedInViaBuster(name, profileUrl) {
  try {
    const apiKey = process.env.PHANTOM_BUSTER_KEY;
    if (!apiKey) {
      console.log("⚠️ Phantom Buster key not set - skipping LinkedIn");
      return false;
    }

    // Phantom Buster API for LinkedIn connection
    await axios.post("https://api.phantombuster.com/api/v2/agents/launch", {
      agentId: "7496",  // LinkedIn profile visitor agent
      arguments: {
        spreadsheetUrl: profileUrl,
        numberOfLinesPerLaunch: 1,
      }
    }, {
      headers: { "X-Phantom-Auth-Token": apiKey }
    });

    console.log(`✅ LinkedIn connection sent to ${name}`);
    return true;
  } catch (e) {
    console.log(`⚠️ LinkedIn failed: ${e.message}`);
    return false;
  }
}

async function trackOutreach(companies, emailResults = [], linkedinResults = []) {
  const tracking = {
    timestamp: new Date().toISOString(),
    total_companies: companies.length,
    emails_sent: emailResults.filter(r => r).length,
    linkedin_connections_sent: linkedinResults.filter(r => r).length,
    companies: companies.map((c, i) => ({
      name: c.name,
      website: c.website,
      linkedin_status: linkedinResults[i] ? "sent" : "pending",
      email_status: emailResults[i] ? "sent" : "pending",
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

    // Step 2: Send LinkedIn connections
    console.log("\n💬 Sending LinkedIn connections...");
    const linkedinResults = [];
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const result = await sendLinkedInViaBuster(
        company.name,
        company.linkedin || "#"
      );
      linkedinResults.push(result);
    }

    // Step 3: Send cold emails
    console.log("\n📧 Sending cold emails...");
    const emailResults = [];
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const email = await generateColdEmail(
        company.name,
        company.website,
        company.founder || "Team"
      );
      const [subject, body] = email.split("BODY:").map(s => s.trim());
      const result = await sendEmailViaSendGrid(
        company.founder_email || "contact@" + company.website.replace("https://", "").replace("http://", ""),
        subject.replace("SUBJECT:", "").trim(),
        body
      );
      emailResults.push(result);
    }

    // Step 4: Track everything
    await trackOutreach(companies, emailResults, linkedinResults);

    console.log("\n✅ DONE! Check companies_found.json and tracking.json");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
