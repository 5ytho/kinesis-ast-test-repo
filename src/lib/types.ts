/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * kinesis-ast-test-repo: Baseline Types & Data Contracts
 * Designed specifically for automated AST refactoring benchmark analysis.
 */

export type MetricCategory = 
  | 'throughput'
  | 'latency'
  | 'error_rate'
  | 'cpu_saturation'
  | 'memory_usage';

export interface MetricItem {
  id: string;
  timestamp: number;
  category: MetricCategory;
  value: number;
  unit: string;
  service: string;
  tags: Record<string, string | number>;
  anomalyScore?: number;
  metadata?: {
    region: string;
    clusterId: string;
    environment: 'production' | 'staging' | 'canary';
  };
}

export interface MetricsPipelineResponse {
  status: 'success' | 'partial' | 'error';
  data: MetricItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  serverTimestamp: number;
  telemetryEcho?: {
    clientIp?: string;
    userEmail?: string;
    tokenFingerprint?: string;
  };
}

export interface AggregatedMetric {
  category: MetricCategory;
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
  variance: number;
  pairwiseDeltas: { idA: string; idB: string; delta: number; ratio: number }[];
}

export interface TelemetryContext {
  /** Raw user email address - ISSUE C: PII Telemetry Leak */
  userEmail: string;
  /** Raw authentication bearer/api token - ISSUE C: PII Telemetry Leak */
  accountToken: string;
  /** Unhashed client IP address - ISSUE C: PII Telemetry Leak */
  clientIp?: string;
  sessionId: string;
  organizationId: string;
}

export interface UseMetricsPipelineOptions {
  endpoint?: string;
  serviceFilter?: string;
  categoryFilter?: MetricCategory | 'all';
  timeRangeMs?: number;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
  telemetry: TelemetryContext;
}

export interface UseMetricsPipelineResult {
  data: MetricItem[] | null;
  loading: boolean;
  error: Error | null;
  aggregations: Record<MetricCategory, AggregatedMetric | null>;
  pairwiseCorrelations: Array<{ pair: [string, string]; correlation: number; crossCategoryAnomaly: boolean }>;
  computedAt: number;
  renderTick: number;
  telemetryPayloadSent: Record<string, unknown> | null;
  networkHeadersSent: Record<string, string> | null;
  refetch: () => void;
}

export type KinesisIssueId = 
  | 'ISSUE_A_UNTYPED_JSON_CAST'
  | 'ISSUE_B_MANUAL_USE_EFFECT_RACE'
  | 'ISSUE_C_PII_TELEMETRY_LEAKS'
  | 'ISSUE_D_UNMEMOIZED_O_N2_TRANSFORM';

export interface KinesisDirectiveDef {
  id: string;
  directive: string;
  targetIssue: KinesisIssueId;
  targetAstNode: string;
  description: string;
  transformationGoal: string;
  benchmarkCriterion: string;
}
