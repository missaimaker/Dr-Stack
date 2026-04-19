Dr. Stack

> AI symptom triage & free clinic finder for the uninsured. Because 404: Doctor Not Found shouldn't be your only option

---
## The Problem

30 million Americans are uninsured. When they get sick they face two bad options:
- Google their symptoms and convince themselves they're dying
- Pay hundreds of dollars for a doctor visit they can't afford

Dr. Stack fixes this.

##  What It Does

You describe your symptoms in plain English. Dr. Stack:

1. **Asks smart follow-up questions** to understand your situation
2. **Assesses urgency** so you know exactly what to do
   - 🚨 Emergency → Call 911 now
   - ⚠️ Urgent → Go today
   - ✅ Non-Urgent → Schedule an appointment
3. **Finds free clinics near you** using your ZIP code
4. **Explains everything in plain language** — no medical jargon

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React + Vite | Frontend |
| Google Gemini API | AI symptom triage |
| HRSA Government API | Free clinic finder |
| Tailwind CSS | Styling |
| AWS Amplify | Deployment |

---

## Running Locally

**1. Clone the repo**
```bash
git clone https://github.com/yourusername/drstack.git
cd drstack
```

**2. Install dependencies**
```bash
npm install
```

**3. Add your API key**

Create a `.env` file in the root folder:
VITE_GEMINI_API_KEY=your_gemini_api_key_here
Get your free Gemini key at [aistudio.google.com](https://aistudio.google.com)

**4. Run it**
```bash
npm run dev
```

Open your browser → **localhost:5173** ✅

---

## Deploying to AWS Amplify

1. Push your code to GitHub
2. Go to [aws.amazon.com/amplify](https://aws.amazon.com/amplify)
3. Click **New App** → **Host Web App** → connect your GitHub repo
4. Add your environment variable `VITE_GEMINI_API_KEY` in Amplify settings
5. Click **Deploy** → get your public URL 🎉

---

## Disclaimer

Dr. Stack is not a medical device and does not provide medical diagnoses. Always consult a licensed healthcare provider for medical advice.

---

## Author

Built solo in 24 hours at Hook 'Em Hacks 2026 by **Medhawi**
