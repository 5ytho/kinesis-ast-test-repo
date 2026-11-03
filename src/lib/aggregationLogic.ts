/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pure mathematical routines for metric aggregation and correlation analysis.
 * Decoupled from React lifecycle for deterministic unit testing.
 */

import type { MetricItem, MetricCategory, AggregatedMetric } from './types';

export function calculateCategoryStats(
  items: MetricItem[],
  category: MetricCategory
): AggregatedMetric | null {
  const itemsInCat = items.filter((m) => m.category === category);
  if (itemsInCat.length === 0) return null;

  const sum = itemsInCat.reduce((acc, curr) => acc + curr.value, 0);
  const avg = sum / itemsInCat.length;

  const sortedValues = itemsInCat.map((m) => m.value).sort((a, b) => a - b);
  const p95Index = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * 0.95));
  const p99Index = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * 0.99));

  const varianceSum = itemsInCat.reduce((acc, curr) => acc + Math.pow(curr.value - avg, 2), 0);
  const variance = varianceSum / itemsInCat.length;

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

  return {
    category,
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

export function detectPiiLeak(
  headers: Record<string, string>,
  payload: Record<string, unknown>
): { hasPii: boolean; violations: string[] } {
  const violations: string[] = [];

  if (headers['X-User-Email']) {
    violations.push('Found raw X-User-Email header');
  }
  if (headers['X-Account-Token']) {
    violations.push('Found raw X-Account-Token header');
  }
  if (headers['X-Forwarded-Client-IP']) {
    violations.push('Found unhashed X-Forwarded-Client-IP header');
  }

  if (payload.userEmail) {
    violations.push('Found raw userEmail field in payload');
  }
  if (payload.accountToken) {
    violations.push('Found raw accountToken credential in payload');
  }
  if (payload.rawClientIp) {
    violations.push('Found unhashed rawClientIp in payload');
  }

  return {
    hasPii: violations.length > 0,
    violations,
  };
}
