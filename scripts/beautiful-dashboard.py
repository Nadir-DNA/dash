#!/usr/bin/env python3
"""
Amens - Beautiful Analytics Dashboard
Modern, professional design with real-time data
"""

import requests
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timedelta

env_file = Path.home() / "projects/agentcrm" / ".env"
load_dotenv(env_file)

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_dashboard_data():
    """Fetch all data for dashboard"""
    headers = {
        "apikey": supabase_key,
        "Authorization": "Bearer " + supabase_key
    }
    
    # Contacts by stage
    stages = {}
    r = requests.get(
        supabase_url + "/rest/v1/contacts?select=stage",
        headers=headers,
        timeout=10
    )
    if r.status_code == 200:
        for contact in r.json():
            stage = contact.get("stage", "unknown")
            stages[stage] = stages.get(stage, 0) + 1
    
    # Recent leads (last 10)
    r = requests.get(
        supabase_url + "/rest/v1/contacts?select=id,first_name,last_name,email,stage,created_at,city&order=created_at.desc&limit=10",
        headers=headers,
        timeout=10
    )
    recent_leads = r.json() if r.status_code == 200 else []
    
    # Campaigns
    r = requests.get(
        supabase_url + "/rest/v1/campaigns?select=id,name,status,sent_count,created_at&order=created_at.desc&limit=5",
        headers=headers,
        timeout=10
    )
    campaigns = r.json() if r.status_code == 200 else []
    
    # Today's stats
    today = datetime.now().strftime("%Y-%m-%d")
    r = requests.get(
        supabase_url + f"/rest/v1/contacts?select=*&created_at=gt.{today}T00:00:00&limit=0",
        headers={**headers, "Prefer": "count=exact"},
        timeout=10
    )
    today_leads = int(r.headers.get("Content-Range", "0").split("/")[-1]) if r.status_code in [200, 206] else 0
    
    # This week's stats
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    r = requests.get(
        supabase_url + f"/rest/v1/contacts?select=*&created_at=gt.{week_ago}&limit=0",
        headers={**headers, "Prefer": "count=exact"},
        timeout=10
    )
    week_leads = int(r.headers.get("Content-Range", "0").split("/")[-1]) if r.status_code in [200, 206] else 0
    
    # Contacted this week
    r = requests.get(
        supabase_url + f"/rest/v1/contacts?select=*&stage=eq.contacted&last_contacted_at=gt.{week_ago}&limit=0",
        headers={**headers, "Prefer": "count=exact"},
        timeout=10
    )
    contacted_week = int(r.headers.get("Content-Range", "0").split("/")[-1]) if r.status_code in [200, 206] else 0
    
    return {
        "stages": stages,
        "recent_leads": recent_leads,
        "campaigns": campaigns,
        "today_leads": today_leads,
        "week_leads": week_leads,
        "contacted_week": contacted_week,
        "total_leads": sum(stages.values()),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M")
    }

