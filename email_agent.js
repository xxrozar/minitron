const Anthropic = require("@anthropic-ai/sdk");
require("dotenv").config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Email Agent - Generates and can send cold emails
 * Note: Email sending requires SMTP config or SendGrid/Mailgun integration
 */

class EmailAgent {
  async generateColdEmail(prospect, tone = "professional") {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Generate a cold email for outreach.
Prospect: ${prospect.name}
Title: ${prospect.title}
Company: ${prospect.company}
Email: ${prospect.email}
Tone: ${tone}

Requirements:
- Subject line (under 50 chars)
- Body (150-200 words)
- Open with specific relevant insight
- State clear value proposition
- Soft CTA (meeting/call, not pushy)
- Professional but personable

Format:
SUBJECT: [subject line]
BODY:
[email body]`,
        },
      ],
    });

    const content = response.content[0].text;
    const [subject, body] = content.split("BODY:").map((s) => s.trim());

    return {
      prospect: prospect.name,
      email: prospect.email,
      subject: subject.replace("SUBJECT:", "").trim(),
      body: body,
      timestamp: new Date().toISOString(),
    };
  }

  async generateFollowUp(prospect, days = 3) {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Generate a follow-up email (${days} days later) to ${prospect.name} at ${prospect.company}.
They haven't responded to initial outreach.

Requirements:
- Acknowledge the previous message subtly
- Add new value (statistic, insight, case study reference)
- Keep it short
- Include soft CTA

Format as email body only.`,
        },
      ],
    });

    return {
      prospect: prospect.name,
      type: "follow-up",
      days_after: days,
      body: response.content[0].text,
      timestamp: new Date().toISOString(),
    };
  }

  async generateABTest(prospect) {
    /**
     * Generate 2 variations of subject line for A/B testing
     */
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Generate 2 different subject lines for cold email to ${prospect.name} at ${prospect.company}.
One should be:
A) Direct/benefit-focused
B) Curiosity/question-based

Output as:
A) [subject A]
B) [subject B]`,
        },
      ],
    });

    const content = response.content[0].text;
    const lines = content.split("\n").filter((l) => l.trim());

    return {
      prospect: prospect.name,
      variant_a: lines[0] || "Subject A",
      variant_b: lines[1] || "Subject B",
    };
  }
}

module.exports = EmailAgent;
