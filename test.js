const Anthropic = require("@anthropic-ai/sdk");
require("dotenv").config();

async function testConnection() {
  console.log("🧪 Testing Minitron Setup...\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ Error: ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    console.log("📡 Testing Anthropic API connection...");
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: "Say 'Minitron is ready' in one sentence.",
        },
      ],
    });

    console.log("✅ API Connection: OK");
    console.log("✅ Model: claude-opus-4-8");
    console.log("✅ Response:", response.content[0].text);
    console.log("\n🚀 Minitron is ready to run!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testConnection();
