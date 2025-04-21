// app/api/generate-blog/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, keywords, urls } = body;

    if (!title || !keywords || !urls) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Replace with your LangFlow API URL
    const langflowApiUrl = 'https://your-langflow-api-endpoint'; // Replace with actual LangFlow endpoint

    // Assuming LangFlow requires a POST request to generate blog
    const response = await axios.post(langflowApiUrl, {
      title,
      keywords,
      urls,
    });

    if (response.status !== 200) {
      throw new Error('Failed to generate blog content from LangFlow');
    }

    // Assuming the LangFlow API response has a `generated_blog` field
    const blogContent = response.data.generated_blog;

    return NextResponse.json({ blog: blogContent });
  } catch (error: any) {
    console.error('Server Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
