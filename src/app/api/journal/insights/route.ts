import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const db = getSupabaseAdminClient();

  // Get last 30 days of journal entries
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: entries } = await db
    .from('journal_entries')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (!entries || entries.length === 0) {
    return NextResponse.json({
      insights: [],
      moodTrend: [],
      bestDay: null,
      worstDay: null,
      totalEntries: 0,
    });
  }

  const insights: { text: string; type: 'positive' | 'negative' | 'neutral' }[] = [];

  // Sleep vs energy correlation
  const goodSleep = entries.filter(e => e.sleep_hours && e.sleep_hours >= 7);
  const badSleep = entries.filter(e => e.sleep_hours && e.sleep_hours < 7);

  if (goodSleep.length > 0 && badSleep.length > 0) {
    const avgEnergyGoodSleep = goodSleep.reduce((s, e) => s + (e.energy_level || 0), 0) / goodSleep.length;
    const avgEnergyBadSleep = badSleep.reduce((s, e) => s + (e.energy_level || 0), 0) / badSleep.length;
    const diff = Math.round(((avgEnergyGoodSleep - avgEnergyBadSleep) / Math.max(avgEnergyBadSleep, 1)) * 100);
    if (diff > 0) {
      insights.push({
        text: `Quand vous dormez +7h, votre énergie est ${diff}% plus élevée`,
        type: 'positive',
      });
    }
  }

  // Alcohol vs energy
  const alcoholDays = entries.filter(e => e.alcohol);
  const noAlcoholDays = entries.filter(e => !e.alcohol && e.energy_level);

  if (alcoholDays.length > 0 && noAlcoholDays.length > 0) {
    const avgEnergyAlcohol = alcoholDays.reduce((s, e) => s + (e.energy_level || 0), 0) / alcoholDays.length;
    const avgEnergyNoAlcohol = noAlcoholDays.reduce((s, e) => s + (e.energy_level || 0), 0) / noAlcoholDays.length;
    const diff = Math.round(((avgEnergyNoAlcohol - avgEnergyAlcohol) / Math.max(avgEnergyAlcohol, 1)) * 100);
    if (diff > 10) {
      insights.push({
        text: `Votre énergie est ${diff}% plus haute les jours sans alcool`,
        type: 'positive',
      });
    }
  }

  // Caffeine vs stress
  const highCaffeine = entries.filter(e => e.caffeine_cups && e.caffeine_cups >= 3);
  const lowCaffeine = entries.filter(e => e.caffeine_cups !== null && e.caffeine_cups < 3 && e.stress_level);

  if (highCaffeine.length > 0 && lowCaffeine.length > 0) {
    const avgStressHigh = highCaffeine.reduce((s, e) => s + (e.stress_level || 0), 0) / highCaffeine.length;
    const avgStressLow = lowCaffeine.reduce((s, e) => s + (e.stress_level || 0), 0) / lowCaffeine.length;
    if (avgStressHigh > avgStressLow + 0.5) {
      insights.push({
        text: `Les jours avec 3+ cafés, votre stress est plus élevé`,
        type: 'negative',
      });
    }
  }

  // Mood trend
  const moodTrend = entries
    .filter(e => e.mood)
    .map(e => ({ date: e.date, mood: e.mood }));

  // Best/worst day of week
  const dayMap: Record<number, { energy: number[]; mood: number[] }> = {};
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  for (const entry of entries) {
    const day = new Date(entry.date).getDay();
    if (!dayMap[day]) dayMap[day] = { energy: [], mood: [] };
    if (entry.energy_level) dayMap[day].energy.push(entry.energy_level);
    if (entry.mood) dayMap[day].mood.push(entry.mood);
  }

  let bestDay: string | null = null;
  let worstDay: string | null = null;
  let bestScore = 0;
  let worstScore = 11;

  for (const [dayIdx, vals] of Object.entries(dayMap)) {
    if (vals.energy.length === 0) continue;
    const avgEnergy = vals.energy.reduce((a, b) => a + b, 0) / vals.energy.length;
    const avgMood = vals.mood.length > 0 ? vals.mood.reduce((a, b) => a + b, 0) / vals.mood.length : avgEnergy;
    const score = avgEnergy + avgMood;
    if (score > bestScore) { bestScore = score; bestDay = dayNames[Number(dayIdx)]; }
    if (score < worstScore) { worstScore = score; worstDay = dayNames[Number(dayIdx)]; }
  }

  if (bestDay) {
    insights.push({ text: `Votre meilleur jour : ${bestDay}`, type: 'positive' });
  }
  if (worstDay) {
    insights.push({ text: `Jour le plus difficile : ${worstDay}`, type: 'negative' });
  }

  return NextResponse.json({
    insights,
    moodTrend,
    bestDay,
    worstDay,
    totalEntries: entries.length,
  });
}
