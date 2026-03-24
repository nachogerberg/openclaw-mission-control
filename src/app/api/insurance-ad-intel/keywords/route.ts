import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const keywords = {
  en: [
    'life insurance',
    'annuity',
    'term life insurance',
    'whole life insurance',
    'permanent life insurance',
    'final expense insurance',
    'mortgage protection insurance',
  ],
  es: [
    'seguro de vida',
    'anualidad',
    'seguro de vida a término',
    'seguro de vida entera',
    'seguro de vida permanente',
    'seguro de gastos finales',
    'seguro de protección hipotecaria',
  ],
  regions: ['US', 'PR'],
};

export async function GET() {
  return NextResponse.json(keywords);
}
