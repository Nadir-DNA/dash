const BaseAgent = require('../base-agent');
const logger = require('../../core/logger');
const { eventBus, Events } = require('../../core/event-bus');

class NeoAgent extends BaseAgent {
  constructor() {
    super({
      id: 'neo',
      name: 'Neo Agent',
      role: 'optimization',
      capabilities: [
        'optimize_workflows',
        'analyze_performance',
        'auto_cleanup_data',
        'merge_duplicates',
        'sla_monitoring',
        'cost_optimization',
      ],
      goals: {
        workflow_efficiency: 0.95,
        data_quality_score: 0.98,
        cost_reduction_percent: 0.15,
        sla_compliance: 0.99,
      },
    });
    this.company = null;
  }

  setCompany(company) {
    this.company = company;
  }

  async performAction(action, data) {
    await super.performAction(action, data);

    switch (action) {
      case 'optimize_campaign':
        return this._optimizeCampaign(data);
      case 'cleanup_duplicates':
        return this._cleanupDuplicates(data);
      case 'analyze_sla_compliance':
        return this._analyzeSlaCompliance(data);
      case 'optimize_costs':
        return this._optimizeCosts(data);
      default:
        logger.debug(`NeoAgent: No handler for action "${action}"`);
        return { success: false, error: 'unknown_action' };
    }
  }

  async _optimizeCampaign({ campaign_id }) {
    if (!this.company) {
      logger.error('NeoAgent: No company context');
      return { success: false, error: 'no_company' };
    }

    logger.info(`NeoAgent: Optimizing campaign ${campaign_id}`);

    const campaign = await this.company.campaigns.getById(campaign_id);
    if (!campaign) {
      return { success: false, error: 'campaign_not_found' };
    }

    const stats = campaign.stats || {};
    const sent = stats.sent || 0;
    const replied = stats.replied || 0;
    const failed = stats.failed || 0;

    const responseRate = sent > 0 ? replied / sent : 0;
    const failureRate = sent > 0 ? failed / sent : 0;

    const recommendations = [];

    if (responseRate < 0.05) {
      recommendations.push({
        type: 'low_response_rate',
        suggestion: 'Consider A/B testing message templates or adjusting targeting criteria',
        priority: 'high',
      });
    }

    if (failureRate > 0.10) {
      recommendations.push({
        type: 'high_failure_rate',
        suggestion: 'Review contact data quality - validate phone numbers and emails',
        priority: 'high',
      });
    }

    if (sent > 100 && responseRate > 0.15) {
      recommendations.push({
        type: 'high_performer',
        suggestion: 'Scale this campaign - consider increasing batch size',
        priority: 'medium',
      });
    }

    return {
      success: true,
      campaign_id,
      metrics: { responseRate, failureRate },
      recommendations,
    };
  }

  async _cleanupDuplicates({ contact_ids }) {
    if (!this.company) {
      logger.error('NeoAgent: No company context');
      return { success: false, error: 'no_company' };
    }

    logger.info('NeoAgent: Cleaning up duplicate contacts');

    const contacts = contact_ids
      ? await Promise.all(contact_ids.map(id => this.company.contacts.getById(id)))
      : await this.company.contacts.list();

    const duplicates = [];
    const seen = new Map();

    for (const contact of contacts.filter(Boolean)) {
      const email = contact.basic?.email?.toLowerCase();
      const phone = contact.basic?.phone;

      if (email) {
        if (seen.has(email)) {
          duplicates.push({
            primary_id: seen.get(email),
            duplicate_id: contact.id,
            field: 'email',
            value: email,
          });
        } else {
          seen.set(email, contact.id);
        }
      }

      if (phone) {
        const normalizedPhone = phone.replace(/\D/g, '');
        if (seen.has(normalizedPhone)) {
          duplicates.push({
            primary_id: seen.get(normalizedPhone),
            duplicate_id: contact.id,
            field: 'phone',
            value: phone,
          });
        } else {
          seen.set(normalizedPhone, contact.id);
        }
      }
    }

    return {
      success: true,
      duplicates_found: duplicates.length,
      duplicates,
    };
  }

  async _analyzeSlaCompliance({ campaign_id }) {
    if (!this.company) {
      logger.error('NeoAgent: No company context');
      return { success: false, error: 'no_company' };
    }

    logger.info('NeoAgent: Analyzing SLA compliance');

    const interactions = await this.company.interactions.list();
    const now = new Date();

    const slaMetrics = {
      total_interactions: interactions.length,
      within_sla: 0,
      breached_sla: 0,
      avg_response_time_minutes: 0,
    };

    const responseTimes = [];

    for (const interaction of interactions) {
      if (interaction.type === 'sms_reply' || interaction.type === 'email_reply') {
        const originalInteraction = await this.company.interactions.getById(interaction.in_reply_to);
        if (originalInteraction) {
          const originalTime = new Date(originalInteraction.created_at);
          const replyTime = new Date(interaction.created_at);
          const diffMinutes = (replyTime - originalTime) / (1000 * 60);
          responseTimes.push(diffMinutes);

          if (diffMinutes <= 30) {
            slaMetrics.within_sla++;
          } else {
            slaMetrics.breached_sla++;
          }
        }
      }
    }

    slaMetrics.avg_response_time_minutes =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

    const complianceRate =
      slaMetrics.total_interactions > 0
        ? slaMetrics.within_sla / slaMetrics.total_interactions
        : 1;

    return {
      success: true,
      sla_compliance_rate: complianceRate,
      metrics: slaMetrics,
      status: complianceRate >= 0.99 ? 'compliant' : 'non_compliant',
    };
  }

