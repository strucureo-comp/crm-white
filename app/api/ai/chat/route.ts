import { NextResponse } from 'next/server';

const responses: Record<string, string[]> = {
  tara: [
    'Based on your current pipeline, you have 3 high-value deals closing this month worth $45,000 total.',
    'I recommend reaching out to the following leads that haven\'t been contacted in over 7 days: TechCorp, DataFlow Systems.',
    'Your win rate this quarter is 68%, which is 12% higher than last quarter. Great job!',
    'The average deal size has increased by 15% compared to last month. Your team is moving upmarket.',
    'Looking at your leads, I notice Acme Corp has gone cold — consider sending a follow-up email today.',
    'Your team has closed 8 deals this month, putting you 2 ahead of target. Keep it up!',
  ],
  rio: [
    'Revenue this month is projected at $128,000, which is 8% above target.',
    'Your top-performing channel is organic search, driving 42% of all conversions.',
    'Customer acquisition cost has decreased by 22% this quarter due to improved targeting.',
    'The monthly recurring revenue (MRR) growth rate is 5.3%, putting you on track for annual growth of 63%.',
    'Invoice data shows 12 pending payments totaling $34,500 — consider sending payment reminders.',
    'Project completion rate is up 18% this quarter. Your team is delivering faster than average.',
  ],
};

export async function POST(request: Request) {
  try {
    const { assistant } = await request.json();
    const key = assistant === 'rio' ? 'rio' : 'tara';
    const pool = responses[key];
    const message = pool[Math.floor(Math.random() * pool.length)];
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
