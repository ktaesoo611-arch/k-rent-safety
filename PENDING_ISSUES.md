# Pending Issues

## IQR Outlier Removal for Dong-Level Data

**Date:** 2025-12-22

**Status:** In Progress

### Problem

IQR outlier removal is implemented but ineffective for dong-level data because the variance is naturally high, making IQR bounds too wide.

**Example from logs:**
```
Deposit: Q1=10000만 Q3=54000만 IQR=44000만
Deposit bounds: -56000만 ~ 120000만
Rent: Q1=120만 Q3=254만 IQR=134만
Rent bounds: -81만 ~ 455만
Min/Max Deposit: 200만 ~ 97000만
Min/Max Rent: 30만 ~ 440만
Outlier removal: 84 → 84 (0 outliers removed)
```

All data falls within the wide IQR bounds, so no outliers are detected.

### Current State

- IQR code is implemented and working in `lib/analyzers/wolse-rate-calculator.ts`
- Uses standard 1.5×IQR multiplier
- Works for building-specific data (narrow variance)
- Ineffective for dong-level data (wide variance)
- Market rate shows 3.67% with 84 transactions, 0 outliers removed

### Proposed Solution

Use tighter multiplier for dong-level data:
- Building-level: Keep 1.5×IQR (standard)
- Dong-level: Use 1.0×IQR (more aggressive filtering)

### Files to Modify

- `lib/analyzers/wolse-rate-calculator.ts`
  - Pass `dataSource` to `removeOutliers()` method
  - Adjust multiplier based on data source level

### Implementation Sketch

```typescript
private removeOutliers(
  transactions: WolseTransaction[],
  dataSource: 'building' | 'dong' | 'district' = 'building'
): { clean: WolseTransaction[]; removed: WolseTransaction[] } {
  // Use tighter bounds for dong/district level data
  const multiplier = dataSource === 'building' ? 1.5 : 1.0;

  const depositLower = q1Deposit - multiplier * iqrDeposit;
  const depositUpper = q3Deposit + multiplier * iqrDeposit;
  // ... same for rent
}
```

### Notes

- Debug logging is currently enabled in `removeOutliers()` - can be removed after fixing
- The `wolse-price-analyzer.ts` also has its own `removeOutliers()` method that may need similar adjustment
