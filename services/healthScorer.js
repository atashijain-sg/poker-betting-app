class HealthScorer {
  constructor(customRubric = null) {
    // Default health scoring rubric - can be overridden
    this.rubric = customRubric || {
      sentiment: {
        weight: 0.3,
        thresholds: {
          healthy: 0.2,
          concerning: -0.2
        }
      },
      activity: {
        weight: 0.25,
        thresholds: {
          healthy: 'medium', // high, medium, low, very low
          concerning: 'very low'
        }
      },
      taskCompletion: {
        weight: 0.2,
        thresholds: {
          healthy: 80,
          concerning: 50
        }
      },
      engagement: {
        weight: 0.15,
        thresholds: {
          healthy: 'high',
          concerning: 'low'
        }
      },
      recentActivity: {
        weight: 0.1,
        thresholds: {
          healthy: true,
          concerning: false
        }
      }
    };
  }

  scoreAccount(processedActivity) {
    const { summary } = processedActivity;
    const scores = {};
    let totalScore = 0;
    let totalWeight = 0;

    // Score sentiment
    if (this.rubric.sentiment) {
      scores.sentiment = this.scoreSentiment(summary.overall.sentiment);
      totalScore += scores.sentiment * this.rubric.sentiment.weight;
      totalWeight += this.rubric.sentiment.weight;
    }

    // Score activity level
    if (this.rubric.activity) {
      scores.activity = this.scoreActivityLevel(summary.overall.activityLevel);
      totalScore += scores.activity * this.rubric.activity.weight;
      totalWeight += this.rubric.activity.weight;
    }

    // Score task completion
    if (this.rubric.taskCompletion && summary.tasks.count > 0) {
      scores.taskCompletion = this.scoreTaskCompletion(summary.tasks.completionRate);
      totalScore += scores.taskCompletion * this.rubric.taskCompletion.weight;
      totalWeight += this.rubric.taskCompletion.weight;
    }

    // Score engagement
    if (this.rubric.engagement) {
      scores.engagement = this.scoreEngagement(summary.conversations.engagement);
      totalScore += scores.engagement * this.rubric.engagement.weight;
      totalWeight += this.rubric.engagement.weight;
    }

    // Score recent activity
    if (this.rubric.recentActivity) {
      const hasRecentActivity = summary.notes.recentActivity || summary.conversations.recentActivity;
      scores.recentActivity = this.scoreRecentActivity(hasRecentActivity);
      totalScore += scores.recentActivity * this.rubric.recentActivity.weight;
      totalWeight += this.rubric.recentActivity.weight;
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const healthRating = this.determineHealthRating(finalScore, scores);

    return {
      accountId: processedActivity.account.id,
      accountName: processedActivity.account.name,
      healthScore: Math.round(finalScore * 100) / 100,
      healthRating,
      detailedScores: scores,
      recommendations: this.generateRecommendations(scores, summary),
      lastUpdated: new Date().toISOString()
    };
  }

  scoreSentiment(sentimentData) {
    const score = sentimentData.score;
    if (score >= this.rubric.sentiment.thresholds.healthy) return 1;
    if (score <= this.rubric.sentiment.thresholds.concerning) return -1;
    return 0;
  }

  scoreActivityLevel(activityLevel) {
    const levels = ['very low', 'low', 'medium', 'high'];
    const currentIndex = levels.indexOf(activityLevel);
    const healthyIndex = levels.indexOf(this.rubric.activity.thresholds.healthy);
    const concerningIndex = levels.indexOf(this.rubric.activity.thresholds.concerning);

    if (currentIndex >= healthyIndex) return 1;
    if (currentIndex <= concerningIndex) return -1;
    return 0;
  }

  scoreTaskCompletion(completionRate) {
    if (completionRate >= this.rubric.taskCompletion.thresholds.healthy) return 1;
    if (completionRate <= this.rubric.taskCompletion.thresholds.concerning) return -1;
    return 0;
  }

  scoreEngagement(engagement) {
    if (engagement === this.rubric.engagement.thresholds.healthy) return 1;
    if (engagement === this.rubric.engagement.thresholds.concerning) return -1;
    return 0;
  }

  scoreRecentActivity(hasRecentActivity) {
    if (hasRecentActivity === this.rubric.recentActivity.thresholds.healthy) return 1;
    if (hasRecentActivity === this.rubric.recentActivity.thresholds.concerning) return -1;
    return 0;
  }

  determineHealthRating(finalScore, detailedScores) {
    // Check for any critical red flags
    const criticalIssues = Object.values(detailedScores).filter(score => score === -1).length;
    
    if (criticalIssues >= 3 || finalScore <= -0.5) {
      return 'poor';
    }
    
    if (criticalIssues >= 1 || finalScore <= -0.2) {
      return 'concerning';
    }
    
    return 'healthy';
  }

  generateRecommendations(scores, summary) {
    const recommendations = [];

    if (scores.sentiment === -1) {
      recommendations.push({
        priority: 'high',
        category: 'sentiment',
        message: 'Customer sentiment is negative. Schedule a check-in call to address concerns.',
        action: 'Schedule customer meeting'
      });
    }

    if (scores.activity === -1) {
      recommendations.push({
        priority: 'medium',
        category: 'engagement',
        message: 'Low activity levels detected. Consider reaching out to increase engagement.',
        action: 'Increase touchpoints'
      });
    }

    if (scores.taskCompletion === -1) {
      recommendations.push({
        priority: 'high',
        category: 'execution',
        message: `Task completion rate is ${summary.tasks.completionRate}%. Help customer with task management.`,
        action: 'Provide task management support'
      });
    }

    if (scores.engagement === -1) {
      recommendations.push({
        priority: 'medium',
        category: 'engagement',
        message: 'Low engagement in conversations. Consider more proactive outreach.',
        action: 'Increase proactive communication'
      });
    }

    if (scores.recentActivity === -1) {
      recommendations.push({
        priority: 'high',
        category: 'communication',
        message: 'No recent activity detected. Immediate outreach recommended.',
        action: 'Immediate customer contact'
      });
    }

    if (summary.tasks.overdue > 0) {
      recommendations.push({
        priority: 'high',
        category: 'execution',
        message: `${summary.tasks.overdue} overdue tasks. Help prioritize and complete.`,
        action: 'Address overdue tasks'
      });
    }

    // Positive recommendations
    if (scores.sentiment === 1 && scores.engagement === 1) {
      recommendations.push({
        priority: 'low',
        category: 'expansion',
        message: 'Customer is highly engaged and satisfied. Consider expansion opportunities.',
        action: 'Explore upsell opportunities'
      });
    }

    return recommendations;
  }

  updateRubric(newRubric) {
    this.rubric = { ...this.rubric, ...newRubric };
  }

  getRubric() {
    return this.rubric;
  }
}

module.exports = HealthScorer;
