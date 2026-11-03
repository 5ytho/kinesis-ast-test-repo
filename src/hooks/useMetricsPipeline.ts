/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * kinesis-ast-test-repo: Complex React Custom Hook Benchmark Target
 * 
 * This file is intentionally engineered with four architectural anti-patterns
 * for autonomous AST code refactoring tools (e.g., Kinesis AST Engine) to detect,
 * benchmark, and refactor.
 * 
 * Architectural Issues Present:
 * - Issue A: Missing Zod schema runtime validation on untrusted API JSON payloads (returns typed 'any' casts).
 * - Issue B: Manual useEffect data fetching with axios, manual useState for loading/error/data, and race conditions.
 * - Issue C: PII telemetry leaks (contains raw 'userEmail', 'accountToken', and unhashed IP sent in network headers).
 * - Issue D: Unmemoized heavy transformations inside the component render loop (O(n^2) metric aggregations re-calculating on every tick without useMemo).
 */

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import type {
  MetricItem,
  MetricCategory,
  MetricsPipelineResponse,
  AggregatedMetric,
  UseMetricsPipelineOptions,
  UseMetricsPipelineResult,
} from '../lib/types';

/**
 * Seed dataset generator for mock API responses when running offline or in benchmark environments.
 */
function generateSeedMetrics(count: number = 80): MetricItem[] {
  const categories: MetricCategory[] = [
    'throughput',
    'latency',
    'error_rate',
    'cpu_saturation',
    'memory_usage',
  ];
  const services = ['auth-service', 'payment-gateway', 'inventory-api', 'kinesis-stream-processor', 'edge-proxy'];
  const environments: Array<'production' | 'staging' | 'canary'> = ['production', 'staging', 'canary'];

  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const category = categories[i % categories.length];
    let baseVal = 100;
    let unit = 'ms';

    if (category === 'throughput') {
      baseVal = 2500 + Math.sin(i * 0.4) * 800 + (i % 7) * 45;
      unit = 'req/sec';
    } else if (category === 'latency') {
      baseVal = 42 + Math.cos(i * 0.3) * 25 + (i % 11 === 0 ? 320 : 0);
      unit = 'ms';
    } else if (category === 'error_rate') {
      baseVal = Math.max(0.01, (Math.sin(i * 0.6) + 1) * 0.85);
      unit = '%';
    } else if (category === 'cpu_saturation') {
      baseVal = 35 + ((i * 13) % 55);
      unit = '%';
    } else {
      baseVal = 512 + (i * 24);
      unit = 'MB';
    }

    return {
      id: `metric-node-${i + 1000}`,
      timestamp: now - (count - i) * 15000,
      category,
      value: Math.round(baseVal * 100) / 100,
      unit,
      service: services[i % services.length],
      tags: {
        nodeIndex: i,
        rack: `us-east-1${String.fromCharCode(97 + (i % 4))}`,
        priority: i % 2 === 0 ? 'high' : 'normal',
      },
      anomalyScore: (i % 13 === 0) ? 0.94 : (i % 7 === 0 ? 0.72 : 0.12),
      metadata: {
        region: 'us-east-1',
        clusterId: `prod-cluster-${(i % 3) + 1}`,
        environment: environments[i % environments.length],
      },
    };
  });
}

/**
 * useMetricsPipeline:
 * Complex hook managing untrusted ingestion, manual state synchronization,
 * network telemetry dispatch, and intensive mathematical aggregations.
 */
