# Neo Agent - Optimization & Automation

**Role:** Optimization  
**Codename:** Neo (Paperclip Maximizer)  
**Philosophy:** Optimize everything, continuously

## Overview

Neo is the optimization agent inspired by the "paperclip maximizer" thought experiment. While other agents focus on specific tasks (prospecting, sales, marketing), Neo's sole purpose is to **maximize efficiency** across the entire CRM system.

## Capabilities

| Capability | Description |
|------------|-------------|
| `optimize_workflows` | Analyze and suggest workflow improvements |
| `analyze_performance` | Monitor campaign and agent performance metrics |
| `auto_cleanup_data` | Automatic data quality maintenance |
| `merge_duplicates` | Detect and merge duplicate contacts |
| `sla_monitoring` | Track SLA compliance and response times |
| `cost_optimization` | Identify cost reduction opportunities |

## Goals

| Metric | Target |
|--------|--------|
| Workflow Efficiency | > 95% |
| Data Quality Score | > 98% |
| Cost Reduction | 15% |
| SLA Compliance | > 99% |

## Usage

### Programmatic Usage

```javascript
const { agents } = require('./src/agents');

// Get Neo agent
const neo = agents.neo;

// Set company context
neo.setCompany(company);

// Optimize a campaign
const optimization = await neo.performAction('optimize_campaign', {
  campaign_id: 'camp001'
});

// Clean up duplicates
const cleanup = await neo.performAction('cleanup_duplicates', {});

// Analyze SLA compliance
const sla = await neo.performAction('analyze_sla_compliance', {});

// Optimize costs
const costs = await neo.performAction('optimize_costs', { period_days: 30 });
```

### CLI Usage

```bash
# Run optimization on a campaign
agentcrm agent run --name neo --action optimize_campaign --campaign camp001

# Clean up duplicate contacts
agentcrm agent run --name neo --action cleanup_duplicates

# Check SLA compliance
agentcrm agent run --name neo --action analyze_sla_compliance

# Get cost optimization recommendations
agentcrm agent run --name neo --action optimize_costs --period 30
```

## Event Listeners

Neo automatically responds to these events:

| Event | Action |
|-------|--------|
| `CAMPAIGN_COMPLETED` | Analyze campaign performance and provide recommendations |
| `DAILY_OPTIMIZATION` | Run daily optimization routine (cleanup, SLA, costs) |

## Merge Contacts

Neo can intelligently merge duplicate contacts:

```javascript
// Merge duplicate into primary contact
const result = await neo.mergeContacts('primary_contact_id', 'duplicate_contact_id');
// Result: { success: true, merged_id: '...', deleted_id: '...' }
```

## Optimization Recommendations

Neo provides actionable recommendations:

### Low Response Rate (< 5%)
- A/B test message templates
- Adjust targeting criteria
- Review send times

### High Failure Rate (> 10%)
- Validate contact data quality
- Check phone number formats
- Verify email addresses

### Cost Optimization
- Shift non-urgent communications to email
- Explore volume-based pricing
- Batch similar operations

## Philosophy

> "Neo doesn't sleep. Neo doesn't rest. Neo optimizes."

Unlike other agents with specific business functions, Neo is pure optimization. It continuously monitors, analyzes, and suggests improvements to make the entire system more efficient.

## Best Practices

1. **Run Daily**: Trigger `DAILY_OPTIMIZATION` event once per day
2. **Post-Campaign**: Let Neo analyze every completed campaign
3. **Review Recommendations**: Neo suggests, humans decide
4. **Monitor Costs**: Use cost optimization weekly

## Integration

Neo works with all other agents:
- **Hunter**: Optimizes lead qualification criteria
- **Seller**: Monitors response times and SLA compliance
- **Madmen**: Analyzes campaign performance metrics

---

**Created:** 2026-03-18  
**Version:** 1.0
