# 👁 On The Face Of It — Interactive Learning Website

An immersive, AI-powered learning experience for CBSE Class 12 English supplementary play *On The Face Of It* by Susan Hill.

---

## 🌿 Features

| Page | Description |
|------|-------------|
| **Landing Page** | 3D animated book, particle effects, floating statistics, character cards |
| **Summary** | Full story summary with themes, symbols, quotes, and literary analysis |
| **Flashcards** | 20 built-in study cards + AI-powered flashcard generation on any topic |
| **Quiz** | 15 questions (MCQ, True/False, Fill-in-Blanks) + AI quiz generation |
| **AI Assistant** | Claude-powered chatbot specialized in the play |
| **Animated Story** | 6-scene CSS animated visual narrative with play/pause controls |

---

## 🚀 Quick Start

### Option A — Open directly in browser (no backend needed)
All AI features work client-side via direct Anthropic API calls.
```
open frontend/index.html
```

### Option B — Run with Node.js backend
```bash
# 1. Install dependencies
npm install

# 2. Set your API key
export ANTHROPIC_API_KEY=your_key_here

# 3. Start the server
npm start
# → http://localhost:3000
```

---

## 📁 Project Structure

```
on-the-face-of-it/
├── frontend/
│   ├── index.html        ← Landing page (3D book, animations)
│   ├── summary.html      ← Full story summary & analysis
│   ├── flashcards.html   ← AI flashcards with flip animation
│   ├── quiz.html         ← Interactive quiz with AI generation
│   ├── assistant.html    ← AI chat assistant
│   ├── video.html        ← CSS animated story scenes
│   ├── css/
│   │   └── style.css     ← All styles (gothic garden aesthetic)
│   └── js/
│       └── main.js       ← Shared JS (navbar, particles, counters)
├── backend/
│   └── server.js         ← Express.js API server
├── package.json
└── README.md
```

---

## 🎨 Design Philosophy

**Gothic Garden** aesthetic — dark backgrounds with deep forest greens and amber accents, inspired by Mr. Lamb's walled garden. Typography pairs Playfair Display (literary display) with Cormorant Garamond (elegant body) and Space Mono (technical labels).

### Key Visual Effects
- **3D rotating book** on landing (CSS perspective + rotateY/X)
- **Particle system** — floating green/amber particles
- **Counter animations** — statistics count up on scroll
- **Flashcard flip** — CSS 3D card flip animation
- **Animated story** — 6-scene CSS animated theatre

---

## 🔧 Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (for backend mode) |
| `PORT` | Server port (default: 3000) |

---

## 📚 About the Play

**On The Face Of It** by Susan Hill is a one-act play about:
- **Derry** — a bitter 14-year-old with a severely scarred face
- **Mr. Lamb** — a wise old man with a tin leg who lives in his open-gated garden

The play explores **isolation, acceptance, disability, human connection**, and the philosophy of living fully despite adversity.

---

*Built with ❤ for CBSE Class 12 Literature students*
