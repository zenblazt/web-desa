import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGeminiQuotaStatus } from "@/lib/ai-assistant";
import { getSearchQuotaStatus } from "@/lib/search-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [gemini, search] = await Promise.all([
    getGeminiQuotaStatus(),
    getSearchQuotaStatus().catch(() => null),
  ]);

  return NextResponse.json({ gemini, search });
}
