import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message: userMessage } = await request.json();

    // AI not yet configured — return a clear message
    return NextResponse.json({
      message: `I received your message: "${userMessage}". AI assistant is not yet connected to a language model. Configure an LLM provider (e.g., OpenAI, Anthropic) in the environment variables to enable real AI responses.`,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
