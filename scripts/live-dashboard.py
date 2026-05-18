#!/usr/bin/env python3
"""
Amens - Live Dashboard Generator
Creates static HTML dashboard with real-time data
"""

import requests
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime

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
        supabase_url + "/rest/v1/contacts?select=id,first_name,last_name,email,stage,created_at&order=created_at.desc&limit=10",
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
    
    return {
        "stages": stages,
        "recent_leads": recent_leads,
        "campaigns": campaigns,
        "today_leads": today_leads,
        "total_leads": sum(stages.values()),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M")
    }

def generate_html(data):
    """Generate HTML dashboard"""
    
    # Pipeline chart data
    pipeline_rows = ""
    colors = {
        "new": "#6B7280",
        "contacted": "#3B82F6",
        "interested": "#8B5CF6",
        "inscrit": "#10B981",
        "actif": "#059669"
    }
    
    for stage, count in sorted(data["stages"].items(), key=lambda x: x[1], reverse=True):
        color = colors.get(stage, "#6B7280")
        pipeline_rows += f"""
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stage}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{count}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-{color} h-2.5 rounded-full" style="width: {min(count/10, 100)}%"></div>
                </div>
            </td>
        </tr>"""
    
    # Recent leads rows
    leads_rows = ""
    for lead in data["recent_leads"][:10]:
        leads_rows += f"""
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead['first_name']} {lead['last_name']}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead['email']}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{lead['stage']}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead['created_at'][:10]}</td>
        </tr>"""
    
    # Campaign rows
    campaign_rows = ""
    for camp in data["campaigns"][:5]:
        status_color = "green" if camp["status"] == "completed" else "blue" if camp["status"] == "active" else "gray"
        campaign_rows += f"""
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{camp['name']}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-{status_color}-100 text-{status_color}-800">{camp['status']}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{camp.get('sent_count', 0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{camp['created_at'][:10]}</td>
        </tr>"""
    
    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amens Analytics Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen">
        <!-- Header -->
        <nav class="bg-white shadow">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-gray-900">🚀 Amens Analytics</h1>
                    </div>
                    <div class="flex items-center text-sm text-gray-500">
                        Last updated: {data["timestamp"]}
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- KPI Cards -->
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div class="bg-white overflow-hidden shadow rounded-lg">
                    <div class="px-4 py-5 sm:p-6">
                        <dt class="text-sm font-medium text-gray-500 truncate">Total Leads</dt>
                        <dd class="mt-1 text-3xl font-semibold text-gray-900">{data["total_leads"]}</dd>
                    </div>
                </div>
                
                <div class="bg-white overflow-hidden shadow rounded-lg">
                    <div class="px-4 py-5 sm:p-6">
                        <dt class="text-sm font-medium text-gray-500 truncate">Leads Today</dt>
                        <dd class="mt-1 text-3xl font-semibold text-green-600">{data["today_leads"]}</dd>
                    </div>
                </div>
                
                <div class="bg-white overflow-hidden shadow rounded-lg">
                    <div class="px-4 py-5 sm:p-6">
                        <dt class="text-sm font-medium text-gray-500 truncate">Interested</dt>
                        <dd class="mt-1 text-3xl font-semibold text-purple-600">{data["stages"].get("interested", 0)}</dd>
                    </div>
                </div>
                
                <div class="bg-white overflow-hidden shadow rounded-lg">
                    <div class="px-4 py-5 sm:p-6">
                        <dt class="text-sm font-medium text-gray-500 truncate">Inscrits</dt>
                        <dd class="mt-1 text-3xl font-semibold text-green-600">{data["stages"].get("inscrit", 0)}</dd>
                    </div>
                </div>
            </div>

            <!-- Pipeline & Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Pipeline Table -->
                <div class="bg-white shadow rounded-lg">
                    <div class="px-4 py-5 sm:p-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">📊 Pipeline</h3>
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    {pipeline_rows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Pipeline Chart -->
                <div class="bg-white shadow rounded-lg">
                    <div class="px-4 py-5 sm:p-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">📈 Pipeline Visualization</h3>
                        <canvas id="pipelineChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Recent Leads -->
            <div class="bg-white shadow rounded-lg mb-8">
                <div class="px-4 py-5 sm:p-6">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">🎯 Recent Leads</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                {leads_rows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Campaigns -->
            <div class="bg-white shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">📧 Campaigns</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                {campaign_rows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script>
        const ctx = document.getElementById('pipelineChart').getContext('2d');
        new Chart(ctx, {{
            type: 'bar',
            data: {{
                labels: {list(data["stages"].keys())},
                datasets: [{{
                    label: 'Leads by Stage',
                    data: {list(data["stages"].values())},
                    backgroundColor: [
                        '#6B7280', '#3B82F6', '#8B5CF6', '#10B981', '#059669'
                    ]
                }}]
            }},
            options: {{
                responsive: true,
                plugins: {{
                    legend: {{
                        display: false
                    }}
                }},
                scales: {{
                    y: {{
                        beginAtZero: true
                    }}
                }}
            }}
        }});
    </script>
</body>
</html>"""
    
    return html

def main():
    print("=" * 60)
    print("📊 AMENS - LIVE DASHBOARD GENERATOR")
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
    
    # Also save to reports
    reports_dir = Path.home() / "projects" / "agentcrm" / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    
    report_file = reports_dir / f"dashboard-{datetime.now().strftime('%Y-%m-%d')}.html"
    report_file.write_text(html)
    print(f"✅ Report saved: {report_file}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 DASHBOARD SUMMARY")
    print("=" * 60)
    print(f"Total Leads: {data['total_leads']}")
    print(f"Today's Leads: {data['today_leads']}")
    print(f"Stages: {data['stages']}")
    
    print("\n🌐 Open dashboard in browser:")
    print(f"   file://{dashboard_file}")
    print("=" * 60)

if __name__ == "__main__":
    main()
