import { supabase } from "../../services/supabaseClient";

// --- HELPER: Group Data by Date for Charts ---
function aggregateByDate(data, dateKey = 'created_at') {
  const agg = {};
  data.forEach(item => {
    const date = new Date(item[dateKey]).toISOString().split('T')[0]; // YYYY-MM-DD
    if (!agg[date]) agg[date] = 0;
    agg[date] += 1;
  });
  return Object.entries(agg)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// --- 1. FETCH KPIS (Real Database Counts) ---
export async function fetchKpis() {
  try {
    // Run 4 queries in parallel for performance
    const [users, generations, scheduled, published] = await Promise.all([
      // 1. Total Users
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      
      // 2. Total Generated Content
      supabase.from('generations').select('*', { count: 'exact', head: true }),
      
      // 3. Scheduled Posts
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),

      // 4. Published Content
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published')
    ]);

    const totalUsers = users.count || 0;
    const totalGen = generations.count || 0;
    const totalScheduled = scheduled.count || 0;
    const totalPublished = published.count || 0;
    const totalActivePosts = totalScheduled + totalPublished;

    return [
      { 
        title: "Total Users", 
        value: totalUsers.toLocaleString(), 
        trend: "Active", // You can calculate % growth here if you have historical data
        trendUp: true,
        color: "#10B981" // Green
      },
      { 
        title: "Total Generated", 
        value: totalGen.toLocaleString(), 
        trend: "Assets created", 
        trendUp: true,
        color: "#3B82F6" // Blue
      },
      { 
        title: "Scheduled & Posted", 
        value: totalActivePosts.toLocaleString(), 
        trend: `${totalScheduled} Pending`, 
        trendUp: true,
        color: "#F59E0B" // Orange
      },
      { 
        title: "Conversion Rate", 
        value: totalGen ? `${((totalActivePosts / totalGen) * 100).toFixed(1)}%` : "0%", 
        trend: "Gen to Post", 
        trendUp: true,
        color: "#8B5CF6" // Purple
      }
    ];
  } catch (err) {
    console.error("Error fetching KPIs:", err);
    return [];
  }
}

// --- 2. FETCH GENERATION CHART DATA ---
export async function fetchGenerationsChart(days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('generations')
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    return aggregateByDate(data);
  } catch (err) {
    console.error("Error fetching chart data:", err);
    return [];
  }
}
