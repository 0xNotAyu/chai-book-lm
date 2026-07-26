# 🍵 ChaiBookLM

**An AI-powered Research Assistant inspired by Google NotebookLM.**

Upload multiple knowledge sources, chat with your documents using Retrieval-Augmented Generation (RAG), generate AI-powered study materials, and share them with anyone.

---
## 🚀 Live Deployed Link

> https://chai-book-lm-alpha.vercel.app/

---


## 🎥 Demo Video

> 📺 [**Watch the demo video here**](PASTE_DEMO_VIDEO_LINK_HERE)

---

##  Overview

ChaiBookLM is a full-stack AI research assistant built as part of the **GenAI with JS 2026** assignment.

The application allows users to organize information into notebooks, upload multiple knowledge sources, build an isolated knowledge base for every notebook, and ask questions grounded entirely on the uploaded content.

Unlike a traditional chatbot, every response is backed by retrieved context from the user's own sources and includes citations that can be inspected.

Beyond conversational search, ChaiBookLM can also generate AI-powered learning artifacts such as reports, flashcards, and quizzes which can be shared publicly.

Every first-time visitor automatically gets a personal set of demo notebooks (PDF, VTT, Website, YouTube) cloned for them — so the app can be tried instantly with zero setup, with no login required.

---

# ✨ Features

## 📙 Notebook Management

* Multiple notebooks per (anonymous) user
* Create, rename, delete notebooks
* Notebook isolation
* Emoji support
* Responsive dashboard
* Loading & empty states
* First-visit onboarding dialog introducing the pre-loaded demo notebooks

---

## 👤 Per-Visitor Demo Notebooks

* No login/signup — each visitor is identified by a secure, httpOnly cookie
* On first visit, 4 demo notebooks (PDF / VTT / Website / YouTube) are automatically cloned into that visitor's own private workspace
* Cloning is done atomically (via a dedicated lock collection) so concurrent requests or rapid refreshes can never create duplicate notebooks
* Each visitor's notebooks, sources, and chat history are fully isolated from every other visitor

---

## 📂 Knowledge Sources

Supports multiple source types:

* 📄 PDF
* 📝 Plain Text (.txt)
* 🌐 Website URLs
* ▶️ YouTube Videos
* 📜 VTT Transcript Files

Each notebook can contain multiple knowledge sources.

> **Note:** YouTube transcript fetching can occasionally be blocked by YouTube for requests coming from cloud/server IPs. When this happens, the source fails with a clear, actionable message instead of a generic error, pointing users to the demo notebooks or VTT upload as a reliable alternative.

---

## ⚙️ Source Processing Pipeline

Every uploaded source goes through the following pipeline:
```
Upload

↓

Content Extraction

↓

Text Chunking

↓

Embedding Generation

↓

Vector Storage (Qdrant)

↓

Ready for AI Search
```

Each source also maintains its own indexing state:

* Uploading
* Indexing
* Ready
* Failed (with a specific, human-readable error message)

Sources can be deleted or re-indexed at any time without needing to re-upload — re-indexing reuses the originally extracted text to rebuild chunks/embeddings.

---

## 🧠 Retrieval Augmented Generation (RAG)

When the user asks a question:

1. The query is rewritten into multiple variants (typo-fixed rewrite, step-back question, HyDE hypothetical answer, and sub-questions)
2. Each variant is embedded and searched against Qdrant in parallel, scoped strictly to that notebook
3. Results are fused using Reciprocal Rank Fusion (RRF) for stronger retrieval quality
4. Retrieved context is sent to the LLM
5. AI generates a grounded, streamed response
6. Citations are attached to every answer

This minimizes hallucinations by forcing the model to answer using only retrieved context.

---

## 💬 AI Chat

* Natural language conversations
* Streaming responses
* Markdown formatting (including code blocks with copy/syntax highlighting)
* Context-aware, multi-query retrieval
* Notebook-specific memory (persisted conversation history)
* Grounded answers only
* **Clear Chat** — resets the conversation for a notebook without touching any of its sources
* **AI-Suggested Questions** — when a notebook has no conversation yet, the app generates a handful of relevant starter questions from the notebook's own content, so users always know what to ask

---

## 🔖 Citations

Every AI response includes citations.

Users can inspect exactly where an answer came from.

Supported citation viewers:

* PDF (jumps to and renders the relevant page)
* Website (opens/previews the original page)
* Plain Text (highlights the relevant excerpt)
* YouTube (jumps to the referenced timestamp)
* VTT / Transcript (auto-scrolls to and highlights the cited transcript line, synced to its timestamp)

This ensures complete transparency and source attribution.

---

# 🎓 AI Study Tools

ChaiBookLM goes beyond question answering.

Users can generate learning artifacts directly from their notebook.

## 📄 AI Report

Generate structured reports from notebook knowledge.

Perfect for:

* Revision
* Documentation
* Research Notes
* Summaries

---

## 🗂 Flashcards

Automatically generate study flashcards for active recall learning.

Ideal for exam preparation.

---

## ❓ Quiz Generator

Generate quizzes directly from uploaded sources.

Helps users test their understanding instead of simply reading.

---

# 🌍 Shareable Artifacts

One of the unique features of ChaiBookLM is artifact sharing.

Generated Reports, Flashcards and Quizzes can be shared using a public URL.

Recipients **do not need access to the notebook**.

Example:

```
/share/:artifactId
```

This allows users to share generated study material while keeping their notebook private.

---

# 🏗 Architecture

