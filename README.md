# 🍵 ChaiBookLM

 **An AI-powered Research Assistant inspired by Google NotebookLM.**

 Upload multiple knowledge sources, chat with your documents using Retrieval-Augmented Generation (RAG), generate AI-powered study materials, and share them with anyone.

---

## 🚀 Overview

ChaiBookLM is a full-stack AI research assistant built as part of the **GenAI with JS 2026** assignment.

The application allows users to organize information into notebooks, upload multiple knowledge sources, build an isolated knowledge base for every notebook, and ask questions grounded entirely on the uploaded content.

Unlike a traditional chatbot, every response is backed by retrieved context from the user's own sources and includes citations that can be inspected.

Beyond conversational search, ChaiBookLM can also generate AI-powered learning artifacts such as reports, flashcards, and quizzes which can be shared publicly.

---

# ✨ Features

## 📙 Notebook Management

* Create notebooks
* Rename notebooks
* Delete notebooks
* Notebook isolation
* Emoji support
* Responsive dashboard
* Loading & empty states

---

## 📂 Knowledge Sources

Supports multiple source types:

* 📄 PDF
* 📝 Plain Text (.txt)
* 🌐 Website URLs
* ▶️ YouTube Videos
* 📜 VTT Transcript Files

Each notebook can contain multiple knowledge sources.

---

## ⚙️ Source Processing Pipeline

Every uploaded source goes through the following pipeline:

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

Each source also maintains its own indexing state:

* Uploading
* Indexing
* Ready
* Failed

---

## 🧠 Retrieval Augmented Generation (RAG)

When the user asks a question:

1. User query is embedded
2. Qdrant performs semantic vector search
3. Most relevant chunks are retrieved
4. Retrieved context is sent to the LLM
5. AI generates a grounded response
6. Citations are attached to every answer

This minimizes hallucinations by forcing the model to answer using only retrieved context.

---

## 💬 AI Chat

* Natural language conversations
* Streaming responses
* Markdown formatting
* Context-aware retrieval
* Notebook-specific memory
* Grounded answers only

---

## 🔖 Citations

Every AI response includes citations.

Users can inspect exactly where an answer came from.

Supported citation viewers:

* PDF
* Website
* Plain Text
* YouTube Timestamp
* Transcript Highlight

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
                User
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
Similarity Search
      │
      ▼
Retrieve Context
      │
      ▼
OpenAI
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
└── types
```

---

# 📡 API

Notebook APIs

* Create Notebook
* List Notebooks
* Rename Notebook
* Delete Notebook

Source APIs

* Upload Source
* Delete Source
* Re-index Source

Chat APIs

* Streaming Chat
* Conversation History

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
MONGODB_URI=

OPENAI_API_KEY=

QDRANT_URL=

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

---

## ✅ Source Ingestion

* PDF
* TXT
* Website
* YouTube
* VTT

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
* RAG
* Prompt Engineering
* Minimal Hallucination

---

## ✅ Citation System

* Every response contains citations
* Source inspection
* Metadata preserved

---

## ✅ Engineering

* Clean architecture
* Separation of concerns
* Reusable components
* Service layer
* Validation
* Error handling

---

## ✅ UI

* Responsive layout
* Loading states
* Empty states
* Modern notebook experience

---

# 📸 Screenshots

Add screenshots here.

* Dashboard
* Notebook Workspace
* Source Upload
* AI Chat
* Citation Viewer
* Flashcards
* Quiz
* Report
* Shared Artifact

---

# 🔮 Future Improvements

* Authentication
* Anonymous users
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
* Vector search is performed using Qdrant.
* AI responses are always grounded using retrieved context.
* Artifacts are generated independently from conversations.
* Shared artifacts are public while notebooks remain private.
* The application prioritizes retrieval quality over unrestricted generation to reduce hallucinations.

---

# 🙏 Acknowledgements

Built as part of the **GenAI with JS 2026** assignment.

Inspired by **Google NotebookLM** and modern Retrieval-Augmented Generation (RAG) systems.

---

# 👨‍💻 Author

**Aayush**

If you found this project interesting, feel free to ⭐ the repository!
