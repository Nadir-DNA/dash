#!/usr/bin/env python3
"""
Daily metrics collector for Hermes cron
This script is called by Hermes Agent cronjob system
"""

import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from collect_metrics import collect_project_metrics, get_supabase_client, push_metrics, PROJECTS

def main():
    """Collect metrics for all projects and push to Supabase"""
    
    print(f"=== Dash Metrics Collection - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    
    # Get Supabase credentials from environment
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required")
        return "❌ Missing credentials"
    
    client = get_supabase_client()
    results = []
    
    for project_id, config in PROJECTS.items():
        try:
            metrics = collect_project_metrics(project_id)
            success = push_metrics(client, project_id, metrics)
            status = "✓" if success else "✗"
            results.append(f"{status} {config['name']} ({project_id})")
        except Exception as e:
            results.append(f"✗ {config['name']} ({project_id}): {str(e)}")
    
    # Summary
    summary = "\n".join(results)
    print(f"\nResults:\n{summary}")
    
    # Return for Hermes cron output
    return f"Metrics collected for {len(PROJECTS)} projects:\n{summary}"


if __name__ == "__main__":
    output = main()
    print(output)