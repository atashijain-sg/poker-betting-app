class DataProcessor {
  constructor() {
    this.sentimentKeywords = {
      positive: [
        'happy', 'satisfied', 'excellent', 'great', 'awesome', 'fantastic', 'love',
        'perfect', 'amazing', 'outstanding', 'successful', 'pleased', 'thrilled',
        'impressed', 'wonderful', 'brilliant', 'superb', 'delighted', 'excited'
      ],
      negative: [
        'unhappy', 'frustrated', 'angry', 'disappointed', 'terrible', 'awful',
        'hate', 'horrible', 'disgusted', 'annoyed', 'upset', 'dissatisfied',
        'concerned', 'worried', 'problem', 'issue', 'bug', 'error', 'fail',
        'broken', 'slow', 'confusing', 'difficult', 'complicated'
      ],
      neutral: [
        'okay', 'fine', 'good', 'normal', 'standard', 'average', 'regular',
        'typical', 'usual', 'expected', 'acceptable', 'adequate'
      ]
    };
  }

  analyzeTextSentiment(text) {
    if (!text || typeof text !== 'string') return { score: 0, confidence: 0 };
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    words.forEach(word => {
      if (this.sentimentKeywords.positive.some(keyword => word.includes(keyword))) {
        positiveCount++;
      } else if (this.sentimentKeywords.negative.some(keyword => word.includes(keyword))) {
        negativeCount++;
      } else if (this.sentimentKeywords.neutral.some(keyword => word.includes(keyword))) {
        neutralCount++;
      }
    });

    const totalSentimentWords = positiveCount + negativeCount + neutralCount;
    const confidence = Math.min(totalSentimentWords / words.length, 1);

    if (totalSentimentWords === 0) return { score: 0, confidence: 0 };

    // Score from -1 (very negative) to 1 (very positive)
    const score = (positiveCount - negativeCount) / totalSentimentWords;
    
    return { score, confidence };
  }

  summarizeNotes(notes) {
    if (!notes || notes.length === 0) {
      return {
        count: 0,
        recentActivity: false,
        sentimentAnalysis: { averageScore: 0, confidence: 0 },
        themes: [],
        summary: 'No notes available for this period.'
      };
    }

    let totalSentiment = 0;
    let totalConfidence = 0;
    const allText = notes.map(note => note.description || note.content || '').join(' ');
    
    notes.forEach(note => {
      const text = note.description || note.content || '';
      const sentiment = this.analyzeTextSentiment(text);
      totalSentiment += sentiment.score * sentiment.confidence;
      totalConfidence += sentiment.confidence;
    });

    const averageScore = totalConfidence > 0 ? totalSentiment / totalConfidence : 0;
    const recentActivity = notes.some(note => {
      const noteDate = new Date(note.createdAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return noteDate >= weekAgo;
    });

    return {
      count: notes.length,
      recentActivity,
      sentimentAnalysis: {
        averageScore: Math.round(averageScore * 100) / 100,
        confidence: Math.round((totalConfidence / notes.length) * 100) / 100
      },
      themes: this.extractThemes(allText),
      summary: this.generateNoteSummary(notes, averageScore)
    };
  }

  summarizeTasks(tasks) {
    if (!tasks || tasks.length === 0) {
      return {
        count: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        completionRate: 0,
        summary: 'No tasks available for this period.'
      };
    }

    const now = new Date();
    let completed = 0;
    let pending = 0;
    let overdue = 0;

    tasks.forEach(task => {
      if (task.completed || task.status === 'completed') {
        completed++;
      } else {
        const dueDate = task.dueAt ? new Date(task.dueAt) : null;
        if (dueDate && dueDate < now) {
          overdue++;
        } else {
          pending++;
        }
      }
    });

    const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    return {
      count: tasks.length,
      completed,
      pending,
      overdue,
      completionRate,
      summary: this.generateTaskSummary(tasks, completionRate, overdue)
    };
  }

  summarizeConversations(conversations) {
    if (!conversations || conversations.length === 0) {
      return {
        count: 0,
        recentActivity: false,
        responseTime: null,
        engagement: 'low',
        summary: 'No conversations available for this period.'
      };
    }

    const recentActivity = conversations.some(conv => {
      const convDate = new Date(conv.createdAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return convDate >= weekAgo;
    });

    const engagement = this.calculateEngagement(conversations);

    return {
      count: conversations.length,
      recentActivity,
      engagement,
      summary: this.generateConversationSummary(conversations, engagement)
    };
  }

  calculateEngagement(conversations) {
    if (!conversations || conversations.length === 0) return 'low';
    
    const recentConversations = conversations.filter(conv => {
      const convDate = new Date(conv.createdAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return convDate >= weekAgo;
    });

    if (recentConversations.length >= 5) return 'high';
    if (recentConversations.length >= 2) return 'medium';
    return 'low';
  }

  extractThemes(text) {
    const commonThemes = [
      'implementation', 'integration', 'support', 'training', 'onboarding',
      'billing', 'pricing', 'renewal', 'expansion', 'feature request',
      'bug report', 'performance', 'security', 'compliance', 'migration'
    ];

    const foundThemes = commonThemes.filter(theme => 
      text.toLowerCase().includes(theme.toLowerCase())
    );

    return foundThemes.slice(0, 5);
  }

  generateNoteSummary(notes, sentimentScore) {
    const count = notes.length;
    const sentimentText = sentimentScore > 0.3 ? 'positive' : 
                         sentimentScore < -0.3 ? 'negative' : 'neutral';
    
    return `${count} note${count !== 1 ? 's' : ''} recorded with overall ${sentimentText} sentiment.`;
  }

  generateTaskSummary(tasks, completionRate, overdue) {
    let summary = `${tasks.length} task${tasks.length !== 1 ? 's' : ''} with ${completionRate}% completion rate.`;
    if (overdue > 0) {
      summary += ` ${overdue} task${overdue !== 1 ? 's are' : ' is'} overdue.`;
    }
    return summary;
  }

  generateConversationSummary(conversations, engagement) {
    return `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''} with ${engagement} engagement level.`;
  }

  processAccountActivity(activityData) {
    const { account, notes, tasks, conversations, period } = activityData;
    
    const noteSummary = this.summarizeNotes(notes);
    const taskSummary = this.summarizeTasks(tasks);
    const conversationSummary = this.summarizeConversations(conversations);

    const overallSentiment = this.calculateOverallSentiment(
      noteSummary.sentimentAnalysis,
      taskSummary.completionRate,
      conversationSummary.engagement
    );

    return {
      account: {
        id: account.id,
        name: account.name,
        traits: account.traits || {}
      },
      period,
      summary: {
        notes: noteSummary,
        tasks: taskSummary,
        conversations: conversationSummary,
        overall: {
          sentiment: overallSentiment,
          activityLevel: this.calculateActivityLevel(notes, tasks, conversations),
          summary: this.generateOverallSummary(noteSummary, taskSummary, conversationSummary)
        }
      }
    };
  }

  calculateOverallSentiment(noteSentiment, completionRate, engagement) {
    let score = 0;
    let factors = 0;

    // Note sentiment (weight: 0.4)
    if (noteSentiment.confidence > 0.1) {
      score += noteSentiment.averageScore * 0.4;
      factors += 0.4;
    }

    // Task completion (weight: 0.3)
    if (completionRate !== null) {
      const taskScore = (completionRate - 50) / 50; // Normalize around 50%
      score += taskScore * 0.3;
      factors += 0.3;
    }

    // Engagement (weight: 0.3)
    const engagementScore = engagement === 'high' ? 1 : engagement === 'medium' ? 0 : -1;
    score += engagementScore * 0.3;
    factors += 0.3;

    const finalScore = factors > 0 ? score / factors : 0;
    
    return {
      score: Math.round(finalScore * 100) / 100,
      level: finalScore > 0.3 ? 'positive' : finalScore < -0.3 ? 'negative' : 'neutral'
    };
  }

  calculateActivityLevel(notes, tasks, conversations) {
    const totalActivity = (notes?.length || 0) + (tasks?.length || 0) + (conversations?.length || 0);
    
    if (totalActivity >= 20) return 'high';
    if (totalActivity >= 10) return 'medium';
    if (totalActivity >= 5) return 'low';
    return 'very low';
  }

  generateOverallSummary(noteSummary, taskSummary, conversationSummary) {
    const parts = [];
    
    if (noteSummary.count > 0) parts.push(noteSummary.summary);
    if (taskSummary.count > 0) parts.push(taskSummary.summary);
    if (conversationSummary.count > 0) parts.push(conversationSummary.summary);
    
    return parts.length > 0 ? parts.join(' ') : 'No significant activity recorded.';
  }
}

module.exports = DataProcessor;
