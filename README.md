# kinesis-ast-test-repo

Benchmark and testing repository designed for autonomous AST (Abstract Syntax Tree) code refactoring studios and code intelligence agents.

This repository features `src/hooks/useMetricsPipeline.ts`, a complex production-style React custom hook engineered with **four deliberate architectural anti-patterns**. It provides clear AST transformation targets for testing autonomous code refactoring tools.

---

## 🎯 Target Directives & Architectural Issues

| Directive | AST Target Issue | Severity | Transformation Summary |
|---|---|---|---|
| **`+ Add Zod Guard`** | **Issue A**: Missing Zod Schema Validation | 🔴 Critical Security / Reliability | Replace unsafe `as any` casts with `z.object()` schema and `.safeParse()`. |
| **`+ Convert to TanStack Query`** | **Issue B**: Manual `useEffect` + `axios` Waterfall | 🟠 High Architecture / Concurrency | Migrate `useEffect`/`useState` state waterfalls to TanStack Query `useQuery({ queryKey, queryFn })`. |
| **`+ Strip PII Telemetry`** | **Issue C**: PII Telemetry Leaks | 🔴 Critical Privacy / Compliance | Strip raw `userEmail`, `accountToken`, and unhashed IP from headers and telemetry payloads. |
| **`+ Optimize Memoization`** | **Issue D**: Unmemoized $O(N^2)$ Render Loops | 🟡 Performance Degradation | Wrap nested category aggregations and pairwise correlation matrices in `useMemo` & `useCallback`. |

---

## 🛠️ Refactoring Directives Specification

### Directive 1: `+ Add Zod Guard`
**Problem Statement (Issue A):**
In `src/hooks/useMetricsPipeline.ts`, raw network response data is coerced into TypeScript interfaces via unsafe `as any` and `as MetricItem[]` casts without runtime shape validation. If an upstream API returns malformed values or missing fields, unhandled runtime crashes occur.

```typescript
// ❌ BEFORE (Unsafe Cast)
const untrustedJsonPayload = rawResponseData as any;
const parsedItems: MetricItem[] = untrustedJsonPayload.data as any;
```

**Refactored Target (Safe Schema Guard):**
```typescript
// ✅ AFTER (Zod safeParse Runtime Guard)
import { z } from 'zod';

export const MetricItemSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  category: z.enum(['throughput', 'latency', 'error_rate', 'cpu_saturation', 'memory_usage']),
  value: z.number(),
  unit: z.string(),
  service: z.string(),
  tags: z.record(z.union([z.string(), z.number()])),
  anomalyScore: z.number().optional(),
  metadata: z.object({
    region: z.string(),
    clusterId: z.string(),
    environment: z.enum(['production', 'staging', 'canary']),
  }).optional(),
});

export const MetricsPipelineResponseSchema = z.object({
  status: z.enum(['success', 'partial', 'error']),
  data: z.array(MetricItemSchema),
  totalCount: z.number(),
  page: z.number(),
  pageSize: z.number(),
  serverTimestamp: z.number(),
});

// AST Transform applied to hook:
const validationResult = MetricsPipelineResponseSchema.safeParse(rawResponseData);
if (!validationResult.success) {
  throw new Error(`Schema validation failed: ${validationResult.error.message}`);
}
const parsedItems = validationResult.data.data;
```

---

### Directive 2: `+ Convert to TanStack Query`
**Problem Statement (Issue B):**
The hook uses manual `useState` flags (`loading`, `error`, `data`, `fetchTrigger`), manual `useEffect` with raw `axios.get`, and is susceptible to race conditions and request cascades upon rapid filter changes.

```typescript
// ❌ BEFORE (Manual State & useEffect Waterfall)
const [data, setData] = useState<MetricItem[] | null>(null);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  setLoading(true);
  let isCancelled = false;
  axios.get(targetUrl, { ... }).then(res => {
    if (!isCancelled) setData(res.data.data);
  });
  return () => { isCancelled = true; };
}, [options.serviceFilter, options.categoryFilter]);
```

**Refactored Target (TanStack Query v5):**
```typescript
// ✅ AFTER (TanStack Query v5 useQuery)
import { useQuery } from '@tanstack/react-query';

const {
  data: metricsData,
  isLoading,
  error: queryError,
  refetch,
} = useQuery({
  queryKey: ['metrics-pipeline', options.serviceFilter, options.categoryFilter, options.timeRangeMs],
  queryFn: async ({ signal }) => {
    const res = await axios.get(options.endpoint || '/api/v1/telemetry/metrics', {
      signal, // Automatic abort signal on unmount or key change
      params: {
        service: options.serviceFilter,
        category: options.categoryFilter,
      },
    });
    return MetricsPipelineResponseSchema.parse(res.data).data;
  },
  staleTime: 30_000,
  gcTime: 5 * 60_000,
});
```

