# 🤖 Minitron - AI Prospecting Bot

Automated AI company discovery + personalized LinkedIn & email outreach.

## Features

✅ **Daily AI Company Discovery** - Finds 10 emerging AI companies daily  
✅ **Personalized LinkedIn Messages** - AI-generated connection requests  
✅ **Cold Email Generation** - Custom emails with subject lines  
✅ **Automatic Tracking** - JSON logs of all outreach  
✅ **GitHub Actions Automation** - Runs daily via CI/CD  

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Create `.env` file:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 3. Test Locally
```bash
npm start
```

Outputs:
- `companies_found.json` - List of discovered companies
- `tracking.json` - Outreach tracking data

## GitHub Actions Setup

1. Create repo: `github.com/xxrozar/minitron` (public)
2. Push code:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/xxrozar/minitron.git
git push -u origin main
```

3. Add Secret:
   - Go to Settings > Secrets > New Repository Secret
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your API key

4. Workflow runs daily at 9 AM UTC

## Architecture

- `minitron.js` - Main orchestrator
- `linkedin_agent.js` - LinkedIn prospecting logic
- `email_agent.js` - Email generation
- `.github/workflows/schedule.yml` - Daily automation

## Next Steps

- [ ] Connect LinkedIn API for actual connections
- [ ] Integrate SendGrid/Gmail for email sending
- [ ] Add Google Sheets sync for tracking
- [ ] Add response tracking + follow-ups
- [ ] Implement lead scoring

## Notes

⚠️ LinkedIn API requires Developer Partner approval  
⚠️ Email sending requires SMTP or SendGrid setup  
⚠️ Ensure GDPR/CAN-SPAM compliance  

---
Built with [Anthropic Claude API](https://anthropic.com)
