// Lazy loading MongoDB connections to avoid build-time issues
// This prevents Next.js from trying to connect to MongoDB during the build process

export async function getUsersCollectionLazy() {
  const { getUsersCollection } = await import('@/lib/mongodb-no-ssl');
  return getUsersCollection();
}

export async function getSessionsCollectionLazy() {
  const { getSessionsCollection } = await import('@/lib/mongodb-no-ssl');
  return getSessionsCollection();
}

export async function getTestConfigurationsCollectionLazy() {
  const { getTestConfigurationsCollection } = await import('@/lib/mongodb-no-ssl');
  return getTestConfigurationsCollection();
}

export async function getSimulatedConversationsCollectionLazy() {
  const { getSimulatedConversationsCollection } = await import('@/lib/mongodb-no-ssl');
  return getSimulatedConversationsCollection();
}

export async function getConversationScoresCollectionLazy() {
  const { getConversationScoresCollection } = await import('@/lib/mongodb-no-ssl');
  return getConversationScoresCollection();
}

export async function getScoringMetricsCollectionLazy() {
  const { getScoringMetricsCollection } = await import('@/lib/mongodb-no-ssl');
  return getScoringMetricsCollection();
}

export async function getGeneratedContentCollectionLazy() {
  const { getGeneratedContentCollection } = await import('@/lib/mongodb-no-ssl');
  return getGeneratedContentCollection();
}

export async function getGuidelinesCollectionLazy() {
  const { getGuidelinesCollection } = await import('@/lib/mongodb-no-ssl');
  return getGuidelinesCollection();
}

export async function getExportedResultsCollectionLazy() {
  const { getExportedResultsCollection } = await import('@/lib/mongodb-no-ssl');
  return getExportedResultsCollection();
}

export async function getEvaluationWorkflowsCollectionLazy() {
  const { getEvaluationWorkflowsCollection } = await import('@/lib/mongodb-no-ssl');
  return getEvaluationWorkflowsCollection();
}

// Simplified collections
export async function getTestCasesCollectionLazy() {
  const { getTestCasesCollection } = await import('@/lib/mongodb-no-ssl');
  return getTestCasesCollection();
}

export async function getConversationsCollectionLazy() {
  const { getConversationsCollection } = await import('@/lib/mongodb-no-ssl');
  return getConversationsCollection();
}
