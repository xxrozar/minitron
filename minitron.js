#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { google } = require("googleapis");
require("dotenv").config();

const COMPANIES_FILE = "companies_found.json";
const TRACKING_FILE = "tracking.json";

async function findAICompanies() {
  console.log("🔍 Finding 10 AI companies...");

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log("⚠️ GROQ_API_KEY not set");
    return [];
  }

  try {
    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.3-70b-versatile",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Find 10 emerging AI companies that are:
1. Founded in last 3 years
2. Have less than 100 employees (target early stage)
3. Focus on B2B SaaS or enterprise AI
4. Mix of locations: 5 from India (Bangalore, Mumbai, Delhi, Hyderabad, Pune) and 5 from abroad (US, EU, UK, Singapore, UAE)
5. Well funded or growing fast (good potential clients)

For each company, provide:
- Name
- Website
- Brief description (1 line)
- LinkedIn company page URL (estimate based on name)
- CEO/Founder name (if known)
- Co-founder name (if known)
- Country

Format ONLY as JSON array, no other text. Example: [{"name":"X","website":"url","description":"desc","linkedin":"url","founder":"name","co_founder":"name","country":"India"}]`,
        },
      ],
    }, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const companies = JSON.parse(jsonMatch[0]);
      fs.writeFileSync(COMPANIES_FILE, JSON.stringify(companies, null, 2));
      console.log(`✅ Found ${companies.length} companies`);
      return companies;
    }
  } catch (e) {
    console.error("Groq API error:", e.message);
  }
  return [];
}

async function generateLinkedInMessage(company, founder, description) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("No GROQ API key");

    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Create a PERSONALIZED LinkedIn message for ${founder} at ${company}.
Company focus: ${description}

Use this template and customize it:
Hi ${founder}, impressed by what you're building at ${company}. We help AI teams ship to production in weeks instead of months. Would love to connect!
Gul Mohammed, WithStrive

IMPORTANT: Keep under 250 characters, personalize based on ${description}, no dashes. Output ONLY the message.`,
        },
      ],
    }, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    return response.data.choices[0].message.content;
  } catch (e) {
    return `Hi ${founder}, impressed by what you're building at ${company}. We help AI teams ship to production in weeks instead of months. Would love to connect! Gul Mohammed, WithStrive`;
  }
}

async function generateColdEmail(company, website, founder, description) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("No GROQ API key");

    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.3-70b-versatile",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Create a SHORT, catchy cold email for ${founder} at ${company} (${description}).
Use this template and customize it:

SUBJECT: Quick question about ${company}

BODY:
Hi ${founder},

Saw what you're building at ${company} and it caught my attention.

Most AI teams lose months wrestling with infrastructure instead of shipping features. We fix that. WithStrive helps teams like yours go from prototype to production in weeks, not months.

Worth a quick 15 minute chat?

Best,
Gul Mohammed
WithStrive
withstrive.in

IMPORTANT: Keep the body under 80 words. Make the first line specific to ${description}. No dashes, no fluff, no buzzwords. Output ONLY the subject and body in the format above.`,
        },
      ],
    }, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    return response.data.choices[0].message.content;
  } catch (e) {
    return `SUBJECT: Quick question about ${company}
BODY:
Hi ${founder},
We help AI companies like ${company} ship to production in weeks, not months.
Worth a quick chat?
Best,
Gul Mohammed
WithStrive
withstrive.in`;
  }
}

async function writeToGoogleSheets(companies, emailDrafts, linkedinMessages) {
  try {
    const keyStr = process.env.GOOGLE_SHEETS_KEY;
    if (!keyStr) {
      console.log("⚠️ Google Sheets key not set - skipping sheet write");
      return false;
    }

    const key = JSON.parse(keyStr);
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const SHEET_ID = "1rkBlkmsm4M5FSE8YKipm1tPxhhDI_1k48xecfxoP914";

    const rows = companies.map((c, i) => [
      new Date().toLocaleDateString(),
      c.name || "",
      c.country || "",
      c.website || "",
      c.founder || "",
      c.co_founder || "",
      c.linkedin || "",
      linkedinMessages[i] || "",
      emailDrafts[i] || "",
      "pending",
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A2:J",
      valueInputOption: "USER_ENTERED",
      resource: {
        values: rows,
      },
    });

    console.log(`✅ Data written to Google Sheet (${rows.length} rows)`);
    return true;
  } catch (e) {
    console.log(`⚠️ Google Sheets write failed: ${e.message}`);
    return false;
  }
}

async function trackOutreach(companies, emailDrafts = [], linkedinMessages = []) {
  const tracking = {
    timestamp: new Date().toISOString(),
    total_companies: companies.length,
    emails_sent: 0,
    email_drafts_generated: emailDrafts.filter(d => d).length,
    linkedin_messages_generated: linkedinMessages.filter(m => m).length,
    companies: companies.map((c, i) => ({
      name: c.name,
      website: c.website,
      country: c.country || "",
      founder: c.founder || "",
      co_founder: c.co_founder || "",
      linkedin_message: linkedinMessages[i] || "",
      email_draft: emailDrafts[i] || "",
      status: "ready for manual outreach",
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

    // Step 2: Generate LinkedIn messages (saved to sheet for manual sending)
    console.log("\n💬 Generating LinkedIn messages...");
    const linkedinMessages = [];
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const message = await generateLinkedInMessage(
        company.name,
        company.founder || "there",
        company.description || ""
      );
      linkedinMessages.push(message);
      console.log(`✅ Message ready for ${company.name}`);
    }

    // Step 3: Generate email drafts (saved to sheet for manual sending)
    console.log("\n📧 Generating email drafts...");
    const emailDrafts = [];
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const email = await generateColdEmail(
        company.name,
        company.website,
        company.founder || "Team",
        company.description || ""
      );
      emailDrafts.push(email);
      console.log(`✅ Email draft ready for ${company.name}`);
    }

    // Step 4: Track everything
    await trackOutreach(companies, emailDrafts, linkedinMessages);

    // Step 5: Write to Google Sheets
    await writeToGoogleSheets(companies, emailDrafts, linkedinMessages);

    console.log("\n✅ DONE! Check companies_found.json, tracking.json, and your Google Sheet");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
