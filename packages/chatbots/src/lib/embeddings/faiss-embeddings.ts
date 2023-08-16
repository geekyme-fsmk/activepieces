import { FaissStore } from 'langchain/vectorstores/faiss';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Document } from 'langchain/document';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

const storeCache: { [botId: string]: FaissStore } = {};

function getStorePath(botId: string) {
  return path.join(os.homedir(), '.activepieces', botId);
}

function getEmbedding() {
  return new OpenAIEmbeddings({
  });
}

async function getStore(botId: string) {
  if (storeCache[botId]) {
    return storeCache[botId];
  }
  const dir = getStorePath(botId);
  try {
    await fs.access(dir);
    const store = await FaissStore.load(dir, getEmbedding());
    storeCache[botId] = store;
    return store;
  } catch (error) {
    const store = await FaissStore.fromDocuments([], getEmbedding());
    storeCache[botId] = store;
    return store;
  }
}

export const faissEmbedding = (botId: string) => ({
  async query({ input }: { input: string }) {
    const store = await getStore(botId);
    if (store.docstore._docs.size === 0) {
      return [];
    }
    const similarDocuments = await store.similaritySearch(input, 10, botId);
    return similarDocuments.map((doc) => doc.pageContent);
  },
  async addDocuments({
    datasourceId,
    documents
  }: {
    datasourceId: string;
    documents: Document[];
  }) {
    const store = await getStore(botId);
    const dir = getStorePath(botId);
    const modifiedDocument = documents.map((f) => {
      return {
        ...f,
        metadata: {
          ...f.metadata,
          datasourceId
        }
      };
    });
    await store.addDocuments(modifiedDocument);
    await store.save(dir);
    delete storeCache[botId];
  },
  async deleteDocuments({ datasourceId }: { datasourceId: string }) {
    const store = await getStore(botId);
    const dir = getStorePath(botId);
    const documentsToKeep: Document[] = [];
    store.docstore._docs.forEach((doc) => {
      if (doc.metadata['datasourceId'] !== datasourceId) {
        documentsToKeep.push(doc);
      }
    });
    if (documentsToKeep.length === 0) {
      await fs.rmdir(dir, { recursive: true });
    } else {
      const newStore = await FaissStore.fromDocuments(
        documentsToKeep,
        getEmbedding()
      );
      await newStore.save(dir);
    }
    delete storeCache[botId];
  }
});
