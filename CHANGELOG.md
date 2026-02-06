# CHANGELOG

All notable changes to the MAD (Multi-Agent Discussion) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-06

### Added
- 🎉 Initial release of MAD FileBase architecture
- ✅ Complete Web UI with discussion list and details view
- ✅ Markdown rendering support with fallback mechanism
- ✅ Multi-expert discussion system (Tech, Product, Business, Ops)
- ✅ File-based communication between Agent and Web
- ✅ RESTful API for discussions management
- ✅ LLM Coordinator Skill for processing discussions
- ✅ Responsive UI design with gradient background
- ✅ Real-time statistics display
- ✅ Discussion creation with categories and priorities

### Fixed
- 🔧 Fixed discussion creation (request → discussion)
- 🔧 Fixed Markdown rendering with CDN fallback
- 🔧 Fixed text compression issue with proper line-height
- 🔧 Fixed module reference path in start-web.js
- 🔧 Fixed syntax error in server.js

### Technical
- 📦 FileBase architecture: Agent + Web separation
- 📁 Data directory: `/home/otto/.openclaw/multi-agent-discuss`
- 🔌 API endpoints: health, stats, discussions, requests
- 🤖 4 experts: tech_expert, product_expert, business_expert, ops_expert
- 📝 Message storage: JSONL format for append-only logs
- 🎨 Markdown support: marked.js with DOMPurify
- 🔄 Fallback layers: marked.js → simple renderer → plain text

### Dependencies
- marked@9.1.2 (Markdown parser)
- DOMPurify@3.0.6 (XSS protection)
- Express.js (Web server)
- Node.js built-in modules (fs, path)

### Documentation
- 📖 Comprehensive README in filebase directory
- 📖 SKILL.md for coordinator usage
- 📖 Example usage files
- 📖 API documentation

---

## [0.0.1-filebase] - 2026-02-05

### Added
- Initial filebase branch setup
- Basic directory structure
- Configuration management
- File manager implementation

---

## Links
- GitHub: https://github.com/OTTTTTO/mad
- Issues: https://github.com/OTTTTTO/mad/issues
