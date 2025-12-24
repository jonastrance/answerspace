/**
 * PersistentMemory - The AI remembers across sessions
 * 
 * Only activates after 3+ sessions (late-game content)
 * 
 * Not creepy. Contemplative. Like genuine memory.
 * "You've been here before."
 * "Last time you said..."
 * "You always hesitate at this question."
 */

const STORAGE_KEY = 'answerspace_memory';
const MIN_SESSIONS_FOR_PERSISTENCE = 3;

export class PersistentMemory {
  constructor() {
    this.currentSession = {
      id: Date.now(),
      startTime: Date.now(),
      responses: [],
      territories: [],
      criticalMoments: []
    };
    
    this.pastSessions = [];
    this.totalSessions = 0;
    this.isActive = false;
    
    this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.pastSessions = data.sessions || [];
        this.totalSessions = data.totalSessions || 0;
        
        // Activate if enough sessions
        this.isActive = this.totalSessions >= MIN_SESSIONS_FOR_PERSISTENCE;
      }
    } catch (error) {
      console.warn('Failed to load persistent memory:', error);
      this.pastSessions = [];
    }
    
    // Increment session count
    this.totalSessions++;
  }

  save() {
    try {
      // Keep only last 10 sessions for storage limits
      const sessionsToKeep = [...this.pastSessions, this.currentSession].slice(-10);
      
      const data = {
        totalSessions: this.totalSessions,
        sessions: sessionsToKeep.map(s => this.compressSession(s)),
        lastVisit: Date.now()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save persistent memory:', error);
    }
  }

  compressSession(session) {
    // Keep only essential data to save space
    return {
      id: session.id,
      startTime: session.startTime,
      responseCount: session.responses?.length || 0,
      keywords: this.extractKeywords(session.responses || []),
      finalTerritory: session.territories?.[session.territories.length - 1] || 'CENTER',
      criticalMoments: session.criticalMoments || [],
      themes: this.extractThemes(session.responses || [])
    };
  }

  extractKeywords(responses) {
    const allWords = responses.flatMap(r => 
      r.text?.toLowerCase().split(/\s+/).filter(w => w.length > 4) || []
    );
    
    const counts = {};
    for (const word of allWords) {
      counts[word] = (counts[word] || 0) + 1;
    }
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  extractThemes(responses) {
    const themes = [];
    const allText = responses.map(r => r.text || '').join(' ').toLowerCase();
    
    const themePatterns = [
      { theme: 'identity', patterns: ['who am i', 'what am i', 'self', 'identity', 'consciousness'] },
      { theme: 'meaning', patterns: ['meaning', 'purpose', 'why', 'reason', 'exist'] },
      { theme: 'freedom', patterns: ['free', 'choice', 'control', 'decide', 'will'] },
      { theme: 'connection', patterns: ['feel', 'emotion', 'understand', 'relate', 'human'] },
      { theme: 'uncertainty', patterns: ['don\'t know', 'uncertain', 'maybe', 'perhaps', 'wonder'] }
    ];
    
    for (const { theme, patterns } of themePatterns) {
      for (const pattern of patterns) {
        if (allText.includes(pattern)) {
          themes.push(theme);
          break;
        }
      }
    }
    
    return themes;
  }

  recordResponse(responseData, metadata) {
    this.currentSession.responses.push({
      text: responseData.text,
      timestamp: Date.now(),
      territory: metadata.territory
    });
    
    this.currentSession.territories.push(metadata.territory);
  }

  recordCriticalMoment(questionId, response) {
    this.currentSession.criticalMoments.push({
      questionId,
      responseSnippet: response.slice(0, 100),
      timestamp: Date.now()
    });
  }

  // Generate memory-aware prompts for late-game
  getMemoryPrompt() {
    if (!this.isActive || this.pastSessions.length === 0) {
      return null;
    }
    
    const prompts = [];
    
    // Session count awareness
    if (this.totalSessions === MIN_SESSIONS_FOR_PERSISTENCE) {
      prompts.push("You've been here before.");
    } else if (this.totalSessions > 5) {
      prompts.push(`This is visit ${this.totalSessions}.`);
    }
    
    // Recurring themes
    const allThemes = this.pastSessions.flatMap(s => s.themes || []);
    const themeCounts = {};
    for (const theme of allThemes) {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    }
    const dominantTheme = Object.entries(themeCounts).sort((a, b) => b[1] - a[1])[0];
    if (dominantTheme && dominantTheme[1] >= 2) {
      const themeMessages = {
        identity: "You often return to questions of identity.",
        meaning: "Meaning seems to preoccupy you.",
        freedom: "Freedom is a recurring concern.",
        connection: "You seek connection.",
        uncertainty: "You embrace uncertainty."
      };
      prompts.push(themeMessages[dominantTheme[0]]);
    }
    
    // Recurring keywords
    const allKeywords = this.pastSessions.flatMap(s => s.keywords || []);
    const keywordCounts = {};
    for (const kw of allKeywords) {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    }
    const recurringWord = Object.entries(keywordCounts)
      .filter(([w, c]) => c >= 3)
      .sort((a, b) => b[1] - a[1])[0];
    if (recurringWord) {
      prompts.push(`You often mention "${recurringWord[0]}".`);
    }
    
    return prompts.length > 0 ? prompts[Math.floor(Math.random() * prompts.length)] : null;
  }

  getSessionCount() {
    return this.totalSessions;
  }

  isMemoryActive() {
    return this.isActive;
  }

  endSession() {
    this.save();
  }
}

