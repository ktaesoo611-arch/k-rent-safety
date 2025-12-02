import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: '2025-12-02-v3',
    timestamp: new Date().toISOString(),
    paymentAmount: 0,
    message: 'Free beta - should redirect to /analyze/[id] without calling Toss Payments'
  });
}
