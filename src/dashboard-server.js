import { createServer } from "node:http";
import { AnalyticsDashboard } from "./analytics-dashboard.js";

export function createDashboardServer({ port = 3000, dashboard } = {}) {
  dashboard = dashboard || AnalyticsDashboard.fromEnv();

  const routes = {
    "GET /api/overview": () => dashboard.getPageOverview(),
    "GET /api/insights": (params) =>
      dashboard.getPageInsights({ period: params.get("period") || "week" }),
    "GET /api/posts": (params) =>
      dashboard.getRecentPosts({ limit: parseInt(params.get("limit") || "25", 10) }),
    "GET /api/demographics": () => dashboard.getAudienceDemographics(),
    "GET /api/timeseries": (params) =>
      dashboard.getInsightsTimeSeries({
        period: params.get("period") || "day",
        since: params.get("since") || undefined,
        until: params.get("until") || undefined,
      }),
    "GET /api/report": () => dashboard.generateWeeklyReport(),
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const routeKey = `${req.method} ${url.pathname}`;

    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getDashboardHTML());
      return;
    }

    const handler = routes[routeKey];
    if (!handler) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    try {
      const data = await handler(url.searchParams);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      });
      res.end(JSON.stringify(data));
    } catch (err) {
      const status = err.message?.includes("API error") ? 502 : 500;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  return {
    server,
    start() {
      return new Promise((resolve) => {
        server.listen(port, () => {
          console.log(`Dashboard running at http://localhost:${port}`);
          resolve(server);
        });
      });
    },
    stop() {
      return new Promise((resolve) => server.close(resolve));
    },
  };
}

