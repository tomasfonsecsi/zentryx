import { NextRequest, NextResponse } from "next/server";

const IRIS_API = "https://iris-api-sandbox.circle.com/v2/messages";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceDomain = searchParams.get("sourceDomain");
  const transactionHash = searchParams.get("transactionHash");

  if (!sourceDomain || !transactionHash) {
    return NextResponse.json(
      { error: "Missing sourceDomain or transactionHash" },
      { status: 400 }
    );
  }

  const url = `${IRIS_API}/${sourceDomain}?transactionHash=${transactionHash}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("[Attestation proxy] Fetch failed:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to reach attestation service", detail: err?.message },
      { status: 502 }
    );
  }
}