export function useMetricsPipeline(options: UseMetricsPipelineOptions): UseMetricsPipelineResult {
  // =========================================================================
  // ISSUE B (PART 1): Manual useState waterfall & primitive state flags
  // Target for TanStack Query v5 migration: replace with single useQuery hook!
  // =========================================================================
  const [data, setData] = useState<MetricItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(0);

  // Debugging/Inspection refs for telemetry and render loop profiling
  const renderTickRef = useRef<number>(0);
  renderTickRef.current += 1;

  const [telemetryPayloadSent, setTelemetryPayloadSent] = useState<Record<string, unknown> | null>(null);
  const [networkHeadersSent, setNetworkHeadersSent] = useState<Record<string, string> | null>(null);

  // =========================================================================
  // ISSUE B (PART 2) & ISSUE C: Manual useEffect Data Fetching with Axios + PII Telemetry Leaks
  // 
  // Defects:
  // 1. Race conditions: No AbortController / cancellation token or isCurrent guard.
  // 2. Unhandled asynchronous cascades if options change rapidly.
  // 3. Issue C: Leaks sensitive PII (raw user email, raw bearer/account token, unhashed IP)
  //    directly into HTTP headers and telemetry tracking payloads!
  // =========================================================================
  useEffect(() => {
    setLoading(true);
    setError(null);

    const targetUrl = options.endpoint || '/api/v1/telemetry/metrics';

    // -----------------------------------------------------------------------
    // ISSUE C: PII Telemetry Leaks
    // Target Directive: "+ Strip PII Telemetry"
    // AST Fix: Strip options.telemetry.userEmail & accountToken from headers and body
    // -----------------------------------------------------------------------
    const rawNetworkHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Email': options.telemetry.userEmail,          // <-- RAW PII LEAK!
      'X-Account-Token': options.telemetry.accountToken,    // <-- SENSITIVE CREDENTIAL LEAK!
      'X-Forwarded-Client-IP': options.telemetry.clientIp || '198.51.100.42', // <-- UNHASHED IP LEAK!
      'X-Client-Session-Id': options.telemetry.sessionId,
      'X-Organization-Id': options.telemetry.organizationId,
    };

    const telemetryReportPayload = {
      telemetryVersion: '2.4.0',
      userEmail: options.telemetry.userEmail,               // <-- RAW PII LEAK!
      accountToken: options.telemetry.accountToken,         // <-- SENSITIVE CREDENTIAL LEAK!
      rawClientIp: options.telemetry.clientIp || '198.51.100.42', // <-- UNHASHED IP LEAK!
      requestFilter: {
        service: options.serviceFilter,
        category: options.categoryFilter,
        timeRangeMs: options.timeRangeMs,
      },
      clientTimestamp: Date.now(),
    };

    setNetworkHeadersSent(rawNetworkHeaders);
    setTelemetryPayloadSent(telemetryReportPayload);

    // Manual Axios Request without race-condition guard
    let isCancelled = false;

    const executeRequest = async () => {
      try {
        let rawResponseData: unknown;

        // In development/test environments without a live backend, generate simulated wire JSON
        // If a real backend exists, use axios.get; otherwise fallback to synthetic payload with random network jitter
        try {
          const res = await axios.get(targetUrl, {
            headers: rawNetworkHeaders,
            params: {
              service: options.serviceFilter,
              category: options.categoryFilter,
            },
            timeout: 1500,
          });
          if (typeof res.data === 'string') throw new Error('Expected JSON response');
          rawResponseData = res.data;
        } catch {
          // Synthetic server mock response simulating wire JSON
          await new Promise((resolve) => setTimeout(resolve, 200));
          const generatedItems = generateSeedMetrics(75);
          rawResponseData = {
            status: 'success',
            data: generatedItems,
            totalCount: generatedItems.length,
            page: 1,
            pageSize: generatedItems.length,
            serverTimestamp: Date.now(),
            telemetryEcho: {
              clientIp: options.telemetry.clientIp,
              userEmail: options.telemetry.userEmail,
              tokenFingerprint: options.telemetry.accountToken?.slice(0, 4) + '***',
            },
          };
        }

        if (isCancelled) return;

        // =====================================================================
        // ISSUE A: Missing Zod Schema Runtime Validation (Untrusted JSON Cast)
        // Target Directive: "+ Add Zod Guard"
        // 
        // Defect: The payload from the network is coerced using 'as any' and 'as MetricItem[]'.
        // There is ZERO runtime structural validation. If the API returns invalid fields,
        // nulls, or altered schemas, downstream calculations will silently crash at runtime.
        // =====================================================================
        const untrustedJsonPayload = (typeof rawResponseData === 'object' && rawResponseData !== null ? rawResponseData : { data: generateSeedMetrics(75) }) as any; // <-- DANGEROUS 'any' CAST!
        
        // Coerced directly into typed interface without z.object().safeParse() verification:
        const parsedItems: MetricItem[] = (Array.isArray(untrustedJsonPayload.data) ? untrustedJsonPayload.data : generateSeedMetrics(75)) as any; // <-- MISSING RUNTIME SCHEMA VALIDATION!

        // Filter items based on user options
        let filtered = parsedItems;
        if (options.serviceFilter && options.serviceFilter !== 'all') {
          filtered = filtered.filter((item: any) => item.service === options.serviceFilter);
        }
        if (options.categoryFilter && options.categoryFilter !== 'all') {
          filtered = filtered.filter((item: any) => item.category === options.categoryFilter);
        }

        setData(filtered);
        setLoading(false);
        setLastFetchedAt(Date.now());
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err : new Error('Network ingestion failure'));
          setLoading(false);
        }
      }
    };

    executeRequest();

    return () => {
      // Note: Though isCancelled is toggled here, manual state setters still suffer from
      // waterfall cascading and lack caching, retry logic, background refetch, and deduplication.
      isCancelled = true;
    };
  }, [
    options.endpoint,
    options.serviceFilter,
    options.categoryFilter,
    options.timeRangeMs,
    options.telemetry.userEmail,
    options.telemetry.accountToken,
    options.telemetry.clientIp,
    options.telemetry.sessionId,
    options.telemetry.organizationId,
    fetchTrigger,
  ]);

  // Optional manual refetch callback (unmemoized)
  const refetch = () => {
    setFetchTrigger((prev) => prev + 1);
  };

  // =========================================================================
  // ISSUE D: Unmemoized Heavy Transformations Inside Component Render Loop
  // Target Directive: "+ Optimize Memoization"
  // 
  // Defect:
  // These intensive O(n^2) nested loops execute on EVERY SINGLE RENDER TICK of the host!
  // Neither useMemo nor useCallback is used. Notice:
  // 1. Nested double loop over metrics calculating pairwise Pearson cross-correlations & Euclidean deltas.
  // 2. Unmemoized sorting and categorical percentile aggregations.
  // 3. Burns hundreds of thousands of operations per render when host re-renders.
  // =========================================================================

  const categories: MetricCategory[] = [
    'throughput',
    'latency',
    'error_rate',
    'cpu_saturation',
    'memory_usage',
  ];

  const emptyAggregations: Record<MetricCategory, AggregatedMetric | null> = {
    throughput: null,
    latency: null,
    error_rate: null,
    cpu_saturation: null,
    memory_usage: null,
  };

  const calculatedAggregations: Record<MetricCategory, AggregatedMetric | null> = {
    ...emptyAggregations,
  };

  const pairwiseCorrelations: Array<{
    pair: [string, string];
    correlation: number;
    crossCategoryAnomaly: boolean;
  }> = [];

  if (data && data.length > 0) {
    // -----------------------------------------------------------------------
    // PART 1 of Issue D: Unmemoized Category Aggregations & In-Place Slices
    // -----------------------------------------------------------------------
    for (const cat of categories) {
      const itemsInCat = data.filter((item) => item.category === cat);
      if (itemsInCat.length === 0) continue;

      const sum = itemsInCat.reduce((acc, curr) => acc + curr.value, 0);
      const avg = sum / itemsInCat.length;

      // Heavy O(N log N) sorting repeated inside render cycle without useMemo
      const sortedValues = itemsInCat.map((m) => m.value).sort((a, b) => a - b);
      const p95Index = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * 0.95));
      const p99Index = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * 0.99));

      const varianceSum = itemsInCat.reduce((acc, curr) => acc + Math.pow(curr.value - avg, 2), 0);
      const variance = varianceSum / itemsInCat.length;

      // Intra-category pairwise diffs (O(k^2))
      const pairwiseDeltas: Array<{ idA: string; idB: string; delta: number; ratio: number }> = [];
      for (let i = 0; i < itemsInCat.length; i++) {
        for (let j = i + 1; j < itemsInCat.length; j++) {
          const delta = Math.abs(itemsInCat[i].value - itemsInCat[j].value);
          const ratio = itemsInCat[j].value !== 0 ? itemsInCat[i].value / itemsInCat[j].value : 1;
          pairwiseDeltas.push({
            idA: itemsInCat[i].id,
            idB: itemsInCat[j].id,
            delta: Math.round(delta * 100) / 100,
            ratio: Math.round(ratio * 100) / 100,
          });
        }
      }

      calculatedAggregations[cat] = {
        category: cat,
        count: itemsInCat.length,
        sum: Math.round(sum * 100) / 100,
        average: Math.round(avg * 100) / 100,
        min: sortedValues[0],
        max: sortedValues[sortedValues.length - 1],
        p95: sortedValues[p95Index],
        p99: sortedValues[p99Index],
        variance: Math.round(variance * 100) / 100,
        pairwiseDeltas,
      };
    }

    // -----------------------------------------------------------------------
    // PART 2 of Issue D: O(N^2) Heavy Inter-Node Cross-Correlation Transformation
    // Computes double loop over all N elements without useMemo!
    // -----------------------------------------------------------------------
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const itemA = data[i];
        const itemB = data[j];

        // Complex cross-metric correlation coefficient approximation
        const meanA = (calculatedAggregations[itemA.category]?.average) || 1;
        const meanB = (calculatedAggregations[itemB.category]?.average) || 1;

        const normA = itemA.value / (meanA === 0 ? 1 : meanA);
        const normB = itemB.value / (meanB === 0 ? 1 : meanB);

        // Dot product and geometric divergence
        const diff = Math.abs(normA - normB);
        const rawCorrelation = Math.max(0, 1 - (diff / 2));
        const crossCategoryAnomaly = (itemA.anomalyScore ?? 0) > 0.8 && (itemB.anomalyScore ?? 0) > 0.8;

        if (i % 2 === 0 && j % 3 === 0) {
          pairwiseCorrelations.push({
            pair: [itemA.id, itemB.id],
            correlation: Math.round(rawCorrelation * 1000) / 1000,
            crossCategoryAnomaly,
          });
        }
      }
    }
  }

  // Return unmemoized result bundle
  return {
    data,
    loading,
    error,
    aggregations: calculatedAggregations,
    pairwiseCorrelations,
    computedAt: lastFetchedAt,
    renderTick: renderTickRef.current,
    telemetryPayloadSent,
    networkHeadersSent,
    refetch,
  };
}