---

### Directive 3: `+ Strip PII Telemetry`
**Problem Statement (Issue C):**
The hook leaks sensitive Personally Identifiable Information (PII) including raw user emails, unhashed client IP addresses, and secret account/API tokens across network request headers (`X-User-Email`, `X-Account-Token`, `X-Forwarded-Client-IP`) and telemetry JSON payloads.

```typescript
// ❌ BEFORE (PII Leaks)
const rawNetworkHeaders: Record<string, string> = {
  'X-User-Email': options.telemetry.userEmail,          // 🔴 PII LEAK
  'X-Account-Token': options.telemetry.accountToken,    // 🔴 SENSITIVE CREDENTIAL LEAK
  'X-Forwarded-Client-IP': options.telemetry.clientIp,  // 🔴 UNHASHED IP LEAK
};
```

**Refactored Target (Sanitized Pseudonymous Telemetry):**
```typescript
// ✅ AFTER (Sanitized & Hashed Identifiers)
import { createHash } from 'crypto'; // or client SHA-256

const sanitizedHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Client-Session-Id': options.telemetry.sessionId,
  'X-Organization-Id': options.telemetry.organizationId,
  // Sensitive identifiers stripped or replaced with one-way SHA-256 hashes
};

const safeTelemetryPayload = {
  telemetryVersion: '2.4.0',
  actorHash: options.telemetry.userEmail ? hashSha256(options.telemetry.userEmail) : undefined,
  tokenPresent: Boolean(options.telemetry.accountToken),
  clientTimestamp: Date.now(),
};
```

---

### Directive 4: `+ Optimize Memoization`
**Problem Statement (Issue D):**
On every render of the host component, the hook executes heavy nested loops:
1. $O(N \log N)$ sorting and statistical quartile reductions per metric category.
2. An $O(N^2)$ double loop computing pairwise Pearson correlation approximations and Euclidean deltas across all metric nodes.
Neither `useMemo` nor `useCallback` is utilized, triggering UI stutters on frequent re-renders.

```typescript
// ❌ BEFORE (Unmemoized Render Computation)
for (const cat of categories) {
  const sortedValues = itemsInCat.map(m => m.value).sort((a, b) => a - b);
  // ...
}
for (let i = 0; i < data.length; i++) {
  for (let j = i + 1; j < data.length; j++) {
    // Heavy O(N^2) correlation math on every tick
  }
}
```

**Refactored Target (useMemo Isolation):**
```typescript
// ✅ AFTER (useMemo Isolation)
import { useMemo, useCallback } from 'react';

const aggregations = useMemo(() => {
  if (!data || data.length === 0) return emptyAggregations;
  return computeCategoryAggregations(data);
}, [data]);

const pairwiseCorrelations = useMemo(() => {
  if (!data || data.length === 0) return [];
  return computePairwiseCorrelations(data, aggregations);
}, [data, aggregations]);

const refetch = useCallback(() => {
  // stable callback
}, []);
```

---

## 🚀 Running the Benchmark Studio Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch Interactive Benchmark Studio
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to inspect:
- Live `useMetricsPipeline` execution and state monitor.
- Interactive AST Directive Simulator with side-by-side diffs.
- Real-time PII Telemetry Leak Inspector.
- Re-render tick profiler measuring unmemoized vs memoized computational cost.

### 3. Run Validation Tests
```bash
npm test
# Or using the built-in runner:
npx --yes tsx --test src/tests/benchmark.test.ts
```

---

## 📁 Repository Structure

```
kinesis-ast-test-repo/
├── src/
│   ├── hooks/
│   │   ├── useMetricsPipeline.ts       # Primary benchmark hook containing Issues A-D
│   │   └── useMetricsPipeline.clean.ts # Reference refactored clean implementation
│   ├── lib/
│   │   ├── types.ts                    # Baseline TypeScript interfaces & contracts
│   │   └── zodSchemas.ts               # Reference Zod runtime validation schemas
│   ├── tests/
│   │   └── benchmark.test.ts           # Automated node:test verification suite
│   ├── App.tsx                         # Interactive AST Benchmark Studio GUI
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
└── README.md
```