```
                User (identified via anonymous cookie)
                  │
                  ▼
            Next.js Frontend
                  │
                  ▼
            API Route Handlers
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
    MongoDB             OpenAI API
        │                   │
        ▼                   ▼
 Notebook Data        Embeddings / Chat
        │
        ▼
     Qdrant
(Vector Database)
        │
        ▼
 Relevant Chunks
        │
        ▼
Grounded AI Response
```

---

# 🔄 RAG Pipeline

```
Upload Source
      │
      ▼
Extract Text
      │
      ▼
Chunk Content
      │
      ▼
Generate Embeddings
      │
      ▼
Store in Qdrant
      │
      ▼
User Question
      │
      ▼
Multi-Query Rewriting
(rewrite / step-back / HyDE / sub-queries)
      │
      ▼
Parallel Similarity Search
      │
      ▼
Reciprocal Rank Fusion
      │
      ▼
Retrieve Context
      │
      ▼
OpenAI (Streaming)
      │
      ▼
Grounded Response
      │
      ▼
Return Citations
```

---

# 🛠 Tech Stack

## Frontend

* Next.js 16
* React 19
* TypeScript
* Tailwind CSS
* shadcn/ui
* Lucide Icons

---

## Backend

* Next.js Route Handlers
* TypeScript
* Cookie-based anonymous user identification (Next.js Middleware)

---

## Database

* MongoDB
* Mongoose

---

## Vector Database

* Qdrant

---

## AI

* OpenAI API
* Embeddings
* Streaming Chat Completion
* Multi-query retrieval (rewrite, step-back, HyDE, RRF fusion)

---

## File Processing

* PDF Extraction
* Website Extraction
* YouTube Transcript Extraction
* VTT Parsing
* Text Extraction

---

## Storage

* Cloudinary

---

# 📁 Project Structure

```
src
│
├── app
│   ├── api
│   ├── notebook
│   ├── share
│
├── components
│   ├── dashboard
│   ├── workspace
│   ├── ui
│
├── services
│
├── models
│
├── validators
│
├── extractors
│
├── lib
│
├── middleware.ts
│
└── types
```

---

# 📡 API

Notebook APIs

* Create Notebook
* List Notebooks (auto-clones demo notebooks on a visitor's first request)
* Rename Notebook
* Delete Notebook

Source APIs

* Upload Source
* Fetch Source Content (for transcript/VTT viewing)
* Delete Source
* Re-index Source

Chat APIs

* Streaming Chat
* Conversation History
* Clear Conversation
* AI-Suggested Questions

Artifact APIs

* Generate Report
* Generate Flashcards
* Generate Quiz
* Share Artifact

---

# 📦 Installation

Clone the repository

```bash
git clone https://github.com/0xNotAyu/chai-book-lm.git
```

Install dependencies

```bash
npm install
```

Run development server

```bash
npm run dev
```

---

# 🔐 Environment Variables

Create a `.env.local`

```env
MONGO_URI=

OPENAI_API_KEY=
OPENAI_BASE_URL=

QDRANT_CLUSTER_ENDPOINT=
QDRANT_API_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

# 🚀 Deployment

The application can be deployed on:

* Vercel
* MongoDB Atlas
* Qdrant Cloud
* Cloudinary

---

# 🎯 Assignment Features Covered

## ✅ Notebook Management

* Multiple notebooks
* Create
* Rename
* Delete
* Isolation
* Per-visitor demo notebooks (no login required)

---

## ✅ Source Ingestion

* PDF
* TXT
* Website
* YouTube
* VTT
* Clear, actionable failure messages (e.g. YouTube blocking)

---

## ✅ Indexing Pipeline

* Extraction
* Chunking
* Embeddings
* Vector Storage
* Re-indexing

---

## ✅ AI Responses

* Streaming
* Multi-query RAG (rewrite / step-back / HyDE / RRF)
* Prompt Engineering
* Minimal Hallucination
* AI-generated suggested starter questions

---

## ✅ Citation System

* Every response contains citations
* Source inspection, including timestamp-synced VTT/YouTube viewing
* Metadata preserved

---

## ✅ Engineering

* Clean architecture
* Separation of concerns
* Reusable components
* Service layer
* Validation
* Error handling
* Atomic, race-condition-safe per-user demo cloning

---

## ✅ UI

* Responsive layout
* Loading states
* Empty states
* Modern notebook experience
* First-visit onboarding
* Clear chat control

---

# 🔮 Future Improvements

* Full authentication (accounts, not just anonymous cookies)
* Collaborative notebooks
* Podcast generation
* Learning roadmaps
* OCR support
* DOCX support
* Image understanding
* Hybrid Search (BM25 + Vector)
* Multi-language support

---

# 💡 Engineering Decisions

* Every notebook has its own isolated knowledge base.
* Vector search is performed using Qdrant, scoped per-notebook.
* AI responses are always grounded using retrieved context.
* Retrieval uses multi-query expansion (rewrite, step-back, HyDE) fused via RRF for higher recall/precision.
* Artifacts are generated independently from conversations.
* Shared artifacts are public while notebooks remain private.
* Anonymous per-visitor identity (via cookie) lets everyone get their own isolated demo workspace without requiring signup.
* Demo notebook cloning uses an atomic lock to guarantee exactly-once initialization, even under concurrent/rapid requests.
* The application prioritizes retrieval quality over unrestricted generation to reduce hallucinations.

---

# 🙏 Acknowledgements

Built as part of the **GenAI with JS 2026** assignment.

Inspired by **Google NotebookLM** and modern Retrieval-Augmented Generation (RAG) systems.

---

# 👨‍💻 Author

**Aayush**

If you found this project interesting, feel free to ⭐ the repository!