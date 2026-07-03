import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Generate demo data
const generateData = () => {
  const data = [];
  let tvl = 180;
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 86_400_000);
    tvl = Math.max(50, tvl + (Math.random() - 0.42) * 15);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tvl: parseFloat(tvl.toFixed(1)),
      stakers: Math.max(80, Math.round(100 + (tvl - 180) * 0.5 + Math.random() * 10)),
    });
  }
  return data;
};

const data = generateData();

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: 13,
      fontFamily: 'var(--font-display)',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontSize: 11 }}>{label}</div>
      <div style={{ color: 'var(--cyan)', fontWeight: 600 }}>{payload[0]?.value}K XLM TVL</div>
      <div style={{ color: 'var(--violet)', fontWeight: 600, marginTop: 2 }}>{payload[1]?.value} Stakers</div>
    </div>
  );
};

export function ActivityChart() {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>TVL & Staker Growth</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>30-day protocol activity</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#4A5878', fontSize: 10, fontFamily: 'Space Grotesk' }}
            tickLine={false}
            axisLine={false}
            interval={6}
          />
          <YAxis
            tick={{ fill: '#4A5878', fontSize: 10, fontFamily: 'Space Grotesk' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
          <Area type="monotone" dataKey="tvl" stroke="#00E5FF" strokeWidth={1.5} fill="url(#gradCyan)" dot={false} />
          <Area type="monotone" dataKey="stakers" stroke="#8B5CF6" strokeWidth={1.5} fill="url(#gradViolet)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
        <LegendItem color="var(--cyan)" label="TVL (K XLM)" />
        <LegendItem color="var(--violet)" label="Stakers" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
      <span style={{ width: 20, height: 2, background: color, borderRadius: 1 }} />
      {label}
    </div>
  );
}
