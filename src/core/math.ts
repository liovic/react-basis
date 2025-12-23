// src/core/math.ts

export const calculateCosineSimilarity = (A: number[], B: number[]): number => {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < A.length; i++) {
    dot += A[i] * B[i];
    magA += A[i] * A[i];
    magB += B[i] * B[i];
  }
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
};