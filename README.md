# 🍵 ChaiBookLM

**An AI-powered Research Assistant inspired by Google NotebookLM.**

Upload multiple knowledge sources, chat with your documents using Retrieval-Augmented Generation (RAG), watch the retrieval pipeline work in real time, generate AI-powered study materials, and share them with anyone.

---

## 🚀 Live Deployed Link

> **https://chai-book-lm-seven.vercel.app**

The app is behind a guest access gate. To try it, open the link, click **Try the app**, and enter a guest access token. Don't have one? See [Getting Access](#-getting-access).

---

## 🎥 Demo Video

> 📺 [**Watch the demo video here**](PASTE_DEMO_VIDEO_LINK_HERE)

---

## 🔑 Getting Access

ChaiBookLM calls paid APIs (LLM, embeddings, vector storage), so the live app is open to guests with an access token instead of being fully public.

* Open the live link and click **Try the app**
* No tokens? Contact me:
  * 📧 [Aayush.sharma.0x@gmail.com](mailto:Aayush.sharma.0x@gmail.com)
  * 💼 [linkedin.com/in/aayush-sharma-0x](https://linkedin.com/in/aayush-sharma-0x)
  * 🐙 [github.com/0xNotAyu](https://github.com/0xNotAyu)

---

## Overview

ChaiBookLM is a full-stack AI research assistant.

The application lets users organize information into notebooks, upload multiple knowledge sources, build an isolated knowledge base for every notebook, and ask questions grounded entirely in the uploaded content.

Unlike a traditional chatbot, every response is backed by retrieved context from the user's own sources and includes citations that can be inspected.

Beyond conversational search, ChaiBookLM can also generate AI-powered learning artifacts such as reports, flashcards, and quizzes, which can be shared publicly.

Heavy work (source indexing and artifact generation) runs as **background jobs**, so the UI stays responsive while the pipeline works.

---

# ✨ Features


## 📙 Notebook Management

* Multiple notebooks per visitor
* Create, rename, delete notebooks
* Back button to return to the notebook list
* Notebook isolation
* Emoji support
* Responsive dashboard
* Loading & empty states

---

## 📂 Knowledge Sources

Supports multiple source types:

* 📄 PDF
* 📝 Plain Text (.txt or pasted text)
* 🌐 Website URLs
* ▶️ YouTube Videos
* 📜 VTT Transcript Files

Each notebook can contain multiple knowledge sources.

> **Note:** YouTube transcript fetching can occasionally be blocked by YouTube for requests coming from cloud/server IPs. When this happens, the source fails with a clear, actionable message instead of a generic error. Uploading a `.vtt` transcript file is a reliable alternative.

---

## ⚙️ Source Processing Pipeline

Every added source goes through the following pipeline, run as a **background job (Inngest)**:

```
Add Source

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

Each source maintains its own state, shown live in the sources panel without a page refresh:

* Processing
* Completed
* Failed (with a specific, human-readable error message)

Sources can be deleted or re-indexed at any time without re-uploading. Re-indexing reuses the originally extracted text to rebuild chunks and embeddings, and the job clears old vectors first, so retries never create duplicates.

---

## 🧠 Retrieval Augmented Generation (RAG)

When the user asks a question:

1. The query is rewritten into multiple variants: a typo-fixed rewrite, a step-back question, and three sub-questions. In parallel, a **HyDE** hypothetical answer is generated
2. Every variant is embedded and searched against Qdrant in parallel, scoped strictly to that notebook
3. Results are fused using **Reciprocal Rank Fusion (RRF)** for stronger retrieval quality
4. Retrieved context is sent to the LLM
5. The AI generates a grounded, streamed response
6. Citations are attached to every answer

This minimizes hallucinations by forcing the model to answer using only retrieved context.

---

## 🔍 Live RAG Pipeline Trace

Every answer shows what the pipeline is doing as it happens:

* **Query rewriting**: the cleaned-up question, step-back question, and sub-queries
* **HyDE**: the hypothetical answer used for search
* **Embedding**: how many query vectors were created
* **Vector search**: candidate chunks found across all queries
* **Fusion**: unique passages after RRF and how many were matched by 2+ variants
* **Generation**: the cited answer streaming in

Each step reports its own timing. The trace folds away once the answer is complete and can be reopened at any time.

---

## 💬 AI Chat

* Natural language conversations
* Streaming responses (tokens, pipeline stages, and citations over one NDJSON stream)
* Markdown formatting (including code blocks with copy/syntax highlighting)
* Context-aware, multi-query retrieval
* Notebook-specific memory (persisted conversation history)
* Grounded answers only
* **Copy** any answer with one click
* **Regenerate** the last answer (replaces the old answer and re-runs the full pipeline)
* **Partial answers are saved** if the connection drops mid-stream
* **Clear Chat**: resets the conversation for a notebook without touching its sources
* **AI-Suggested Questions**: when a notebook has no conversation yet, the app generates relevant starter questions from the notebook's own content

---

## 🔖 Citations

Every AI response includes citations.

Users can inspect exactly where an answer came from.

Supported citation viewers:

* PDF (jumps to and renders the relevant page)
* Website (opens the original page)
* Plain Text (highlights the relevant excerpt)
* YouTube (jumps to the referenced timestamp)
* VTT / Transcript (auto-scrolls to and highlights the cited transcript line, synced to its timestamp)

This ensures complete transparency and source attribution.

---

# 🎓 AI Study Tools

ChaiBookLM goes beyond question answering. Users can generate learning artifacts directly from their notebook. Artifacts are generated in the background, and the panel updates as soon as they are ready.

## 📄 AI Report

Generate structured reports from notebook knowledge.

Perfect for revision, documentation, research notes, and summaries.

---

## 🗂 Flashcards

Automatically generate study flashcards for active recall learning.

Ideal for exam preparation.

---

## ❓ Quiz Generator

Generate multiple-choice quizzes directly from uploaded sources.

Helps users test their understanding instead of simply reading.

---

# 🌍 Shareable Artifacts

Generated Reports, Flashcards and Quizzes can be shared using a public URL.

Recipients **do not need access to the notebook** or a guest token.

Example:

```
/share/:artifactId
```

This allows users to share generated study material while keeping their notebook private.

---

# 🏗 Architecture

```
          Visitor (guest access token → signed session cookie)
                          │
                          ▼
                   Next.js Frontend
                          │
                          ▼
                 API Route Handlers
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
 PostgreSQL (Neon)    OpenAI API        Inngest
   via Prisma            │          (background jobs)
        │                ▼                 │
 Notebooks, Sources,  Embeddings /         ▼
 Messages, Artifacts  Chat           Source indexing,
                                     Artifact generation
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
Add Source (background job)
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
Query Rewriting + HyDE (parallel)
(rewrite / step-back / sub-queries / hypothetical answer)
      │
      ▼
Embed All Variants
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
Grounded Response + Citations
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
* Zod validation
* Signed, httpOnly session cookie with a proxy/middleware access gate
* **Inngest** for background jobs (source indexing, artifact generation)

---

## Database

* PostgreSQL on **Neon**
* **Prisma** ORM

---

## Vector Database

* Qdrant

---

## AI

* OpenAI API
* Embeddings
* Streaming Chat Completion
* Multi-query retrieval (rewrite, step-back, sub-queries, HyDE, RRF fusion)

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
│   ├── welcome          (landing page + access gate)
│   ├── api
│   ├── notebook
│   ├── share
│
├── components
│   ├── notebook
│   │   ├── dashboard
│   │   ├── workspace
│   ├── ui
│
├── services
│
├── inngest              (background job definitions)
│
├── validators
│
├── lib
│   ├── extractors
│
├── generated/prisma     (generated Prisma client)
│
├── middleware.ts        (access gate)
│
└── types
```

---

# 📡 API

Access APIs

* Verify access token / start session
* End session

Notebook APIs

* Create Notebook
* List Notebooks
* Rename Notebook
* Delete Notebook

Source APIs

* Add Source (queues a background job)
* List Sources (polled while processing)
* Fetch Source Content (for transcript/VTT viewing)
* Delete Source
* Re-index Source

Chat APIs

* Streaming Chat (also handles regenerate)
* Conversation History
* Clear Conversation
* AI-Suggested Questions

Artifact APIs

* Generate Report / Flashcards / Quiz (queues a background job)
* List Artifacts (polled while generating)
* Share Artifact

Background Jobs

* `/api/inngest` serves the job functions to Inngest

---

# 📦 Installation

Clone the repository

```bash
git clone https://github.com/0xNotAyu/chai-book-lm.git
cd chai-book-lm
```

Install dependencies

```bash
npm install
```

Set up the database

```bash
npx prisma migrate dev
npx prisma generate
```

Run the development server

```bash
npm run dev
```

In a second terminal, run the Inngest dev server (background jobs need it)

```bash
npm run inngest
```

Then open `http://localhost:3000`. The Inngest dev dashboard runs at `http://localhost:8288`.

---

# 🔐 Environment Variables

Create a `.env`

```env
# Database (Neon PostgreSQL)
DATABASE_URL=

# AI
OPENAI_API_KEY=
OPENAI_BASE_URL=

# Vector database
QDRANT_CLUSTER_ENDPOINT=
QDRANT_API_KEY=

# File storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Guest access gate
ACCESS_TOKENS=          # comma-separated list of valid guest tokens
SESSION_SECRET=         # long random string used to sign the session cookie

# Inngest
INNGEST_DEV=1           # local development only
INNGEST_EVENT_KEY=      # production only
INNGEST_SIGNING_KEY=    # production only
```

---

# 🚀 Deployment

The application is deployed on:

* Vercel (app)
* Neon (PostgreSQL)
* Qdrant Cloud (vectors)
* Inngest Cloud (background jobs)
* Cloudinary (file storage)

---

# 🎯 Features Covered

## ✅ Notebook Management

* Multiple notebooks
* Create
* Rename
* Delete
* Isolation per visitor

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
* Background processing with live status

---

## ✅ AI Responses

* Streaming
* Multi-query RAG (rewrite / step-back / sub-queries / HyDE / RRF)
* Live pipeline trace
* Prompt Engineering
* Minimal Hallucination
* AI-generated suggested starter questions
* Copy and regenerate

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
* Background jobs with retries and failure handling

---

## ✅ UI

* Responsive layout
* Loading states
* Empty states
* Modern notebook experience
* Landing page with access gate
* Clear chat control

---

# 🔮 Future Improvements

* Full authentication (accounts, not just a guest access gate)
* Usage quotas per user
* Direct-to-Cloudinary uploads for large PDFs
* Persisted pipeline traces in chat history
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

* Every notebook has its own isolated knowledge base, and vector search is scoped per notebook.
* AI responses are always grounded using retrieved context.
* Retrieval uses multi-query expansion (rewrite, step-back, sub-queries, HyDE) fused via RRF for higher recall and precision.
* The retrieval pipeline reports each stage as it runs, so its behavior is visible rather than a black box.
* Source indexing and artifact generation run as Inngest background jobs, so requests return immediately, failures are retried, and a failed job marks the item as failed with a readable message.
* Indexing is idempotent: old vectors are removed before re-indexing, so retries never duplicate chunks.
* Artifacts are generated independently from conversations.
* Shared artifacts are public while notebooks remain private.
* The application prioritizes retrieval quality over unrestricted generation to reduce hallucinations.

---

# 🙏 Acknowledgements


Inspired by **Google NotebookLM** and modern Retrieval-Augmented Generation (RAG) systems.

---

# 👨‍💻 Author

**Aayush Sharma**

* 📧 [Aayush.sharma.0x@gmail.com](mailto:Aayush.sharma.0x@gmail.com)
* 💼 [LinkedIn](https://linkedin.com/in/aayush-sharma-0x)
* 🐙 [GitHub](https://github.com/0xNotAyu)

If you found this project interesting, feel free to ⭐ the repository!