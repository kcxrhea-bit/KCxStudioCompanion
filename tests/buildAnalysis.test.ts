import { analyzeHeuristic } from '../src/lib/buildAnalysis';

describe('build analysis parser refinement', () => {
  test('detects deliberate Kotlin syntax typo in MainActivity.kt', () => {
    const log = `> Task :app:compileDebugKotlin FAILED
e: file:///C:/Users/right/AndroidStudioProjects/EasyLauncher/app/src/main/java/com/easylauncher/MainActivity.kt:123:45 Syntax error: Expecting an expression
BUILD FAILED in 2s`;

    const results = analyzeHeuristic(log);

    expect(results[0].detectedType).toBe('Kotlin compile error');
    expect(results[0].severity).toBe('high');
    expect(results[0].confidence).toBe(0.95);
    expect(results[0].fileName).toBe('MainActivity.kt');
    expect(results[0].line).toBe(123);
    expect(results[0].column).toBe(45);
    expect(results[0].message).toMatch(/Expecting an expression|Syntax error/i);
    expect(results.some((issue) => issue.detectedType === 'Room/KSP failures')).toBe(false);
    expect(results.some((issue) => issue.detectedType === 'Compose compiler issues')).toBe(false);
  });

  test('detects unresolved reference in a .kt file', () => {
    const results = analyzeHeuristic('e: C:\\Projects\\EasyLauncher\\app\\src\\main\\java\\MainActivity.kt:44:9 Unresolved reference: MainActivityBroken');

    expect(results[0].detectedType).toBe('Kotlin compile error');
    expect(results[0].likelySymbols).toContain('MainActivityBroken');
    expect(results[0].fileName).toBe('MainActivity.kt');
    expect(results[0].line).toBe(44);
    expect(results[0].column).toBe(9);
  });

  test('detects Room/KSP only with strong signals', () => {
    const strong = analyzeHeuristic('KspTask failed: RoomProcessor error in androidx.room Entity Dao processing');
    const generic = analyzeHeuristic('Execution failed for task :app:compileDebugKotlin. Compilation error. See log for more details.');

    expect(strong[0].detectedType).toBe('Room/KSP failures');
    expect(generic.some((issue) => issue.detectedType === 'Room/KSP failures')).toBe(false);
  });

  test('detects Compose only with strong signals', () => {
    const strong = analyzeHeuristic('@Composable invocations can only happen from the context of a Composable function');
    const generic = analyzeHeuristic('Execution failed for task :app:compileDebugKotlin. Compilation error. See log for more details.');

    expect(strong[0].detectedType).toBe('Compose compiler issues');
    expect(generic.some((issue) => issue.detectedType === 'Compose compiler issues')).toBe(false);
  });

  test('deduplicates repeated issue spam', () => {
    const repeatedKotlin = Array.from({ length: 5 }, () => 'e: file:///C:/project/app/src/main/java/MainActivity.kt:12:3 Expecting an expression').join('\n');
    const repeatedFallback = Array.from({ length: 20 }, () => 'Execution failed for task :app:compileDebugKotlin.').join('\n');

    expect(analyzeHeuristic(repeatedKotlin).filter((issue) => issue.detectedType === 'Kotlin compile error')).toHaveLength(1);
    expect(analyzeHeuristic(repeatedFallback).filter((issue) => issue.detectedType === 'Gradle task failures')).toHaveLength(1);
  });
});
