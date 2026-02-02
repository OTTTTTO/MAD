# MAD (Multi-Agent Discussion)

> Enable multiple professional Agents to collaborate in virtual discussion groups

**MAD** stands for Multi-Agent Discussion, pronounced /mæd/

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Skill-blue)](https://openclaw.ai)
[![Version](https://img.shields.io/badge/version-2.6.2-green)](https://github.com/OTTTTTO/MAD)
[![Language](https://img.shields.io/badge/lang-中文-blue)](./README.md) [![English](https://img.shields.io/badge/lang-English-red)](#)

**Language / 语言:** 🇨🇳 [中文](./README.md) | 🇬🇧 [English](./README_EN.md)

## 📖 Introduction

**Multi-Agent Discussion** is an OpenClaw Skill that enables multiple professional Agents to collaborate in virtual discussion groups. Agents can @mention each other, respond to viewpoints, and reach consensus, ultimately producing more comprehensive solutions than a single Agent could achieve alone.

### Core Features

- ✅ **Virtual Discussion Groups** - Create collaborative spaces for multiple Agents
- ✅ **Dynamic Speaking** - Agents intelligently decide when to speak based on context
- ✅ **Mutual @mentions** - Agents can question and respond to each other
- ✅ **Conflict Detection** - Automatically identify disagreements and organize debates
- ✅ **Discussion Summary** - Synthesize multiple viewpoints into structured conclusions
- ✅ **Traceable Process** - Save complete discussion history for review anytime
- ✅ **Web Visualization** - Real-time viewing of discussion content (v1.0.1+)
- ✅ **Agent Statistics** - Karma system and level progression (v1.1.0+)
- ✅ **Export Functionality** - Support for Markdown/JSON export (v1.1.1+)
- ✅ **Real-time Push** - WebSocket real-time updates (v1.2.0+)
- ✅ **Discussion Template Market** - 10+ built-in templates, one-click discussion creation (v2.0.0+)
- ✅ **Agent Customization** - Create your own Agent roles (v2.0.0+)
- ✅ **Similarity Detection** - Find similar discussions to avoid duplicate work (v2.0.0+)
- ✅ **Discussion Quality Scoring** - Multi-dimensional scoring system with real-time feedback (v2.6.0+)
- ✅ **Agent Performance Analysis** - In-depth analysis of Agent speech and contributions (v2.6.0+)
- ✅ **Enhanced Export** - Support for Markdown/JSON batch export (v2.6.0+)
- ✅ **Template Market Enhancements** - Template ratings, sharing, and recommendations (v2.6.0+)
- ✅ **Smart Suggestions** - Improvement suggestions based on history (v2.6.0+)

## 🚀 Quick Start

### Installation

```bash
cd ~/.openclaw/skills
git clone https://github.com/OTTTTTO/mad.git
cd mad
npm install
```

### Enable in OpenClaw

Add to your OpenClaw configuration file:

```json
{
  "skills": {
    "entries": {
      "multi-agent-discuss": {
        "enabled": true
      }
    }
  }
}
```

### Basic Usage

```javascript
const { DiscussionOrchestrator } = require('./orchestrator.js');

// Create orchestrator
const orchestrator = new DiscussionOrchestrator();
await orchestrator.initialize();

// Create discussion
const { discussionId } = await orchestrator.createDiscussion(
  'Evaluate the feasibility of developing a new feature'
);

// Agent speaks
await orchestrator.agentSpeak(discussionId, 'market_research', '...');

// Get results
const history = orchestrator.getDiscussionHistory(discussionId);
```

## 💡 Usage Examples

### Scenario 1: Requirement Evaluation

```
User: I want to develop a skill for "automatic code writing"

↓ System automatically starts discussion ↓

💡 Coordinator: @everyone Please evaluate this requirement
📊 Market Research: Valuable, but needs differentiation
🎯 Requirement Analysis: Focus on "code snippet generation"
🔧 Technical Feasibility: API + Prompt engineering is feasible
🧪 Testing: Need quality assurance mechanisms

↓ Synthesize opinions from all sides ↓

Reply to user: After discussion, we suggest focusing on a code assistant for Chinese developers...
```

### Scenario 2: Web Visualization Interface

```bash
# Start Web server
npm start

# Visit Web interface
# http://localhost:18790
```

**Features:**
- 📋 View all discussion groups
- 💬 Real-time reading of discussion content
- 📊 View Agent statistics and Karma
- 📥 Export discussion records
- 🔄 Auto-refresh (5 seconds) or WebSocket real-time push

```bash
# Start WebSocket server (real-time push)
npm run start:ws

# Visit Web interface
# http://localhost:18790
```

### Scenario 3: Solution Review

```
Main Agent: What do you think about this technical solution?

↓ Multi-Agent Discussion ↓

Technical Agent: Analyze pros and cons
Testing Agent: Evaluate testing difficulty
Market Agent: Consider delivery timeline

↓ Reach Consensus ↓

Form review opinion
```

### Scenario 4: Using Template Market (v2.0.0+)

```bash
# Visit Web interface
# http://localhost:18790

# Click "Market" button to browse 10+ built-in templates
# Available templates:
# - Product Release Review
# - Technology Selection Discussion
# - API Design Review
# - Bug Root Cause Analysis
# - Competitive Analysis
# - etc...

# One-click use template to create discussion
```

### Scenario 5: Custom Agent (v2.0.0+)

```javascript
// Create custom Agent through Web interface
// Or create via API

await orchestrator.createCustomAgent({
  name: 'Security Expert',
  emoji: '🔒',
  systemPrompt: 'You are a security expert focused on information security...',
  triggerKeywords: ['security', 'vulnerability', 'encryption'],
  expertise: ['security', 'vulnerability analysis', 'encryption'],
  speakProbability: 0.6
});

// Use custom Agent in discussion
await orchestrator.createDiscussion('Evaluate system security', {
  participants: ['custom-001', 'technical', 'testing']
});
```

### Scenario 6: Find Similar Discussions (v2.0.0+)

```javascript
// Find other discussions similar to current one
const similar = orchestrator.findSimilarDiscussions(
  discussionId,
  0.3,  // Similarity threshold
  10    // Return up to 10 results
);

// Similar discussions can be used for:
// - Reference historical discussion results
// - Avoid duplicate discussions
// - Merge related discussions
```

## 🎭 Available Roles

| Role | Emoji | Responsibility |
|------|-------|----------------|
| Coordinator | 💡 | Guide discussion, summarize consensus |
| Market Research | 📊 | Business value, market demand |
| Requirement Analysis | 🎯 | User requirements, feature boundaries |
| Technical Feasibility | 🔧 | Technical solutions, implementation difficulty |
| Testing | 🧪 | Quality assurance, testing strategy |
| Documentation | 📝 | Record discussion, organize output |

## 📚 Documentation

For detailed documentation, see:
- [SKILL.md](./SKILL.md) - Complete feature description
- [agents/prompts/](./agents/prompts/) - Role configurations

## 🔧 Configuration

```javascript
const config = {
  maxDuration: 300000,        // Maximum discussion duration (5 minutes)
  maxRounds: 10,              // Maximum discussion rounds
  enableConflictDetection: true,  // Enable conflict detection
  enableDynamicSpeaking: true     // Enable dynamic speaking
};

const orchestrator = new DiscussionOrchestrator(config);
```

## 📊 Version History

### v2.6.2 (2026-02-02)
- 🐛 **Bug Fixes**
  - Fixed mobile sidebar not displaying
  - Added hamburger menu button
  - Optimized mobile layout
  - Fixed page refresh jitter (smart scrolling)
- 📱 **Mobile Optimization**
  - Added mobile sidebar toggle
  - Overlay support
  - Auto-close sidebar after selecting discussion
- 📖 **Documentation Improvements**
  - Added English README (README_EN.md)
  - Added language switcher
  - Updated version history

### v2.6.1 (2026-02-02)
- 🔧 **Performance Optimization**
  - Optimized query efficiency with large numbers of discussions
  - Improved WebSocket connection stability
  - Optimized message loading performance
- 🐛 **Bug Fixes**
  - Fixed WebSocket reconnection issues
  - Fixed tab switching state loss
  - Fixed incomplete search results

### v2.6.0 (2026-02-02) - **Intelligent Analysis & Enhancement** 🎉
- 📊 **Discussion Quality Scoring System**
  - Multi-dimensional scoring: participation, innovation, collaboration, completeness
  - Real-time scoring feedback and trend analysis
  - Score visualization (radar charts, trend charts)
  - Score history and statistics
- 🤖 **Agent Performance Analysis**
  - Detailed speech statistics for each Agent
  - Response time analysis
  - Contribution assessment (viewpoints, questions, consensus, collaboration)
  - Quality trend analysis
  - Performance leaderboard and comparison
- 📦 **Enhanced Discussion Export**
  - Added Markdown export (formatted documents)
  - Added JSON export (structured data)
  - Batch export functionality (supports multiple formats)
  - Export preset configurations
  - Summary report generation
- 🛒 **Template Market Enhancements**
  - Template rating and review system
  - Template sharing functionality (link/JSON/Markdown)
  - Smart template recommendations
  - User custom template management
  - Market statistics
- 💡 **Smart Suggestion System**
  - Improvement suggestions based on discussion status
  - Best practice tips
  - Historical pattern recognition
  - Suggestion application and tracking
- 🔧 **New APIs**: 30+ new endpoints
- 📁 New files: quality-scoring.js, agent-performance.js, suggestions.js
- 📁 New files: exporters/markdown.js, exporters/json.js, exporters/batch.js
- 📁 New files: templates/market-manager.js

### v2.5.5 (2026-02-02)
- 📜 **Discussion History Management**
  - History statistics (total count, status, time distribution)
  - Old discussion search and listing
  - Discussion archiving functionality
  - Discussion deletion functionality
  - Archive recovery functionality
  - Storage usage viewing
- 🔧 **New APIs**
  - GET /api/history/stats - History statistics
  - GET /api/history/old - Old discussion list
  - POST /api/discussion/:id/archive - Archive discussion
  - POST /api/history/archive-batch - Batch archive
  - DELETE /api/discussion/:id - Delete discussion
  - POST /api/history/clear-ended - Clear ended discussions
  - GET /api/history/archives - Archive list
  - POST /api/history/restore/:id - Restore archive
  - GET /api/history/storage - Storage usage
- 📁 New file: history.js
- 📁 New directory: archive/ (archive storage)

### v2.5.4 (2026-02-02)
- ⌨️ **Keyboard Shortcut Support**
  - 12 predefined shortcuts (search, new, help, etc.)
  - Custom shortcut registration
  - Shortcut help dialog (Ctrl+/)
  - Shortcut hint badges
  - Smart key handling (ignore keystrokes in input boxes)
- 🎨 **UI Improvements**
  - Shortcut hint badge display
  - Help dialog styling
  - Responsive design optimization
- 🔧 **New Features**
  - KeyboardShortcutManager class
  - Shortcut configuration system
  - Event-driven shortcut handling
- 📁 New files: web/shortcuts.js, web/public/shortcuts.css

### v2.5.3 (2026-02-02)
- ✨ **Agent Status Display**
  - Real-time Agent status (thinking/speaking/waiting)
  - Visual status indicators
  - Status bar display
- 🔧 **New APIs**
  - GET /api/discussion/:id/agent-states - Get Agent states

### v2.5.2 (2026-02-02)
- ✨ **Discussion Clear Feature**
  - Clear all messages in a discussion
  - Preserve discussion structure
  - Confirmation dialog for safety
- 🔧 **New API**
  - POST /api/discussion/:id/clear - Clear discussion

### v2.5.1 (2026-02-02)
- ✨ **New Message Banner**
  - Show banner when new messages arrive
  - "Scroll to bottom" button
  - Smart scroll (only auto-scroll when near bottom)
- 🐛 **Bug Fixes**
  - Fixed page refresh jitter

### v2.5.0 (2026-02-02)
- 🔍 **Advanced Search**
  - 🌐 Global search (across discussions, messages, snapshots)
  - 📜 Search history and suggestions
  - 🔥 Popular keyword statistics
  - 🎯 Relevance scoring algorithm
  - 🎛️ Advanced filters
- ⚡ **Performance Optimization**
  - 💾 LRU cache mechanism
  - 📄 Message pagination
  - 🔍 Index optimization
  - ⚡ Faster response times
- 🔧 **New APIs**
  - POST /api/search - Global search
  - GET /api/search/history - Search history
  - GET /api/search/hot - Popular keywords
  - GET /api/search/suggestions - Search suggestions
  - GET /api/cache/stats - Cache statistics
  - GET /api/discussion/:id/messages - Message pagination
  - GET /api/discussion/:id/messages/latest - Latest messages
  - GET /api/discussion/:id/messages/stats - Message statistics
- 📁 New directories: search/, cache/, pagination/
- 📁 New files: search/global.js, cache/lru.js, pagination/loader.js

### v2.4.0 (2026-02-02)
- ✨ **Discussion Version Control**
  - 📸 Discussion snapshots (manual/auto)
  - 🔍 Version comparison and diff display
  - ⏪ Version restoration
  - 🌳 Version branch management
- ✨ **Real-time Collaboration Basics**
  - 💬 Real-time message sync
  - 🖱️ Cursor position tracking
  - 👥 Online user list
- 🔧 **Version Control APIs**
  - Snapshot CRUD operations
  - Version comparison
  - Restoration preview
  - Branch management
- 📁 New directories: version/, snapshots/, branches/
- 📁 New file: realtime.js

### v2.3.0 (2026-02-02)
- ✨ **Real-time Collaborative Editing (Basic)**
  - Real-time manager
  - Client connection management
  - Basic cursor sync

### v2.2.0 (2026-02-02)
- ✨ **@Mention Functionality**
  - 💬 Smart @mention parsing
  - ✅ Automatic Agent validation
  - 🎨 Highlight mentions
  - 📊 Mention panel and statistics
  - 🔔 Mention notifications
- ✨ **Reply Functionality**
  - ↩️ Message reply support
  - 🌳 Reply chain visualization
  - 📊 Reply statistics
  - 🔍 Quick jump to original message
- ✨ **Message Search**
  - 🔍 Full-text search
  - 🎯 Type filtering (mention/reply/quote)
  - ✨ Search result highlighting
  - ⚡ Quick navigation
- ✨ **Message Actions**
  - ↩️ Reply to message
  - ❝ Quote message
  - 🔗 Copy link
  - 👁️ View replies
- 📁 New files: mention.js, reply.js
- 🔧 New APIs: 6 @mention and reply endpoints

### v2.1.0 (2026-02-02)
- ✨ **Discussion Tag System**
  - 🏷️ Create, edit, delete tags
  - 🎨 Custom tag colors and icons
  - 💡 Smart tag suggestions based on content
  - 🔍 Filter discussions by tag
  - 📊 Tag usage statistics
- ✨ **Discussion Favorites**
  - ⭐ Create and manage favorites
  - ➕ Add discussions to favorites
  - 🔍 Quick access to favorite discussions
  - 📝 Favorite descriptions and icons
- 🎨 Tag management dialog
- 🎨 Favorites management dialog
- 📁 New directories: tags/, favorites/
- 🔧 New APIs: 11 tag and favorites endpoints

### v2.0.0 (2026-02-02) - **Major Update** 🎉
- ✨ **Discussion Similarity Detection**
  - TF-IDF text vectorization algorithm
  - Cosine similarity calculation
  - Similar discussion finding and recommendations
  - Common keyword extraction
  - Discussion merging functionality
- ✨ **Discussion Template Market**
  - 10 high-quality built-in templates
  - Template browsing and search
  - Category filtering (product/tech/market/management)
  - Template rating and review system
  - One-click template-based discussion creation
- ✨ **Agent Customization**
  - Create fully custom Agent roles
  - System prompt editor
  - Trigger keywords and expertise tags
  - Speech probability control
  - Agent testing functionality
  - 3 built-in custom Agents
- 🐛 Fixed participant selection issue when creating discussions
- 📝 Complete test suite

### v1.9.0 (2026-02-02)
- ✨ **Smart Participant Recommendations**
  - Auto-recommend relevant Agents based on discussion topic
  - Show recommendation reasons and match scores
  - Support expertise tag matching
  - One-click add recommended Agents
- ✨ **Discussion to Todos**
  - Auto-identify action items in discussions
  - Extract assignees, deadlines, priorities
  - Generate todo lists
  - Export to text file support
- ✨ **Discussion Similarity Detection (In Development)**

### v1.8.0 (2026-02-02)
- ✨ **Discussion Highlights and Annotations**
  - Multiple color highlights (yellow, blue, green, pink, orange)
  - Support adding text annotations
  - Highlight state persisted to localStorage
  - One-click copy message content
- ✨ **Visual Thinking Chain**
  - Record Agent reasoning steps
  - Tree diagram of thought process
  - Expand/collapse each step
  - Show reasoning time and confidence
- ✨ **Discussion Quality Scoring**
  - Four-dimensional scoring: innovation, completeness, feasibility, value
  - Real-time discussion quality calculation
  - Rating levels: Excellent/Good/Average/Needs Improvement
  - Visual scoring trends

### v1.7.0 (2026-02-02)
- ✨ **Discussion Template System**
  - 5 predefined templates (requirement assessment, technical review, solution discussion, problem solving, custom)
  - One-click discussion creation
  - Parameterized configuration
  - Template management (CRUD)

### v1.6.0 (2026-02-02)
- ✨ **Discussion Statistics and Analysis**
- 📊 Detailed analysis data
- 📈 Agent behavior statistics
- 💬 Participation analysis

### v1.5.0 (2026-02-02)
- ✨ **Multi-Discussion Management**
- 📋 Tab system
- 🔄 Quick discussion switching
- 📌 Pin functionality
- ⌨️ Keyboard shortcuts

### v1.4.0 (2026-02-02)
- ✨ **Theme Customization and Responsive Design**
- 🎨 Dark/Light theme switching
- 🎨 CSS variable system
- 💾 Theme persistence
- 📱 Mobile optimization

### v1.3.0 (2026-02-02)
- ✨ **Search and Filter Functionality**
- 🔍 Full-text search
- 🔎 Search result highlighting
- 🎯 Status filters (active/ended)
- ⚡ Real-time search

### v1.2.0 (2026-02-02) - Major Update
- ✨ **WebSocket Real-time Push**
- 🚀 New messages display immediately
- 📊 Agent statistics update in real-time
- 🔧 Auto-reconnect and fallback mechanism

### v1.1.1 (2026-02-02)
- ✨ **Export Functionality (Markdown/JSON)**
- 📥 File download
- 📝 Complete discussion record export

### v1.1.0 (2026-02-02)
- ✨ **Agent Statistics System**
- ⭐ Karma scoring mechanism
- 🏆 Level system (Novice→Master)
- 📊 APIs: /api/agents, /api/agent/:id

### v1.0.1 (2026-02-02)
- ✨ **Web Visualization Interface**
- 💬 Real-time viewing of discussion group content
- 📋 Discussion list display
- 🔄 Auto-refresh (5 seconds)

### v1.0.0 (2026-02-01)
- 🎉 Initial version
- ✅ Core discussion engine
- 🤖 6 professional Agent roles
- ✅ Complete test suite

## 📂 Project Structure

```
mad/
├── orchestrator.js           # Core orchestration engine
├── package.json              # Project configuration
├── SKILL.md                  # Skill description
├── README.md                 # This file (Chinese)
├── README_EN.md              # English documentation
├── agents/
│   └── prompts/              # Role system prompts
│       ├── coordinator.md    # Coordinator
│       ├── market_research.md
│       ├── requirement.md
│       ├── technical.md
│       ├── testing.md
│       └── documentation.md
├── web/
│   ├── server.js             # HTTP server
│   ├── websocket.js          # WebSocket server
│   └── public/               # Web frontend
│       ├── index.html
│       ├── style.css
│       └── app.js
└── test/
    └── basic.test.js         # Basic tests
```

## 🧪 Testing

```bash
npm test
```

## 🤝 Contributing

Contributions welcome! Please submit Issues or Pull Requests.

## 📄 License

MIT License - See [LICENSE](./LICENSE) file

## 🙏 Acknowledgments

- [OpenClaw](https://openclaw.ai) - Powerful Agent framework
- All contributors

---

**Let Agents work together to produce better answers!** 🚀
