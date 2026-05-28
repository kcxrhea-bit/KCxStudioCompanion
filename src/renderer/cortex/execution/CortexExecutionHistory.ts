import { CortexExecutionResult } from "./CortexExecutionResult";

export class CortexExecutionHistory {
  private results: CortexExecutionResult[] = [];

  addResult(result: CortexExecutionResult) {
    this.results = [result, ...this.results].slice(0, 30);
    return result;
  }

  getResults() {
    return this.results;
  }

  clear() {
    this.results = [];
  }
}