function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Facebook Page Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f2f5;color:#1c1e21}
.header{background:#1877f2;color:#fff;padding:16px 24px;display:flex;align-items:center;gap:12px}
.header h1{font-size:20px;font-weight:600}
.header .page-name{font-size:14px;opacity:.85}
.container{max-width:1200px;margin:0 auto;padding:20px}
.controls{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center}
.controls select,.controls input{padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px}
.controls button{padding:8px 16px;background:#1877f2;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px}
.controls button:hover{background:#166fe5}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.kpi-card{background:#fff;border-radius:10px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.kpi-card .label{font-size:12px;color:#65676b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.kpi-card .value{font-size:28px;font-weight:700;color:#1c1e21}
.kpi-card .sub{font-size:12px;color:#65676b;margin-top:4px}
.chart-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(500px,1fr));gap:20px;margin-bottom:24px}
.chart-card{background:#fff;border-radius:10px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.chart-card h3{font-size:16px;margin-bottom:12px;color:#1c1e21}
.chart-card canvas{width:100%!important;max-height:300px}
.posts-table{background:#fff;border-radius:10px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);margin-bottom:24px;overflow-x:auto}
.posts-table h3{font-size:16px;margin-bottom:12px}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #f0f2f5;font-size:13px}
th{font-weight:600;color:#65676b;text-transform:uppercase;font-size:11px;letter-spacing:.5px}
td.num{text-align:right;font-variant-numeric:tabular-nums}
.demo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:20px;margin-bottom:24px}
.loading{text-align:center;padding:40px;color:#65676b}
.error{background:#fce4ec;color:#c62828;padding:12px 16px;border-radius:8px;margin-bottom:16px}
@media(max-width:600px){.chart-grid,.demo-grid{grid-template-columns:1fr}.kpi-grid{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<div class="header">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.12 22 16.99 22 12z"/></svg>
  <div><h1>Page Monitoring Dashboard</h1><div class="page-name" id="pageName">Loading...</div></div>
</div>
<div class="container">
  <div class="controls">
    <label>Period:
      <select id="periodSelect">
        <option value="day">Daily</option>
        <option value="week" selected>Weekly</option>
        <option value="days_28">Monthly (28 days)</option>
      </select>
    </label>
    <label>From: <input type="date" id="sinceDate"></label>
    <label>To: <input type="date" id="untilDate"></label>
    <button onclick="loadAll()">Refresh</button>
  </div>
  <div id="errorBox"></div>
  <div class="kpi-grid" id="kpiGrid"><div class="loading">Loading KPIs...</div></div>
  <div class="chart-grid">
    <div class="chart-card"><h3>Reach &amp; Impressions</h3><canvas id="reachChart"></canvas></div>
    <div class="chart-card"><h3>Engagement</h3><canvas id="engagementChart"></canvas></div>
  </div>
  <div class="chart-grid">
    <div class="chart-card"><h3>Follower Growth</h3><canvas id="followerChart"></canvas></div>
    <div class="chart-card"><h3>Page Views</h3><canvas id="viewsChart"></canvas></div>
  </div>
  <div class="demo-grid">
    <div class="chart-card"><h3>Audience by Gender &amp; Age</h3><canvas id="genderAgeChart"></canvas></div>
    <div class="chart-card"><h3>Top Countries</h3><canvas id="countryChart"></canvas></div>
    <div class="chart-card"><h3>Top Cities</h3><canvas id="cityChart"></canvas></div>
  </div>
  <div class="posts-table">
    <h3>Recent Posts Performance</h3>
    <table>
      <thead><tr><th>Post</th><th class="num">Reactions</th><th class="num">Comments</th><th class="num">Engagement</th><th>Date</th></tr></thead>
      <tbody id="postsBody"><tr><td colspan="5" class="loading">Loading posts...</td></tr></tbody>
    </table>
  </div>
</div>
<script>
const charts={};
function showError(msg){document.getElementById('errorBox').innerHTML=msg?'<div class="error">'+msg+'</div>':''}
async function api(path){const r=await fetch(path);const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');return d}

function initDateDefaults(){
  const now=new Date();const ago=new Date(now.getTime()-30*86400000);
  document.getElementById('sinceDate').value=ago.toISOString().slice(0,10);
  document.getElementById('untilDate').value=now.toISOString().slice(0,10);
}

async function loadOverview(){
  try{
    const d=await api('/api/overview');
    document.getElementById('pageName').textContent=d.name||'';
    document.getElementById('kpiGrid').innerHTML=[
      kpi('Followers',fmt(d.followers_count||d.fan_count||0)),
      kpi('Talking About',fmt(d.talking_about_count||0)),
      kpi('New Likes',fmt(d.new_like_count||0)),
      kpi('Were Here',fmt(d.were_here_count||0)),
    ].join('');
  }catch(e){showError('Failed to load overview: '+e.message)}
}

async function loadInsightsKPI(){
  try{
    const period=document.getElementById('periodSelect').value;
    const d=await api('/api/insights?period='+period);
    const kpis=document.getElementById('kpiGrid');
    for(const m of d){
      const v=m.values?.[m.values.length-1];
      if(v&&v.value!==undefined){
        const val=typeof v.value==='object'?JSON.stringify(v.value):fmt(v.value);
        kpis.innerHTML+=kpi(m.title||m.name,val,m.description||'');
      }
    }
  }catch(e){/* insights may fail without read_insights scope */}
}

async function loadTimeSeries(){
  try{
    const period=document.getElementById('periodSelect').value;
    const since=document.getElementById('sinceDate').value;
    const until=document.getElementById('untilDate').value;
    let url='/api/timeseries?period='+period;
    if(since)url+='&since='+since;
    if(until)url+='&until='+until;
    const d=await api(url);

    renderTimeSeries('reachChart',
      [{key:'page_impressions',label:'Impressions',color:'#1877f2'},
       {key:'page_impressions_unique',label:'Reach (Unique)',color:'#42b72a'}],d);
    renderTimeSeries('engagementChart',
      [{key:'page_engaged_users',label:'Engaged Users',color:'#f5533d'},
       {key:'page_post_engagements',label:'Post Engagements',color:'#f7b928'}],d);
    renderTimeSeries('followerChart',
      [{key:'page_fan_adds',label:'New Followers',color:'#a033ff'}],d);
    renderTimeSeries('viewsChart',
      [{key:'page_views_total',label:'Page Views',color:'#00a8ff'}],d);
  }catch(e){showError('Failed to load time series: '+e.message)}
}

function renderTimeSeries(canvasId,series,data){
  if(charts[canvasId])charts[canvasId].destroy();
  const datasets=[];
  for(const s of series){
    const m=data[s.key];
    if(!m)continue;
    datasets.push({label:s.label,data:m.values.map(v=>({x:v.date,y:typeof v.value==='number'?v.value:0})),borderColor:s.color,backgroundColor:s.color+'20',fill:true,tension:.3,pointRadius:2});
  }
  if(!datasets.length)return;
  charts[canvasId]=new Chart(document.getElementById(canvasId),{
    type:'line',
    data:{datasets},
    options:{responsive:true,interaction:{intersect:false,mode:'index'},scales:{x:{type:'timeseries',time:{unit:'day'},ticks:{maxTicksLimit:12}},y:{beginAtZero:true}},plugins:{legend:{position:'bottom'}}}
  });
}

async function loadDemographics(){
  try{
    const d=await api('/api/demographics');
    renderGenderAge(d.genderAge||{});
    renderTopItems('countryChart',d.countries||{},'Countries','#1877f2');
    renderTopItems('cityChart',d.cities||{},'Cities','#42b72a');
  }catch(e){/* demographics may not be available */}
}

function renderGenderAge(data){
  if(charts.genderAgeChart)charts.genderAgeChart.destroy();
  const ages={};
  for(const[key,val] of Object.entries(data)){
    const[gender,range]=key.split('.');
    if(!ages[range])ages[range]={M:0,F:0,U:0};
    ages[range][gender]=(ages[range][gender]||0)+val;
  }
  const labels=Object.keys(ages).sort();
  charts.genderAgeChart=new Chart(document.getElementById('genderAgeChart'),{
    type:'bar',
    data:{labels,datasets:[
      {label:'Male',data:labels.map(l=>ages[l].M||0),backgroundColor:'#1877f2'},
      {label:'Female',data:labels.map(l=>ages[l].F||0),backgroundColor:'#f5533d'},
      {label:'Other',data:labels.map(l=>ages[l].U||0),backgroundColor:'#65676b'},
    ]},
    options:{responsive:true,scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true}},plugins:{legend:{position:'bottom'}}}
  });
}

function renderTopItems(canvasId,data,label,color){
  if(charts[canvasId])charts[canvasId].destroy();
  const sorted=Object.entries(data).sort((a,b)=>b[1]-a[1]).slice(0,10);
  charts[canvasId]=new Chart(document.getElementById(canvasId),{
    type:'bar',
    data:{labels:sorted.map(s=>s[0]),datasets:[{label,data:sorted.map(s=>s[1]),backgroundColor:color}]},
    options:{indexAxis:'horizontal',responsive:true,scales:{y:{beginAtZero:true}},plugins:{legend:{display:false}}}
  });
}

async function loadPosts(){
  try{
    const d=await api('/api/posts?limit=25');
    const tbody=document.getElementById('postsBody');
    if(!d.length){tbody.innerHTML='<tr><td colspan="5">No posts found</td></tr>';return}
    tbody.innerHTML=d.map(p=>{
      const reactions=p.reactions?.summary?.total_count||0;
      const comments=p.comments?.summary?.total_count||0;
      const msg=(p.message||'(no text)').slice(0,80);
      const date=p.created_time?new Date(p.created_time).toLocaleDateString():'';
      const text=p.permalink_url?'<a href="'+esc(p.permalink_url)+'" target="_blank" rel="noopener" style="color:#1877f2;text-decoration:none">'+esc(msg)+'</a>':esc(msg);
      return '<tr><td title="'+esc(p.message||'')+'">'+text+'</td><td class="num">'+fmt(reactions)+'</td><td class="num">'+fmt(comments)+'</td><td class="num"><strong>'+fmt(reactions+comments)+'</strong></td><td>'+date+'</td></tr>';
    }).join('');
  }catch(e){document.getElementById('postsBody').innerHTML='<tr><td colspan="5" class="error">'+e.message+'</td></tr>'}
}

function kpi(label,value,sub){return '<div class="kpi-card"><div class="label">'+esc(label)+'</div><div class="value">'+value+'</div>'+(sub?'<div class="sub">'+esc(sub)+'</div>':'')+'</div>'}
function fmt(n){return typeof n==='number'?n.toLocaleString():String(n)}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

async function loadAll(){
  showError('');
  await Promise.all([loadOverview(),loadTimeSeries(),loadDemographics(),loadPosts()]);
  await loadInsightsKPI();
}

initDateDefaults();
loadAll();
</script>
</body>
</html>`;
}
