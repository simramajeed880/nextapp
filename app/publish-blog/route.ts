import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { content, keywords, urls } = await req.json();

        // Simulating saving the blog (replace with database logic if needed)
        console.log("Blog Published:", { content, keywords, urls });

        return NextResponse.json({ message: "Blog Published Successfully!" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to publish blog." }, { status: 500 });
    }
}