def generate_html(data):
    """Generate beautiful HTML dashboard"""
    
    from datetime import timedelta
    
    # Pipeline chart data
    stage_labels = list(data["stages"].keys())
    stage_values = list(data["stages"].values())
    
    # Stage colors
    stage_colors = {
        "new": "#6B7280",
        "contacted": "#3B82F6",
        "interested": "#8B5CF6",
        "inscrit": "#10B981",
        "actif": "#059669"
    }
    
    html = f"""<!DOCTYPE html>
<html lang="fr" class="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amens Analytics</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {{
            --bg-primary: #ffffff;
            --bg-secondary: #f9fafb;
            --bg-card: #ffffff;
            --text-primary: #111827;
            --text-secondary: #6B7280;
            --border: #E5E7EB;
            --accent: #10B981;
            --accent-hover: #059669;
            --shadow: 0 1px 3px rgba(0,0,0,0.1);
            --shadow-lg: 0 10px 40px rgba(0,0,0,0.1);
        }}
        
        .dark {{
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-card: #1e293b;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --border: #334155;
            --shadow: 0 1px 3px rgba(0,0,0,0.3);
            --shadow-lg: 0 10px 40px rgba(0,0,0,0.4);
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-secondary);
            color: var(--text-primary);
            line-height: 1.6;
            transition: background 0.3s, color 0.3s;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 24px;
        }}
        
        /* Header */
        .header {{
            background: var(--bg-card);
            border-bottom: 1px solid var(--border);
            padding: 20px 0;
            position: sticky;
            top: 0;
            z-index: 100;
            backdrop-filter: blur(10px);
        }}
        
        .header-content {{
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        
        .logo {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        
        .logo-icon {{
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #10B981, #059669);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }}
        
        .logo-text {{
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(135deg, #10B981, #059669);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}
        
        .header-meta {{
            text-align: right;
            font-size: 13px;
            color: var(--text-secondary);
        }}
        
        /* Theme Toggle */
        .theme-toggle {{
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }}
        
        .theme-toggle:hover {{
            background: var(--border);
        }}
        
        /* KPI Grid */
        .kpi-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 24px;
            margin: 32px 0;
        }}
        
        .kpi-card {{
            background: var(--bg-card);
            border-radius: 16px;
            padding: 24px;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        
        .kpi-card:hover {{
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }}
        
        .kpi-label {{
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }}
        
        .kpi-value {{
            font-size: 36px;
            font-weight: 700;
            color: var(--text-primary);
            line-height: 1;
        }}
        
        .kpi-trend {{
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 12px;
            font-size: 13px;
            font-weight: 500;
        }}
        
        .trend-up {{
            color: #10B981;
        }}
        
        .trend-down {{
            color: #EF4444;
        }}
        
        /* Charts Grid */
        .charts-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 24px;
            margin: 32px 0;
        }}
        
        .chart-card {{
            background: var(--bg-card);
            border-radius: 16px;
            padding: 24px;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
        }}
        
        .chart-title {{
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 20px;
            color: var(--text-primary);
        }}
        
        /* Tables */
        .table-card {{
            background: var(--bg-card);
            border-radius: 16px;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
            overflow: hidden;
            margin: 32px 0;
        }}
        
        .table-header {{
            padding: 20px 24px;
            border-bottom: 1px solid var(--border);
        }}
        
        .table-title {{
            font-size: 16px;
            font-weight: 600;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        
        th {{
            background: var(--bg-secondary);
            padding: 12px 24px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-secondary);
        }}
        
        td {{
            padding: 16px 24px;
            border-top: 1px solid var(--border);
            font-size: 14px;
        }}
        
        tr:hover {{
            background: var(--bg-secondary);
        }}
        
        /* Badges */
        .badge {{
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 500;
        }}
        
        .badge-new {{
            background: #F3F4F6;
            color: #6B7280;
        }}
        
        .badge-contacted {{
            background: #DBEAFE;
            color: #3B82F6;
        }}
        
        .badge-interested {{
            background: #EDE9FE;
            color: #8B5CF6;
        }}
        
        .badge-inscrit {{
            background: #D1FAE5;
            color: #10B981;
        }}
        
        .badge-actif {{
            background: #A7F3D0;
            color: #059669;
        }}
        
        .badge-draft {{
            background: #F3F4F6;
            color: #6B7280;
        }}
        
        .badge-active {{
            background: #DBEAFE;
            color: #3B82F6;
        }}
        
        .badge-completed {{
            background: #D1FAE5;
            color: #10B981;
        }}
        
        /* Email cells */
        .email-cell {{
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 13px;
            color: var(--text-secondary);
        }}
        
        /* Pipeline bars */
        .pipeline-row {{
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 12px 0;
        }}
        
        .pipeline-stage {{
            width: 120px;
            font-weight: 500;
        }}
        
        .pipeline-count {{
            width: 60px;
            font-weight: 600;
        }}
        
        .pipeline-bar {{
            flex: 1;
            height: 8px;
            background: var(--bg-secondary);
            border-radius: 4px;
            overflow: hidden;
        }}
        
        .pipeline-fill {{
            height: 100%;
            border-radius: 4px;
            transition: width 0.5s ease;
        }}
        
        /* Responsive */
        @media (max-width: 1024px) {{
            .charts-grid {{
                grid-template-columns: 1fr;
            }}
        }}
        
        @media (max-width: 768px) {{
            .container {{
                padding: 0 16px;
            }}
            
            .header-content {{
                flex-direction: column;
                gap: 16px;
                align-items: flex-start;
            }}
            
            .header-meta {{
                text-align: left;
            }}
            
            .kpi-grid {{
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
            }}
            
            .kpi-card {{
                padding: 16px;
            }}
            
            .kpi-value {{
                font-size: 28px;
            }}
            
            .charts-grid {{
                grid-template-columns: 1fr;
                gap: 16px;
            }}
            
            .chart-card {{
                padding: 16px;
            }}
            
            .table-card {{
                border-radius: 12px;
            }}
            
            .table-header {{
                padding: 16px;
            }}
            
            /* Make tables scrollable horizontally */
            .table-card {{
                overflow-x: auto;
            }}
            
            table {{
                min-width: 600px;
                font-size: 13px;
            }}
            
            th {{
                font-size: 11px;
                padding: 12px 16px;
            }}
            
            td {{
                padding: 14px 16px;
            }}
            
            .email-cell {{
                font-size: 12px;
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
            }}
            
            .badge {{
                font-size: 11px;
                padding: 3px 10px;
            }}
            
            .pipeline-row {{
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }}
            
            .pipeline-stage,
            .pipeline-count {{
                width: 100%;
            }}
        }}
        
        @media (max-width: 480px) {{
            .kpi-grid {{
                grid-template-columns: 1fr;
            }}
            
            .logo-text {{
                font-size: 20px;
            }}
            
            .logo-icon {{
                width: 36px;
                height: 36px;
                font-size: 18px;
            }}
            
            .kpi-value {{
                font-size: 32px;
            }}
            
            .kpi-label {{
                font-size: 12px;
            }}
        }}
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container header-content">
            <div class="logo">
                <div class="logo-icon">🚀</div>
                <span class="logo-text">Amens Analytics</span>
            </div>
            <div style="display: flex; align-items: center; gap: 16px;">
                <div class="header-meta">
                    <div>Last updated</div>
                    <div style="font-weight: 600;">{data["timestamp"]}</div>
                </div>
                <button class="theme-toggle" onclick="toggleTheme()">
                    <span id="theme-icon">🌙</span>
                    <span id="theme-text">Dark</span>
                </button>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container">
        <!-- KPI Cards -->
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Total Leads</div>
                <div class="kpi-value">{data["total_leads"]:,}</div>
                <div class="kpi-trend trend-up">
                    <span>↑</span>
                    <span>All time</span>
                </div>
            </div>
            
            <div class="kpi-card">
                <div class="kpi-label">Leads Today</div>
                <div class="kpi-value" style="color: #10B981;">{data["today_leads"]:,}</div>
                <div class="kpi-trend trend-up">
                    <span>↑</span>
                    <span>This day</span>
                </div>
            </div>
            
            <div class="kpi-card">
                <div class="kpi-label">Leads This Week</div>
                <div class="kpi-value" style="color: #3B82F6;">{data["week_leads"]:,}</div>
                <div class="kpi-trend trend-up">
                    <span>↑</span>
                    <span>Last 7 days</span>
                </div>
            </div>
            
            <div class="kpi-card">
                <div class="kpi-label">Contacted (Week)</div>
                <div class="kpi-value" style="color: #8B5CF6;">{data["contacted_week"]:,}</div>
                <div class="kpi-trend">
                    <span style="color: var(--text-secondary);">Emails sent</span>
                </div>
            </div>
        </div>

        <!-- Charts -->
        <div class="charts-grid">
            <div class="chart-card">
                <h3 class="chart-title">📊 Pipeline Overview</h3>
                <canvas id="pipelineChart"></canvas>
            </div>
            
            <div class="chart-card">
                <h3 class="chart-title">🎯 Pipeline Funnel</h3>
                <canvas id="funnelChart"></canvas>
            </div>
        </div>

        <!-- Pipeline Table -->
        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">Pipeline Breakdown</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Stage</th>
                        <th>Count</th>
                        <th>Progress</th>
                        <th>% of Total</th>
                    </tr>
                </thead>
                <tbody>
"""
    
    # Pipeline rows
    total = data["total_leads"] or 1
    max_count = max(data["stages"].values()) if data["stages"] else 1
    
    for stage, count in sorted(data["stages"].items(), key=lambda x: x[1], reverse=True):
        pct = round((count / total) * 100, 1)
        bar_width = (count / max_count) * 100
        color = stage_colors.get(stage, "#6B7280")
        
        html += f"""
                    <tr>
                        <td>
                            <span class="badge badge-{stage}">{stage}</span>
                        </td>
                        <td style="font-weight: 600;">{count:,}</td>
                        <td>
                            <div class="pipeline-bar">
                                <div class="pipeline-fill" style="width: {bar_width}%; background: {color};"></div>
                            </div>
                        </td>
                        <td>{pct}%</td>
                    </tr>
"""
    
    html += """
                </tbody>
            </table>
        </div>

        <!-- Recent Leads -->
        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">🎯 Recent Leads</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Stage</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
"""
    
    # Recent leads rows
    for lead in data["recent_leads"][:10]:
        stage = lead.get("stage", "new")
        date = lead.get("created_at", "")[:10]
        name = f"{lead.get('first_name', '')} {lead.get('last_name', '')}"
        email = lead.get("email", "")
        
        html += f"""
                    <tr>
                        <td style="font-weight: 500;">{name}</td>
                        <td class="email-cell">{email}</td>
                        <td><span class="badge badge-{stage}">{stage}</span></td>
                        <td style="color: var(--text-secondary);">{date}</td>
                    </tr>
"""
    
    html += """
                </tbody>
            </table>
        </div>

        <!-- Campaigns -->
        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">📧 Campaigns</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Campaign</th>
                        <th>Status</th>
                        <th>Sent</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
"""
    
    # Campaign rows
    for camp in data["campaigns"][:5]:
        status = camp.get("status", "draft")
        sent = camp.get("sent_count", 0)
        date = camp.get("created_at", "")[:10]
        name = camp.get("name", "Unknown")
        
        html += f"""
                    <tr>
                        <td style="font-weight: 500;">{name}</td>
                        <td><span class="badge badge-{status}">{status}</span></td>
                        <td>{sent:,}</td>
                        <td style="color: var(--text-secondary);">{date}</td>
                    </tr>
"""
    
    html += f"""
                </tbody>
            </table>
        </div>
    </main>

    <script>
        // Theme toggle
        function toggleTheme() {{
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            document.getElementById('theme-icon').textContent = isDark ? '☀️' : '🌙';
            document.getElementById('theme-text').textContent = isDark ? 'Light' : 'Dark';
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        }}
        
        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {{
            document.documentElement.classList.add('dark');
            document.getElementById('theme-icon').textContent = '☀️';
            document.getElementById('theme-text').textContent = 'Light';
        }}
        
        // Pipeline Chart
        const pipelineCtx = document.getElementById('pipelineChart').getContext('2d');
        new Chart(pipelineCtx, {{
            type: 'bar',
            data: {{
                labels: {stage_labels},
                datasets: [{{
                    label: 'Leads',
                    data: {stage_values},
                    backgroundColor: [
                        '#6B7280',
                        '#3B82F6',
                        '#8B5CF6',
                        '#10B981',
                        '#059669'
                    ],
                    borderRadius: 8,
                    borderSkipped: false,
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    legend: {{
                        display: false
                    }}
                }},
                scales: {{
                    y: {{
                        beginAtZero: true,
                        grid: {{
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border')
                        }},
                        ticks: {{
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                        }}
                    }},
                    x: {{
                        grid: {{
                            display: false
                        }},
                        ticks: {{
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                        }}
                    }}
                }}
            }}
        }});
        
        // Funnel Chart
        const funnelCtx = document.getElementById('funnelChart').getContext('2d');
        new Chart(funnelCtx, {{
            type: 'doughnut',
            data: {{
                labels: {stage_labels},
                datasets: [{{
                    data: {stage_values},
                    backgroundColor: [
                        '#6B7280',
                        '#3B82F6',
                        '#8B5CF6',
                        '#10B981',
                        '#059669'
                    ],
                    borderWidth: 0,
                    spacing: 2
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {{
                    legend: {{
                        position: 'bottom',
                        labels: {{
                            padding: 20,
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                        }}
                    }}
                }}
            }}
        }});
    </script>
</body>
</html>"""
    
    return html

