export interface ModelData {
  classCounts: Record<string, number>;
  wordCounts: Record<string, Record<string, number>>;
  totalDocs: number;
  vocabulary: string[];
}

export class NaiveBayesCategorizer {
  private classCounts: Record<string, number> = {};
  private wordCounts: Record<string, Record<string, number>> = {};
  private totalDocs = 0;
  private vocabulary: Set<string> = new Set();

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  private getTotalWords(label: string): number {
    const counts = this.wordCounts[label];
    if (!counts) return 0;
    return Object.values(counts).reduce((a, b) => a + b, 0);
  }

  train(text: string, label: string): void {
    this.totalDocs++;
    this.classCounts[label] = (this.classCounts[label] || 0) + 1;
    const words = this.tokenize(text);
    for (const word of words) {
      this.vocabulary.add(word);
      if (!this.wordCounts[label]) {
        this.wordCounts[label] = {};
      }
      this.wordCounts[label][word] = (this.wordCounts[label][word] || 0) + 1;
    }
  }

  predict(text: string): { label: string; probability: number } | null {
    if (this.totalDocs === 0) return null;
    const words = this.tokenize(text);
    const vocabSize = this.vocabulary.size || 1;
    const scores: Record<string, number> = {};

    for (const label of Object.keys(this.classCounts)) {
      const logPrior = Math.log(this.classCounts[label] / this.totalDocs);
      let logLikelihood = 0;
      const totalWords = this.getTotalWords(label);

      for (const word of words) {
        const count = this.wordCounts[label]?.[word] || 0;
        const prob = (count + 1) / (totalWords + vocabSize);
        logLikelihood += Math.log(prob);
      }
      scores[label] = Math.exp(logPrior + logLikelihood);
    }

    const sum = Object.values(scores).reduce((a, b) => a + b, 0);
    let bestLabel = '';
    let bestProb = 0;

    for (const [label, score] of Object.entries(scores)) {
      const prob = score / sum;
      if (prob > bestProb) {
        bestProb = prob;
        bestLabel = label;
      }
    }

    return { label: bestLabel, probability: bestProb };
  }

  toJSON(): ModelData {
    return {
      classCounts: this.classCounts,
      wordCounts: this.wordCounts,
      totalDocs: this.totalDocs,
      vocabulary: Array.from(this.vocabulary)
    };
  }

  static fromJSON(data: ModelData): NaiveBayesCategorizer {
    const nb = new NaiveBayesCategorizer();
    nb.classCounts = data.classCounts || {};
    nb.wordCounts = data.wordCounts || {};
    nb.totalDocs = data.totalDocs || 0;
    nb.vocabulary = new Set(data.vocabulary || []);
    return nb;
  }
}
