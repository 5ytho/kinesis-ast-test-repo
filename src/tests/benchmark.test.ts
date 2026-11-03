/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Unit tests verifying Kinesis AST Refactoring benchmark contracts,
 * Zod runtime schemas, PII leak detectors, and aggregation logic.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { MetricItemSchema, MetricsPipelineResponseSchema } from '../lib/zodSchemas';
import { calculateCategoryStats, detectPiiLeak } from '../lib/aggregationLogic';
import type { MetricItem } from '../lib/types';

test('Directive 1: Zod guard validates correctly-formed metric payloads', () => {
  const validPayload = {
    status: 'success',
    data: [
      {
        id: 'metric-001',
        timestamp: 1730000000000,
        category: 'latency',
        value: 45.2,
        unit: 'ms',
        service: 'api-gateway',
        tags: { cluster: 'us-east-1', priority: 'high' },
        anomalyScore: 0.15,
        metadata: {
          region: 'us-east-1',
          clusterId: 'c1',
          environment: 'production',
        },
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 1,
    serverTimestamp: 1730000000000,
  };

  const parsed = MetricsPipelineResponseSchema.safeParse(validPayload);
  assert.equal(parsed.success, true);
});

test('Directive 1: Zod guard rejects untrusted / malformed payloads', () => {
  const malformedPayload = {
    status: 'success',
    data: [
      {
        id: '', // empty id violates schema
        timestamp: -500, // negative timestamp invalid
        category: 'invalid_category_xyz', // not an allowed enum
        value: 'not-a-number', // string instead of number
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 1,
    serverTimestamp: 1730000000000,
  };

  const parsed = MetricsPipelineResponseSchema.safeParse(malformedPayload);
  assert.equal(parsed.success, false);
});

test('Directive 3: PII detector catches unstripped userEmail and accountToken', () => {
  const leakingHeaders = {
    'X-User-Email': 'engineer@company.com',
    'X-Account-Token': 'secret_bearer_token_xyz',
  };
  const leakingPayload = {
    userEmail: 'engineer@company.com',
    accountToken: 'secret_bearer_token_xyz',
  };

  const result = detectPiiLeak(leakingHeaders, leakingPayload);
  assert.equal(result.hasPii, true);
  assert.equal(result.violations.length >= 4, true);
});

test('Directive 3: PII detector confirms clean headers and sanitized payload', () => {
  const cleanHeaders = {
    'Content-Type': 'application/json',
    'X-Client-Session-Id': 'sess-12345',
  };
  const cleanPayload = {
    telemetryVersion: '2.4.0',
    anonymizedHash: 'sha256_abcdef12',
    timestamp: 1730000000000,
  };

  const result = detectPiiLeak(cleanHeaders, cleanPayload);
  assert.equal(result.hasPii, false);
  assert.equal(result.violations.length, 0);
});

test('Directive 4: Pure calculation computes correct stats and percentiles', () => {
  const items: MetricItem[] = [
    { id: '1', timestamp: 1000, category: 'latency', value: 10, unit: 'ms', service: 'svc', tags: {} },
    { id: '2', timestamp: 1001, category: 'latency', value: 20, unit: 'ms', service: 'svc', tags: {} },
    { id: '3', timestamp: 1002, category: 'latency', value: 30, unit: 'ms', service: 'svc', tags: {} },
    { id: '4', timestamp: 1003, category: 'latency', value: 40, unit: 'ms', service: 'svc', tags: {} },
    { id: '5', timestamp: 1004, category: 'latency', value: 50, unit: 'ms', service: 'svc', tags: {} },
  ];

  const stats = calculateCategoryStats(items, 'latency');
  assert.ok(stats);
  assert.equal(stats.count, 5);
  assert.equal(stats.sum, 150);
  assert.equal(stats.average, 30);
  assert.equal(stats.min, 10);
  assert.equal(stats.max, 50);
  assert.equal(stats.pairwiseDeltas.length, 10); // 5 choose 2
});
