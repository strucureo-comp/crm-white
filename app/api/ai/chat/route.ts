import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy',
});

const SYSTEM_PROMPTS: Record<string, string> = {
  tara: 'You are Tara, an expert sales assistant for a CRM platform. You are helpful, persuasive, and professional. Keep your responses concise and action-oriented.',
  rio: 'You are Rio, a data analytics assistant for a CRM platform. You are precise, logical, and insightful. You help users understand their metrics, trends, and business data.',
};

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      const { message } = await request.json();
      return NextResponse.json({
        message: `I received your message: "${message}". The OpenAI API Key is not configured. Please add OPENAI_API_KEY to your environment variables to enable real AI responses.`,
      });
    }

    const { assistant, messages: history } = await request.json();
    const systemPrompt = SYSTEM_PROMPTS[assistant] || 'You are a helpful AI assistant for a CRM platform.';

    const formattedMessages = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.message,
    }));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedMessages,
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiMessage = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    return NextResponse.json({ message: aiMessage });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 });
  }
}
