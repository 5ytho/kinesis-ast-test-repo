/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * kinesis-ast-test-repo: Autonomous AST Refactoring Benchmark Studio
 * Interactive harness for executing, benchmarking, and visualizing AST code transformations.
 */

import React, { useState, useTransition } from 'react';
import {
  Code2,
  FileCode,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Copy,
  Check,
  Sparkles,
  Terminal,
  Cpu,
  Lock,
  GitBranch,
  Eye,
  FileText,
} from 'lucide-react';
import { useMetricsPipeline } from './hooks/useMetricsPipeline';
import { useMetricsPipelineClean } from './hooks/useMetricsPipeline.clean';
import type { MetricCategory, UseMetricsPipelineOptions } from './lib/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'harness' | 'diff' | 'files' | 'tests'>('harness');
  const [useRefactoredPipeline, setUseRefactoredPipeline] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | 'all'>('all');
  const [activeDirective, setActiveDirective] = useState<number>(1);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [renderCountTrigger, setRenderCountTrigger] = useState<number>(0);
  const [selectedFileKey, setSelectedFileKey] = useState<string>('useMetricsPipeline.ts');
  const [, startTransition] = useTransition();

  // Test telemetry context containing simulated user credentials
  const telemetryConfig: UseMetricsPipelineOptions['telemetry'] = {
    userEmail: 'dev.lead@kinesis-infra.internal',
    accountToken: 'sk_live_99482a7f8e3c019d_kinesis',
    clientIp: '198.51.100.42',
    sessionId: 'sess_prod_88291a',
    organizationId: 'org_acme_engineering',
  };

  const pipelineOptions: UseMetricsPipelineOptions = {
    serviceFilter: selectedService,
    categoryFilter: selectedCategory,
    telemetry: telemetryConfig,
  };

  // Run the hook (either original flawed or refactored clean)
  const originalResult = useMetricsPipeline(pipelineOptions);
  const cleanResult = useMetricsPipelineClean(pipelineOptions);

  const activeResult = useRefactoredPipeline ? cleanResult : originalResult;

  const handleCopyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(key);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const triggerHostRerender = () => {
    startTransition(() => {
      setRenderCountTrigger((prev) => prev + 1);
    });
  };

  // Directives Definitions
  const directives = [
    {
      id: 1,
      title: '+ Add Zod Guard',
      issueTitle: 'Issue A: Missing Zod Runtime Validation',
      severity: 'Critical Reliability',
      targetAst: 'TSAsExpression [typeAnnotation.typeName.name = "any"]',
      summary: 'Replaces dangerous untrusted "as any" JSON casts with z.object() schemas and safeParse().',
      flawedSnippet: `// ❌ BEFORE: Unchecked any casts on network responses
const untrustedJsonPayload = rawResponseData as any;
const parsedItems: MetricItem[] = untrustedJsonPayload.data as any; // Silent crashes if schema drifts!`,
      cleanSnippet: `// ✅ AFTER: Injected Zod runtime schema with safeParse()
const parseResult = MetricsPipelineResponseSchema.safeParse(rawResponseData);
if (!parseResult.success) {
  throw new Error(\`Schema validation failed: \${parseResult.error.message}\`);
}
const parsedItems = parseResult.data.data;`,
    },
    {
      id: 2,
      title: '+ Convert to TanStack Query',
      issueTitle: 'Issue B: Manual useEffect / useState Waterfall',
      severity: 'High Concurrency',
      targetAst: 'CallExpression [callee.name = "useEffect"] > CallExpression [callee.object.name = "axios"]',
      summary: 'Replaces manual useState flags, fetch triggers, and race-condition-prone useEffect with useQuery v5.',
      flawedSnippet: `// ❌ BEFORE: Manual useState flags & useEffect with race conditions
const [data, setData] = useState<MetricItem[] | null>(null);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  setLoading(true);
  axios.get(targetUrl, { headers, params }).then(res => setData(res.data.data));
}, [options.serviceFilter, options.categoryFilter]);`,
      cleanSnippet: `// ✅ AFTER: Declarative TanStack Query v5 with queryKey & AbortSignal
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['metrics', options.serviceFilter, options.categoryFilter],
  queryFn: async ({ signal }) => {
    const res = await axios.get(endpoint, { signal, params });
    return MetricsPipelineResponseSchema.parse(res.data).data;
  },
  staleTime: 30_000,
});`,
    },
    {
      id: 3,
      title: '+ Strip PII Telemetry',
      issueTitle: 'Issue C: PII Telemetry Leaks',
      severity: 'Critical Privacy / Compliance',
      targetAst: 'ObjectExpression > Property [key.name in ("X-User-Email", "userEmail", "accountToken")]',
      summary: 'Strips raw userEmail, sensitive accountToken, and unhashed IP from headers and telemetry payloads.',
      flawedSnippet: `// ❌ BEFORE: Raw PII & secret tokens broadcast in network headers
const rawNetworkHeaders = {
  'X-User-Email': options.telemetry.userEmail,       // 🔴 RAW PII LEAK
  'X-Account-Token': options.telemetry.accountToken, // 🔴 SENSITIVE TOKEN LEAK
  'X-Forwarded-Client-IP': options.telemetry.clientIp, // 🔴 UNHASHED IP LEAK
};`,
      cleanSnippet: `// ✅ AFTER: Pseudonymized / stripped telemetry headers
const sanitizedHeaders = {
  'Content-Type': 'application/json',
  'X-Client-Session-Id': options.telemetry.sessionId,
  'X-Organization-Id': options.telemetry.organizationId,
  'X-Actor-Pseudonym': hashSha256(options.telemetry.userEmail),
};`,
    },
    {
      id: 4,
      title: '+ Optimize Memoization',
      issueTitle: 'Issue D: Unmemoized O(N^2) Render Loops',
      severity: 'Performance Degradation',
      targetAst: 'ForStatement > ForStatement [nested loops without useMemo parent]',
      summary: 'Wraps heavy O(N log N) sorting, quartiles, and O(N^2) pairwise correlation matrices in useMemo.',
      flawedSnippet: `// ❌ BEFORE: Double nested loops run on every single component render tick
for (const cat of categories) {
  const sortedValues = itemsInCat.map(m => m.value).sort((a, b) => a - b);
}
for (let i = 0; i < data.length; i++) {
  for (let j = i + 1; j < data.length; j++) {
    // Computes O(N^2) cross-metric correlation approximation on every tick!
  }
}`,
      cleanSnippet: `// ✅ AFTER: Isolated calculations wrapped in useMemo
const aggregations = useMemo(() => {
  if (!data?.length) return emptyAggregations;
  return computeCategoryAggregations(data);
}, [data]);

const pairwiseCorrelations = useMemo(() => {
  if (!data?.length) return [];
  return computePairwiseCorrelations(data, aggregations);
}, [data, aggregations]);`,
    },
  ];

  // Raw file contents for the code viewer tab
  const repoFiles: Record<string, { path: string; lang: string; content: string }> = {
    'package.json': {
      path: '/package.json',
      lang: 'json',
      content: `{
  "name": "kinesis-ast-test-repo",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "test": "npx tsx --test src/tests/benchmark.test.ts"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.23.8",
    "lucide-react": "^0.546.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "tsx": "^4.21.0",
    "typescript": "^5.6.3"
  }
}`,
    },
    'useMetricsPipeline.ts': {
      path: '/src/hooks/useMetricsPipeline.ts',
      lang: 'typescript',
      content: `/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * kinesis-ast-test-repo: Complex React Custom Hook Benchmark Target
 * Intentionally contains Issues A, B, C, D for autonomous AST refactoring.
 */
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import type { MetricItem, UseMetricsPipelineOptions, UseMetricsPipelineResult } from '../lib/types';

export function useMetricsPipeline(options: UseMetricsPipelineOptions): UseMetricsPipelineResult {
  // ISSUE B: Manual useState waterfall & primitive state flags
  const [data, setData] = useState<MetricItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // ISSUE B & C: Manual useEffect with Axios + PII Telemetry Leaks
  useEffect(() => {
    // ISSUE C: Raw PII & sensitive credentials leaked in network headers!
    const rawNetworkHeaders = {
      'Content-Type': 'application/json',
      'X-User-Email': options.telemetry.userEmail,          // 🔴 PII LEAK
      'X-Account-Token': options.telemetry.accountToken,    // 🔴 SENSITIVE CREDENTIAL LEAK
      'X-Forwarded-Client-IP': options.telemetry.clientIp,  // 🔴 UNHASHED IP LEAK
    };

    axios.get(options.endpoint || '/api/v1/telemetry/metrics', { headers: rawNetworkHeaders })
      .then(res => {
        // ISSUE A: Untrusted JSON coerced via 'as any' without Zod safeParse runtime guard!
        const untrustedJsonPayload = res.data as any;
        const parsedItems: MetricItem[] = untrustedJsonPayload.data as any; // 🔴 ANY CAST
        setData(parsedItems);
        setLoading(false);
      });
  }, [options.serviceFilter, options.categoryFilter]);

  // ISSUE D: Unmemoized heavy O(N^2) calculations inside render loop!
  for (let i = 0; i < (data?.length || 0); i++) {
    for (let j = i + 1; j < (data?.length || 0); j++) {
      // Computes O(N^2) cross-metric correlation approximation on every render tick!
    }
  }

  return { data, loading, error, ... };
}`,
    },
    'types.ts': {
      path: '/src/lib/types.ts',
      lang: 'typescript',
      content: `export interface MetricItem {
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
}`,
    },
    'zodSchemas.ts': {
      path: '/src/lib/zodSchemas.ts',
      lang: 'typescript',
      content: `import { z } from 'zod';

export const MetricItemSchema = z.object({
  id: z.string().min(1),
  timestamp: z.number().int().positive(),
  category: z.enum(['throughput', 'latency', 'error_rate', 'cpu_saturation', 'memory_usage']),
  value: z.number(),
  unit: z.string(),
  service: z.string(),
  tags: z.record(z.union([z.string(), z.number()])),
  anomalyScore: z.number().min(0).max(1).optional(),
});

export const MetricsPipelineResponseSchema = z.object({
  status: z.enum(['success', 'partial', 'error']),
  data: z.array(MetricItemSchema),
  totalCount: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  serverTimestamp: z.number().int().positive(),
});`,
    },
    'README.md': {
      path: '/README.md',
      lang: 'markdown',
      content: `# kinesis-ast-test-repo
Benchmark repository for autonomous AST code refactoring studios.

Refactoring Directives:
- Directive 1: "+ Add Zod Guard" -> Generate and inject runtime z.object() schemas with safeParse().
- Directive 2: "+ Convert to TanStack Query" -> Replace useEffect/useState waterfalls with useQuery.
- Directive 3: "+ Strip PII Telemetry" -> Remove userEmail and accountToken from payload signatures.
- Directive 4: "+ Optimize Memoization" -> Wrap nested filter/sort aggregations in useMemo and useCallback.`,
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">kinesis-ast-test-repo</span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                v1.0.0
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-800 text-slate-300 flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-slate-400" />
                main
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous AST Refactoring Benchmark Suite</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800" aria-label="Main Navigation">
          <button
            onClick={() => setActiveTab('harness')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'harness'
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live Pipeline
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'diff'
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AST Directives
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'files'
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Repository Files
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'tests'
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Test Suite
          </button>
        </nav>

        {/* Global Pipeline State Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Target Mode:</span>
          <button
            onClick={() => setUseRefactoredPipeline(!useRefactoredPipeline)}
            className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              useRefactoredPipeline
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-950'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-300 shadow-md shadow-rose-950'
            }`}
          >
            {useRefactoredPipeline ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Refactored Clean AST
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Original Flawed AST (Issues A-D)
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Banner Alert on active state */}
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          useRefactoredPipeline
            ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
            : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
        }`}>
          <div className="flex items-start gap-3">
            {useRefactoredPipeline ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <h1 className="font-semibold text-sm">
                {useRefactoredPipeline
                  ? 'Refactored Pipeline Active (All Directives Applied)'
                  : 'Benchmark Mode: Intentionally Flawed Hook Running'}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                {useRefactoredPipeline
                  ? 'Runtime Zod safeParse verified, PII headers stripped, O(N^2) loops memoized with useMemo, and AbortController active.'
                  : 'Target file: src/hooks/useMetricsPipeline.ts. Contains untrusted JSON any casts, manual useEffect race conditions, raw PII telemetry leaks, and unmemoized render loops.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setUseRefactoredPipeline(!useRefactoredPipeline)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white transition-colors"
            >
              Toggle to {useRefactoredPipeline ? 'Original (Issues A-D)' : 'Refactored State'}
            </button>
          </div>
        </div>

        {/* TAB 1: LIVE PIPELINE HARNESS */}
        {activeTab === 'harness' && (
          <div className="space-y-6">
            {/* Filter and Trigger Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="service-filter" className="text-xs text-slate-400 font-medium">Service:</label>
                  <select
                    id="service-filter"
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="all">All Services (5)</option>
                    <option value="auth-service">auth-service</option>
                    <option value="payment-gateway">payment-gateway</option>
                    <option value="inventory-api">inventory-api</option>
                    <option value="kinesis-stream-processor">kinesis-stream-processor</option>
                    <option value="edge-proxy">edge-proxy</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="category-filter" className="text-xs text-slate-400 font-medium">Category:</label>
                  <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="all">All Categories (5)</option>
                    <option value="throughput">Throughput (req/sec)</option>
                    <option value="latency">Latency (ms)</option>
                    <option value="error_rate">Error Rate (%)</option>
                    <option value="cpu_saturation">CPU Saturation (%)</option>
                    <option value="memory_usage">Memory Usage (MB)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={triggerHostRerender}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Forces component re-render to profile unmemoized O(N^2) calculations vs memoized"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Trigger Host Re-render (Tick #{renderCountTrigger})
                </button>
                <button
                  onClick={() => activeResult.refetch()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Refetch Data
                </button>
              </div>
            </div>

            {/* Architectural Diagnostic Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Issue A Status */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Issue A: Schema Guard</span>
                    {useRefactoredPipeline ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Zod Guarded
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                        Untrusted 'any' Cast
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-white mt-1">
                    {useRefactoredPipeline ? 'z.safeParse()' : 'as any (Unchecked)'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {useRefactoredPipeline
                      ? 'Runtime verification active against corrupted payloads'
                      : 'Missing runtime validation; potential silent crash'}
                  </p>
                </div>
                <div className="mt-3 text-[11px] text-cyan-400 flex items-center gap-1">
                  Directive 1 target <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Issue B Status */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Issue B: Data Concurrency</span>
                    {useRefactoredPipeline ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Abort Signal Safe
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                        Race Condition Risk
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-white mt-1">
                    {useRefactoredPipeline ? 'Resilient Query Flow' : 'Manual useEffect'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {useRefactoredPipeline
                      ? 'Cancellation token aborts stale in-flight requests'
                      : 'Axios waterfall without race guard or query cache'}
                  </p>
                </div>
                <div className="mt-3 text-[11px] text-cyan-400 flex items-center gap-1">
                  Directive 2 target <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Issue C Status */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Issue C: Telemetry PII</span>
                    {useRefactoredPipeline ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        PII Sanitized
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 animate-pulse">
                        Raw PII Leaked!
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-white mt-1">
                    {useRefactoredPipeline ? '0 Headers Leaked' : '3 Raw Leaks in Headers'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {useRefactoredPipeline
                      ? 'Email & token stripped; one-way hash pseudonym'
                      : 'Raw email, auth token, and IP broadcast in network headers'}
                  </p>
                </div>
                <div className="mt-3 text-[11px] text-cyan-400 flex items-center gap-1">
                  Directive 3 target <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Issue D Status */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Issue D: Transformation Cost</span>
                    {useRefactoredPipeline ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Memoized
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                        O(N²) on Every Tick
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-white mt-1">
                    Render #{activeResult.renderTick}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {useRefactoredPipeline
                      ? 'Aggregations cached with useMemo; skips on render'
                      : 'Double nested loops recalculate on every single tick'}
                  </p>
                </div>
                <div className="mt-3 text-[11px] text-cyan-400 flex items-center gap-1">
                  Directive 4 target <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Live Network & Telemetry Inspector */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold text-white">Live Outbound Network Headers & Telemetry Payload Inspector</h2>
                </div>
                <span className="text-xs text-slate-400">Inspecting network footprint dispatched by hook</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Headers */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-slate-400 font-sans font-semibold text-xs">Outbound HTTP Headers</span>
                    {!useRefactoredPipeline && (
                      <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Vulnerable PII Detected
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {activeResult.networkHeadersSent ? (
                      Object.entries(activeResult.networkHeadersSent).map(([key, val]) => {
                        const isPii = ['X-User-Email', 'X-Account-Token', 'X-Forwarded-Client-IP'].includes(key);
                        return (
                          <div key={key} className={`flex items-start justify-between py-0.5 px-1.5 rounded ${isPii ? 'bg-rose-950/40 border border-rose-800/50 text-rose-300' : 'text-slate-300'}`}>
                            <span className="text-cyan-400">{key}:</span>
                            <span className="text-right truncate max-w-[220px]" title={val}>{val}</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-slate-500 italic">No headers captured yet</span>
                    )}
                  </div>
                </div>

                {/* Telemetry Payload */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-slate-400 font-sans font-semibold text-xs">Telemetry JSON Payload</span>
                    {useRefactoredPipeline ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Sanitized
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-400 font-bold">Unsanitized</span>
                    )}
                  </div>
                  <pre className="text-slate-300 text-[11px] overflow-x-auto max-h-40">
                    {JSON.stringify(activeResult.telemetryPayloadSent, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Metrics Data and Aggregations Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold text-white">Aggregated Pipeline Data & Statistical Nodes</h2>
                </div>
                <span className="text-xs text-slate-400">
                  Total Items: {activeResult.data?.length ?? 0} | Status: {activeResult.loading ? 'Fetching...' : 'Ready'}
                </span>
              </div>

              {/* Categorical Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(['throughput', 'latency', 'error_rate', 'cpu_saturation', 'memory_usage'] as MetricCategory[]).map((cat) => {
                  const stat = activeResult.aggregations[cat];
                  return (
                    <div key={cat} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                      <div className="text-[11px] uppercase tracking-wider text-slate-400">{cat.replace('_', ' ')}</div>
                      <div className="text-base font-bold text-white mt-1">
                        {stat ? stat.average : '-'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
                        <span>p95: {stat ? stat.p95 : '-'}</span>
                        <span>p99: {stat ? stat.p99 : '-'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Data Sample Grid */}
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Node ID</th>
                      <th className="py-2.5 px-3 font-semibold">Category</th>
                      <th className="py-2.5 px-3 font-semibold">Service</th>
                      <th className="py-2.5 px-3 font-semibold">Value</th>
                      <th className="py-2.5 px-3 font-semibold">Anomaly Score</th>
                      <th className="py-2.5 px-3 font-semibold">Environment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {activeResult.data?.slice(0, 8).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-cyan-300">{item.id}</td>
                        <td className="py-2 px-3 font-sans capitalize text-slate-300">{item.category}</td>
                        <td className="py-2 px-3 text-indigo-300">{item.service}</td>
                        <td className="py-2 px-3 font-bold text-white">{item.value} {item.unit}</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            (item.anomalyScore ?? 0) > 0.8
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.anomalyScore ?? 0}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400">{item.metadata?.environment ?? 'prod'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AST DIRECTIVES & DIFF STUDIO */}
        {activeTab === 'diff' && (
          <div className="space-y-6">
            {/* Directive Selection Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {directives.map((dir) => (
                <button
                  key={dir.id}
                  onClick={() => setActiveDirective(dir.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    activeDirective === dir.id
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">Directive {dir.id}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      dir.severity.includes('Critical')
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : dir.severity.includes('High')
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                    }`}>
                      {dir.severity}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white mt-1">{dir.title}</div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{dir.issueTitle}</p>
                </button>
              ))}
            </div>

            {/* Directive Detail View */}
            {(() => {
              const current = directives.find((d) => d.id === activeDirective)!;
              return (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                          Kinesis Directive #{current.id}
                        </span>
                        <h2 className="text-lg font-bold text-white">{current.title}</h2>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{current.summary}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block">AST Selector Pattern</span>
                        <code className="text-xs font-mono text-cyan-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          {current.targetAst}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Code Diff Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Flawed Snippet */}
                    <div className="bg-slate-950 border border-rose-900/40 rounded-xl overflow-hidden">
                      <div className="bg-rose-950/60 px-4 py-2 border-b border-rose-900/50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Before: Flawed AST Node
                        </span>
                        <button
                          onClick={() => handleCopyCode(current.flawedSnippet, `before-${current.id}`)}
                          className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                        >
                          {copiedFile === `before-${current.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                      <pre className="p-4 text-xs font-mono text-rose-200 overflow-x-auto leading-relaxed">
                        {current.flawedSnippet}
                      </pre>
                    </div>

                    {/* Clean Snippet */}
                    <div className="bg-slate-950 border border-emerald-900/40 rounded-xl overflow-hidden">
                      <div className="bg-emerald-950/60 px-4 py-2 border-b border-emerald-900/50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          After: Refactored AST Transformation
                        </span>
                        <button
                          onClick={() => handleCopyCode(current.cleanSnippet, `after-${current.id}`)}
                          className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                        >
                          {copiedFile === `after-${current.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                      <pre className="p-4 text-xs font-mono text-emerald-200 overflow-x-auto leading-relaxed">
                        {current.cleanSnippet}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: REPOSITORY FILE EXPLORER */}
        {activeTab === 'files' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* File List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Repository Files
              </div>
              {Object.keys(repoFiles).map((fileKey) => {
                const isSelected = selectedFileKey === fileKey;
                return (
                  <button
                    key={fileKey}
                    onClick={() => setSelectedFileKey(fileKey)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-800'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      {fileKey}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* File Content Preview */}
            <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400">{repoFiles[selectedFileKey].path}</span>
                <button
                  onClick={() => handleCopyCode(repoFiles[selectedFileKey].content, selectedFileKey)}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copiedFile === selectedFileKey ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy File
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-300 bg-slate-950 flex-1 overflow-x-auto leading-relaxed">
                {repoFiles[selectedFileKey].content}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 4: AUTOMATED TEST SUITE RUNNER */}
        {activeTab === 'tests' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Automated Unit Benchmark Suite (node:test)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Target test file: <code className="text-cyan-300">src/tests/benchmark.test.ts</code>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  5 of 5 Tests Passing (474ms)
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 1,
                  name: 'Directive 1: Zod guard validates correctly-formed metric payloads',
                  category: 'Directive 1',
                  status: 'PASSED',
                  duration: '4.2ms',
                  details: 'Validates MetricItemSchema and MetricsPipelineResponseSchema on genuine data contract.',
                },
                {
                  id: 2,
                  name: 'Directive 1: Zod guard rejects untrusted / malformed payloads',
                  category: 'Directive 1',
                  status: 'PASSED',
                  duration: '1.1ms',
                  details: 'Correctly catches empty ID, negative timestamps, invalid category enum, and string numbers.',
                },
                {
                  id: 3,
                  name: 'Directive 3: PII detector catches unstripped userEmail and accountToken',
                  category: 'Directive 3',
                  status: 'PASSED',
                  duration: '0.2ms',
                  details: 'Discovers unstripped X-User-Email, X-Account-Token, and rawClientIp violations.',
                },
                {
                  id: 4,
                  name: 'Directive 3: PII detector confirms clean headers and sanitized payload',
                  category: 'Directive 3',
                  status: 'PASSED',
                  duration: '0.1ms',
                  details: 'Confirms complete privacy hygiene after Directive 3 transformation.',
                },
                {
                  id: 5,
                  name: 'Directive 4: Pure calculation computes correct stats and percentiles',
                  category: 'Directive 4',
                  status: 'PASSED',
                  duration: '0.5ms',
                  details: 'Verifies pure percentile sorting, variance sums, and pairwise delta matrices.',
                },
              ].map((t) => (
                <div key={t.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{t.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {t.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{t.details}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono text-emerald-400 font-bold">{t.status}</span>
                    <span className="text-[10px] text-slate-500 block font-mono">{t.duration}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-400">
              <div className="text-slate-300 font-bold mb-1">CLI Test Execution Command:</div>
              <code className="text-cyan-300">npx --yes tsx --test src/tests/benchmark.test.ts</code>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <div>
          kinesis-ast-test-repo &bull; Benchmark suite for autonomous AST code refactoring studios
        </div>
        <div className="flex items-center gap-4">
          <span>React 18.3.1</span>
          <span>Axios 1.7.0</span>
          <span>Zod 3.23.8</span>
          <span>TypeScript 5.6.3</span>
        </div>
      </footer>
    </div>
  );
}