  async _optimizeCosts({ period_days = 30 }) {
    if (!this.company) {
      logger.error('NeoAgent: No company context');
      return { success: false, error: 'no_company' };
    }

    logger.info('NeoAgent: Analyzing cost optimization opportunities');

    const interactions = await this.company.interactions.list();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period_days);

    let smsCost = 0;
    let emailCost = 0;
    let totalSms = 0;
    let totalEmails = 0;

    for (const interaction of interactions) {
      const interactionDate = new Date(interaction.created_at);
      if (interactionDate < cutoffDate) continue;

      if (interaction.channel === 'brevo_sms' || interaction.type === 'sms_sent') {
        totalSms++;
        smsCost += interaction.metadata?.cost || 0.05;
      } else if (interaction.channel === 'brevo_email' || interaction.channel === 'resend' || interaction.type === 'email_sent') {
        totalEmails++;
        emailCost += interaction.metadata?.cost || 0.001;
      }
    }

    const totalCost = smsCost + emailCost;
    const recommendations = [];

    if (totalSms > 100 && smsCost > emailCost * 10) {
      recommendations.push({
        type: 'channel_shift',
        suggestion: 'Consider using email for non-urgent communications to reduce costs',
        potential_savings: smsCost * 0.3,
      });
    }

    if (totalEmails > 500) {
      recommendations.push({
        type: 'bulk_discount',
        suggestion: 'Explore volume-based pricing tiers for email provider',
        potential_savings: emailCost * 0.15,
      });
    }

    return {
      success: true,
      period_days,
      costs: {
        sms: smsCost,
        email: emailCost,
        total: totalCost,
      },
      volumes: {
        sms: totalSms,
        emails: totalEmails,
      },
      recommendations,
    };
  }

  _setupEventListeners() {
    this._onCampaignCompleted = (campaign) => this.onCampaignCompleted(campaign);
    this._onDailyOptimization = () => this.onDailyOptimization();
    eventBus.subscribe(Events.CAMPAIGN_COMPLETED, this._onCampaignCompleted);
    eventBus.subscribe(Events.DAILY_OPTIMIZATION, this._onDailyOptimization);
  }

  _removeEventListeners() {
    if (this._onCampaignCompleted) {
      eventBus.removeListener(Events.CAMPAIGN_COMPLETED, this._onCampaignCompleted);
    }
    if (this._onDailyOptimization) {
      eventBus.removeListener(Events.DAILY_OPTIMIZATION, this._onDailyOptimization);
    }
  }

  async onCampaignCompleted(campaign) {
    logger.info(`NeoAgent: Campaign ${campaign.id} completed - starting optimization analysis`);
    await this._optimizeCampaign({ campaign_id: campaign.id });
  }

  async onDailyOptimization() {
    logger.info('NeoAgent: Running daily optimization routine');

    if (this.company) {
      await this._cleanupDuplicates({});
      await this._analyzeSlaCompliance({});
      await this._optimizeCosts({ period_days: 1 });
    }
  }

  async mergeContacts(primaryId, duplicateId) {
    if (!this.company) {
      return { success: false, error: 'no_company' };
    }

    logger.info(`NeoAgent: Merging contact ${duplicateId} into ${primaryId}`);

    const primary = await this.company.contacts.getById(primaryId);
    const duplicate = await this.company.contacts.getById(duplicateId);

    if (!primary || !duplicate) {
      return { success: false, error: 'contact_not_found' };
    }

    const mergedData = { ...primary };

    for (const [key, value] of Object.entries(duplicate.basic || {})) {
      if (value && !mergedData.basic[key]) {
        mergedData.basic[key] = value;
      }
    }

    for (const [key, value] of Object.entries(duplicate.dynamic_fields || {})) {
      if (value && !mergedData.dynamic_fields?.[key]) {
        mergedData.dynamic_fields = mergedData.dynamic_fields || {};
        mergedData.dynamic_fields[key] = value;
      }
    }

    mergedData.notes = [primary.notes, duplicate.notes, `Merged from ${duplicateId}`].filter(Boolean).join('\n');

    await this.company.contacts.update(primaryId, mergedData);
    await this.company.contacts.delete(duplicateId);

    return { success: true, merged_id: primaryId, deleted_id: duplicateId };
  }
}

module.exports = NeoAgent;