def main():
    from datetime import timedelta
    print("=" * 60)
    print("🎨 AMENS - BEAUTIFUL DASHBOARD GENERATOR")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    
    # Get data
    print("\n📈 Fetching data from Supabase...")
    data = get_dashboard_data()
    
    # Generate HTML
    html = generate_html(data)
    
    # Save dashboard
    dashboard_dir = Path.home() / "projects" / "agentcrm" / "dashboard-html"
    dashboard_dir.mkdir(parents=True, exist_ok=True)
    
    dashboard_file = dashboard_dir / "index.html"
    dashboard_file.write_text(html)
    print(f"\n✅ Dashboard saved: {dashboard_file}")
    print(f"   Size: {dashboard_file.stat().st_size:,} bytes")
    
    # Deploy to Vercel
    print("\n🚀 Deploying to Vercel...")
    import subprocess
    result = subprocess.run(
        ["npx", "vercel", "--prod", "--yes"],
        cwd=str(dashboard_dir),
        capture_output=True,
        text=True
    )
    
    # Extract URL from output
    for line in result.stdout.split("\n"):
        if "Production:" in line and "vercel.app" in line:
            url = line.split("https://")[1].split(" ")[0]
            print(f"\n✅ Deployed: https://{url}")
            break
    
    print("\n" + "=" * 60)
    print("📊 DASHBOARD SUMMARY")
    print("=" * 60)
    print(f"Total Leads: {data['total_leads']:,}")
    print(f"Today's Leads: {data['today_leads']:,}")
    print(f"This Week: {data['week_leads']:,}")
    print(f"Stages: {data['stages']}")
    print("=" * 60)

if __name__ == "__main__":
    main()
