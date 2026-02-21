import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import KpiCard from "../components/KpiCard/KpiCard";
import "../styles/AdminDashboard.css";

// Import the Real API Service
import { fetchKpis, fetchGenerationsChart } from "../utils/apiService";
import { supabase } from "../../services/supabaseClient";

export default function AdminOverview() {
  const [kpis, setKpis] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch data (extracted so we can call it from Realtime listeners)
  async function loadData() {
    try {
      // Fetch Real Database Data
      const kpiData = await fetchKpis();
      const graphData = await fetchGenerationsChart(30);

      setKpis(kpiData);
      setChartData(graphData);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // 1. Initial Load
    loadData();

    // 2. Set up Real-Time Subscription
    // We listen to changes on tables that affect our KPIs
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        console.log('Realtime Update: Profiles');
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'generations' }, () => {
        console.log('Realtime Update: Generations');
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        console.log('Realtime Update: Posts');
        loadData();
      })
      .subscribe();

    // 3. Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <div className="p-8 text-white">Loading Dashboard...</div>;

  return (
    <div className="admin-overview fade-in">
      <h2 className="page-title">Dashboard Overview</h2>
      
      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {kpis.map((kpi, index) => (
          <KpiCard 
            key={index} 
            title={kpi.title} 
            value={kpi.value} 
            trend={kpi.trend} 
            trendUp={kpi.trendUp}
            color={kpi.color}
          />
        ))}
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-container">
          <h3>Generation Volume (30 Days)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="date" 
                  stroke="#888" 
                  tickFormatter={(str) => {
                    const d = new Date(str);
                    return `${d.getMonth()+1}/${d.getDate()}`;
                  }}
                />
                <YAxis stroke="#888" allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
                  itemStyle={{ color: '#818cf8' }}
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                />
                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Generations" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}