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
4. Based in US/EU

For each company, provide:
- Name
- Website
- Brief description (1 line)
- LinkedIn company page URL (estimate based on name)
- CEO/Founder name (if known)

Format ONLY as JSON array, no other text. Example: [{"name":"X","website":"url","description":"desc","linkedin":"url","founder":"name"}]`,
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
Hi ${founder},
I've been following ${company}'s work in AI and infrastructure, and I'm impressed with what you're building.
We specialize in helping AI teams like yours scale infrastructure 10x faster. Recently worked with teams doing similar things helped them deploy in 2 weeks instead of 2 months.
Not sure if that's relevant to your current roadmap, but thought I'd say hi.
Would be great to connect!
Best,
Qaush
WithStrive

IMPORTANT: Keep under 250 characters, make it personalized based on ${description}, remove all dashes between words.`,
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
    return `Hi ${founder}, I've been following ${company}'s work and I'm impressed. We help AI teams scale infrastructure 10x faster. Would love to connect!`;
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
          content: `Create a PERSONALIZED cold email for ${founder} at ${company} (${description}).
Use this template and customize it heavily:

SUBJECT: 3 Ways AI Teams Waste Time (and How We Fixed It)

BODY:
Hi ${founder},

Most AI founders spend 80% of their time on infrastructure instead of building features.
We noticed this pattern across 30+ AI companies we've worked with:

Weeks spent on deployment pipelines
Months getting models to production
Constant firefighting with infrastructure

WithStrive helps AI companies like ${company}:

1. Deploy ML models in days (not months)
2. Scale infrastructure without technical debt
3. Go from prototype to production in weeks

Would love to explore if we could do the same for ${company}.
Are you open to a 15 minute conversation?

Best,
Qaush
WithStrive
withstrive.in

IMPORTANT: Personalize with details about ${company} and ${description}. Remove all dashes.`,
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
    return `SUBJECT: 3 Ways AI Teams Waste Time
BODY:
Hi ${founder},
We help AI companies like ${company} deploy models in days instead of months.
Would love a quick chat?
Best,
Qaush
WithStrive`;
  }
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

async function writeToGoogleSheets(companies, emailResults, linkedinResults) {
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
      c.website || "",
      c.founder || "",
      c.co_founder || "",
      c.founder_email || "",
      linkedinResults[i] ? "sent" : "pending",
      emailResults[i] ? "Yes" : "No",
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A2:H",
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

    // Step 5: Write to Google Sheets
    await writeToGoogleSheets(companies, emailResults, linkedinResults);

    console.log("\n✅ DONE! Check companies_found.json, tracking.json, and your Google Sheet");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
