-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('pdf', 'youtube', 'website', 'text', 'vtt');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('report', 'flashcards', 'quiz');

-- CreateEnum
CREATE TYPE "ArtifactStatus" AS ENUM ('generating', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "UserInitStatus" AS ENUM ('pending', 'done');

-- CreateTable
CREATE TABLE "Notebook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📙',
    "description" TEXT NOT NULL DEFAULT '',
    "userId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notebook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "url" TEXT,
    "fileName" TEXT,
    "status" "SourceStatus" NOT NULL DEFAULT 'processing',
    "errorMessage" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "fileUrl" TEXT,
    "cloudinaryPublicId" TEXT,
    "extractedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ArtifactStatus" NOT NULL DEFAULT 'generating',
    "errorMessage" TEXT,
    "content" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "UserInitStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notebook_userId_idx" ON "Notebook"("userId");

-- CreateIndex
CREATE INDEX "Message_notebookId_createdAt_idx" ON "Message"("notebookId", "createdAt");

-- CreateIndex
CREATE INDEX "Source_notebookId_idx" ON "Source"("notebookId");

-- CreateIndex
CREATE INDEX "Artifact_notebookId_createdAt_idx" ON "Artifact"("notebookId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UserInit_userId_key" ON "UserInit"("userId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
