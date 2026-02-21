/**
 * AdminAnalyticsPage.jsx (UPDATED)
 *
 * - interactive filters (platform, team, segment)
 * - compare modes (MoM, YoY) — simulated locally by shifting series
 * - stacked area chart for cost-per-platform over time
 * - server-side pagination (simulated via mockService)
 * - toggle between overall analytics and single-user analytics
 * - responsive layout
 *
 * Uses Recharts
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  AreaChart, Area, Legend, BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

import ScoreCard from "../components/ScoreCard/ScoreCard";
import Pagination from "../components/AnalyticsPagination/Pagination";
import {
  fetchUserPlatformRows,
  fetchGenerations,
  fetchCostPerPlatform,
  fetchKpis
} from "../utils/mockService";

import { platforms } from "../utils/mockAnalyticsExtended";
import "../styles/AdminDashboard.css";

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"];

export default function AdminAnalyticsPage() {
  // filters & controls
  const [days, setDays] = useState(30);
  const [platformFilter, setPlatformFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [segmentFilter, setSegmentFilter] = useState("All");
  const [compareMode, setCompareMode] = useState("None"); // None, MoM, YoY
  const [viewMode, setViewMode] = useState("Overall"); // Overall or Individual
  const [selectedUser, setSelectedUser] = useState("");

  // kpis & charts
  const [kpis, setKpis] = useState(null);
  const [generations, setGenerations] = useState([]);
  const [costSeries, setCostSeries] = useState([]);

  // table pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [tableRows, setTableRows] = useState([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [loadingTable, setLoadingTable] = useState(false);

  // fetch KPIs + charts
  useEffect(() => {
    fetchKpis().then(setKpis);
    fetchGenerations({ days }).then(data => setGenerations(data));
    fetchCostPerPlatform({ days }).then(setCostSeries);
  }, [days]);

  // fetch table data with filters & pagination (server-side simulated)
  useEffect(() => {
    setLoadingTable(true);
    fetchUserPlatformRows({
      page, pageSize,
      filters: {
        platform: platformFilter,
        team: teamFilter,
        segment: segmentFilter,
        q: selectedUser
      }
    })
      .then(({ rows, total }) => {
        setTableRows(rows);
        setTableTotal(total);
      })
      .finally(() => setLoadingTable(false));
  }, [page, pageSize, platformFilter, teamFilter, segmentFilter, selectedUser]);

  // handle compare (simple simulated overlay lines)
  const generationsWithCompare = useMemo(() => {
    if (!generations) return [];
    if (compareMode === "None") return generations;
    // simulate previous period by shifting/offset
    if (compareMode === "MoM") {
      return generations.map((d, i) => ({ ...d, prev: Math.round(d.count * (0.85 + 0.15 * Math.random())) }));
    } else if (compareMode === "YoY") {
      return generations.map((d, i) => ({ ...d, prev: Math.round(d.count * (0.7 + 0.5 * Math.random())) }));
    }
    return generations;
  }, [generations, compareMode]);

  // aggregate platform distribution for pie (derived from costSeries)
  const platformDistribution = useMemo(() => {
    if (!costSeries || costSeries.length === 0) return platforms.map((p, i) => ({ platform: p, count: i + 1 }));
    const latest = costSeries[costSeries.length - 1];
    return platforms.map(p => ({ platform: p, count: Number((latest[p] || 0).toFixed(2)) }));
  }, [costSeries]);

  const exportCSV = (data, filename = "export.csv") => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const rows = [headers.join(",")].concat(data.map(r => headers.map(h => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(",")));
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-analytics">
      <header className="analytics-header">
        <div>
          <h1>Operational & Performance Insights</h1>
          <p className="muted">Real-time-looking, pre-aggregated analytics (mock data). Use filters to refine.</p>
        </div>

        <div className="controls-wrap">
          <div className="controls-row">
            <label>Last
              <select value={days} onChange={e => setDays(Number(e.target.value))}>
                <option value={7}>7</option>
                <option value={14}>14</option>
                <option value={30}>30</option>
                <option value={90}>90</option>
              </select> days
            </label>

            <label>Platform
              <select value={platformFilter} onChange={e => { setPlatformFilter(e.target.value); setPage(1); }}>
                <option>All</option>
                {platforms.map(p => <option key={p}>{p}</option>)}
              </select>
            </label>

            <label>Team
              <select value={teamFilter} onChange={e => { setTeamFilter(e.target.value); setPage(1); }}>
                <option>All</option>
                <option>Growth</option>
                <option>Marketing</option>
                <option>Ops</option>
                <option>Support</option>
              </select>
            </label>

            <label>Segment
              <select value={segmentFilter} onChange={e => { setSegmentFilter(e.target.value); setPage(1); }}>
                <option>All</option>
                <option>Free</option>
                <option>Pro</option>
                <option>Enterprise</option>
              </select>
            </label>

            <label>Compare
              <select value={compareMode} onChange={e => setCompareMode(e.target.value)}>
                <option value="None">None</option>
                <option value="MoM">Month-over-Month (MoM)</option>
                <option value="YoY">Year-over-Year (YoY)</option>
              </select>
            </label>

            <label>View
              <select value={viewMode} onChange={e => setViewMode(e.target.value)}>
                <option value="Overall">Overall</option>
                <option value="Individual">Individual User</option>
              </select>
            </label>

            {viewMode === "Individual" && (
              <input placeholder="Search user id/name" value={selectedUser} onChange={e => { setSelectedUser(e.target.value); setPage(1); }} />
            )}

            <div className="export-buttons">
              <button onClick={() => exportCSV(generations, "generations.csv")} type="button">Export CSV</button>
            </div>
          </div>
        </div>
      </header>

      {/* KPI row */}
      <section className="kpi-row">
        {kpis && (
          <>
            <ScoreCard title="Active AI Users" value={kpis.activeAiUsers.value} deltaPercent={kpis.activeAiUsers.deltaPercent} sparkData={kpis.activeAiUsers.series} color="#3b82f6" />
            <ScoreCard title="Cost per Generated Post (CPP)" value={`$${kpis.costPerPost.value}`} deltaPercent={kpis.costPerPost.deltaPercent} sparkData={kpis.costPerPost.series} color="#f59e0b" />
            <ScoreCard title="API Failure Rate" value={`${kpis.apiFailureRate.value}%`} deltaPercent={kpis.apiFailureRate.deltaPercent} sparkData={kpis.apiFailureRate.series} color="#ef4444" />
            <ScoreCard title="Content Rejection Rate" value={`${kpis.rejectionRate.value}%`} deltaPercent={kpis.rejectionRate.deltaPercent} sparkData={kpis.rejectionRate.series} color="#10b981" />
          </>
        )}
      </section>

      <section className="analytics-grid">
        {/* Generations Over Time with compare */}
        <div className="card large">
          <h3>Generations Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={generationsWithCompare}>
              <CartesianGrid stroke="#eef2f7" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
              {compareMode !== "None" && <Line type="monotone" dataKey="prev" stroke="#ef4444" strokeDasharray="4 6" dot={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cost per platform stacked area */}
        <div className="card">
          <h3>Cost per Platform (Stacked)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={costSeries}>
              <CartesianGrid stroke="#f3f4f6" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
              <YAxis />
              <Tooltip />
              <Legend />
              {platforms.map((p, i) => (
                <Area key={p} type="monotone" dataKey={p} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.6} />
              ))}
            </AreaChart>
          </ResponsiveContainer>

          <h4 style={{ marginTop: 10 }}>Platform Distribution (Latest)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={platformDistribution} dataKey="count" nameKey="platform" cx="50%" cy="50%" outerRadius={70} label>
                {platformDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Bottom area: table + pagination */}
      <section className="card full">
        <h3>User / Platform Breakdown</h3>
        <div className="table-controls">
          <div>Showing {tableRows.length} of {tableTotal} rows</div>
          <div className="table-actions">
            <label>Page size:
              <select value={pageSize} disabled>
                <option>{pageSize}</option>
              </select>
            </label>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>User</th><th>Platform</th><th>Generated</th><th>Cost ($)</th><th>Team</th><th>Segment</th><th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr><td colSpan="7">Loading…</td></tr>
              ) : tableRows.length === 0 ? (
                <tr><td colSpan="7">No rows.</td></tr>
              ) : tableRows.map(r => (
                <tr key={r.id}>
                  <td>{r.user}</td>
                  <td>{r.platform}</td>
                  <td>{r.generated}</td>
                  <td>{r.cost.toFixed(2)}</td>
                  <td>{r.team}</td>
                  <td>{r.segment}</td>
                  <td>{r.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <Pagination page={page} pageSize={pageSize} total={tableTotal} onPageChange={(p) => setPage(Math.max(1, p))} />
        </div>
      </section>
    </div>
  );
}
