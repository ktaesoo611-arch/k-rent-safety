'use client';

import { useState } from 'react';
import { WolseAnalysisResult, WolseNegotiationOption } from '@/lib/types';

interface WolseResultsDisplayProps {
  result: WolseAnalysisResult;
  onNewAnalysis?: () => void;
}

export function WolseResultsDisplay({ result, onNewAnalysis }: WolseResultsDisplayProps) {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Calculate fallback values if new fields are missing (for older data)
  console.log('WolseResultsDisplay - result.expectedRent:', result.expectedRent);
  console.log('WolseResultsDisplay - result.rentDifference:', result.rentDifference);
  const expectedRent = result.expectedRent ?? result.userMonthlyRent;
  const rentDifference = result.rentDifference ?? 0;
  const rentDifferencePercent = result.rentDifferencePercent ?? 0;
  console.log('WolseResultsDisplay - using expectedRent:', expectedRent);

  const copyToClipboard = (text: string, optionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(optionName);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  // Assessment color and icon
  const getAssessmentStyle = (assessment: string) => {
    switch (assessment) {
      case 'GOOD_DEAL':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          icon: '🎉',
          label: 'Great Deal!'
        };
      case 'FAIR':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: '✓',
          label: 'Fair Price'
        };
      case 'OVERPRICED':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          icon: '⚠️',
          label: 'Above Market'
        };
      case 'SEVERELY_OVERPRICED':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: '🚨',
          label: 'Significantly Overpriced'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          icon: '?',
          label: 'Unknown'
        };
    }
  };

  const assessmentStyle = getAssessmentStyle(result.assessment);

  // Format currency
  const formatWon = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toLocaleString()}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  // Trend icon
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'RISING': return '📈';
      case 'DECLINING': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="space-y-8">
      {/* Assessment Banner */}
      <div className={`rounded-3xl p-8 ${assessmentStyle.bg} ${assessmentStyle.border} border-2`}>
        <div className="flex items-start gap-4">
          <span className="text-4xl">{assessmentStyle.icon}</span>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold mb-2 ${assessmentStyle.text}`}>
              {assessmentStyle.label}
            </h2>
            <p className="text-[#4A5568] text-lg leading-relaxed">
              {result.assessmentDetails}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics - Rent Comparison */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Your Rent */}
        <div className="bg-white rounded-3xl p-6 text-center shadow-xl shadow-amber-900/5 border border-amber-100">
          <p className="text-sm text-[#718096] mb-2">Your Rent</p>
          <p className="text-3xl font-bold text-[#1A202C]">{formatWon(result.userMonthlyRent)}</p>
          <p className="text-sm text-[#718096] mt-2">
            at {formatWon(result.userDeposit)} deposit
          </p>
        </div>

        {/* Expected Rent (Market) */}
        <div className="bg-white rounded-3xl p-6 text-center shadow-xl shadow-amber-900/5 border border-amber-100">
          <p className="text-sm text-[#718096] mb-2">Expected Rent (Market)</p>
          <p className="text-3xl font-bold text-amber-600">{formatWon(expectedRent)}</p>
          <p className="text-sm text-[#718096] mt-2">
            at {result.marketRate.toFixed(1)}% market rate
          </p>
        </div>

        {/* Difference */}
        <div className={`rounded-3xl p-6 text-center shadow-xl shadow-amber-900/5 border ${
          rentDifference <= 0
            ? 'bg-emerald-50 border-emerald-200'
            : rentDifference > 0 && rentDifferencePercent <= 5
            ? 'bg-blue-50 border-blue-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <p className="text-sm text-[#718096] mb-2">Difference</p>
          <p className={`text-3xl font-bold ${
            rentDifference <= 0
              ? 'text-emerald-600'
              : rentDifference > 0 && rentDifferencePercent <= 5
              ? 'text-blue-600'
              : 'text-red-600'
          }`}>
            {rentDifference >= 0 ? '+' : ''}{formatWon(rentDifference)}
          </p>
          <p className="text-sm text-[#718096] mt-2">
            {rentDifferencePercent >= 0 ? '+' : ''}{rentDifferencePercent.toFixed(1)}% vs expected
          </p>
        </div>
      </div>

      {/* Market Rate Info */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-amber-900/5 border border-amber-100">
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-sm text-[#718096] mb-1">Market Rate</p>
            <p className="text-xl font-bold text-[#1A202C]">{result.marketRate.toFixed(2)}%</p>
            <p className="text-xs text-[#A0AEC0]">Range: {result.marketRateRange.low.toFixed(1)}%-{result.marketRateRange.high.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-[#718096] mb-1">Legal Maximum</p>
            <p className="text-xl font-bold text-blue-600">{result.legalRate.toFixed(2)}%</p>
            <p className="text-xs text-[#A0AEC0]">Housing Lease Protection Act</p>
          </div>
          <div>
            <p className="text-sm text-[#718096] mb-1">Data Quality</p>
            <p className="text-xl font-bold text-[#1A202C]">{result.confidenceLevel}</p>
            <p className="text-xs text-[#A0AEC0]">
              {result.dataSourceNote || `${result.cleanTransactionCount || result.contractCount} transactions`}
              {result.outliersRemoved ? ` (${result.outliersRemoved} outliers removed)` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Savings Potential */}
      {(result.savingsPotential.vsMarket > 0 || result.savingsPotential.vsLegal > 0) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200">
          <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
            <span>💰</span> Potential Savings
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {result.savingsPotential.vsMarket > 0 && (
              <div>
                <p className="text-sm text-[#4A5568]">If negotiated to market rate:</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatWon(result.savingsPotential.vsMarket)}/year
                </p>
              </div>
            )}
            {result.savingsPotential.vsLegal > 0 && (
              <div>
                <p className="text-sm text-[#4A5568]">If negotiated to legal max:</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatWon(result.savingsPotential.vsLegal)}/year
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Market Trend */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-amber-900/5 border border-amber-100">
        <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
          <span>{getTrendIcon(result.trend.direction)}</span> Market Trend
        </h3>
        <p className="text-[#4A5568] leading-relaxed">{result.trend.advice}</p>
        <div className="mt-4 flex items-center gap-4 text-sm text-[#718096]">
          <span>Direction: <strong className="text-[#1A202C]">{result.trend.direction}</strong></span>
          <span>Change: <strong className="text-[#1A202C]">{result.trend.percentage.toFixed(1)}%</strong> over 6 months</span>
        </div>
      </div>

      {/* Negotiation Options */}
      {result.negotiationOptions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#1A202C] flex items-center gap-2">
            <span>🤝</span> Negotiation Options
          </h3>
          <p className="text-[#4A5568]">
            Use these scripts when negotiating with your landlord. Click to copy.
          </p>

          {result.negotiationOptions.map((option, index) => (
            <NegotiationOptionCard
              key={index}
              option={option}
              userDeposit={result.userDeposit}
              copied={copiedScript === option.name}
              onCopy={() => copyToClipboard(option.script, option.name)}
            />
          ))}
        </div>
      )}

      {/* Recent Transactions */}
      {result.recentTransactions.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-amber-900/5 border border-amber-100">
          <h3 className="text-lg font-bold text-[#1A202C] mb-4 flex items-center gap-2">
            <span>📊</span> Recent Transactions ({result.contractCount} contracts)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-amber-200">
                  <th className="text-left py-3 px-3 font-semibold text-[#4A5568]">Date</th>
                  <th className="text-left py-3 px-3 font-semibold text-[#4A5568]">Area</th>
                  <th className="text-left py-3 px-3 font-semibold text-[#4A5568]">Floor</th>
                  <th className="text-right py-3 px-3 font-semibold text-[#4A5568]">Deposit</th>
                  <th className="text-right py-3 px-3 font-semibold text-[#4A5568]">Monthly Rent</th>
                </tr>
              </thead>
              <tbody>
                {result.recentTransactions.slice(0, 10).map((tx, index) => (
                  <tr key={index} className="border-b border-amber-100 hover:bg-amber-50/50">
                    <td className="py-3 px-3 text-[#4A5568]">
                      {tx.year}.{tx.month.toString().padStart(2, '0')}.{tx.day.toString().padStart(2, '0')}
                    </td>
                    <td className="py-3 px-3 text-[#4A5568]">{tx.exclusiveArea.toFixed(1)}㎡</td>
                    <td className="py-3 px-3 text-[#4A5568]">{tx.floor}F</td>
                    <td className="py-3 px-3 text-right text-[#1A202C] font-medium">
                      {formatWon(tx.deposit)}
                    </td>
                    <td className="py-3 px-3 text-right text-[#1A202C] font-medium">
                      {formatWon(tx.monthlyRent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-[#718096]">
            Confidence: <strong className="text-[#1A202C]">{result.confidenceLevel}</strong>
            {result.dataSourceNote && <span className="block mt-1 text-xs">{result.dataSourceNote}</span>}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 justify-center pt-6">
        {onNewAnalysis && (
          <button
            onClick={onNewAnalysis}
            className="px-8 py-4 bg-white border-2 border-amber-200 text-[#4A5568] font-semibold rounded-2xl hover:bg-amber-50 transition-colors"
          >
            Analyze Another Quote
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all"
        >
          Print Results
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-sm text-[#718096] text-center mt-8">
        Analysis based on {result.contractCount} recent transactions. Market rates may vary.
        This is for reference only and does not constitute legal or financial advice.
      </p>
    </div>
  );
}

// Negotiation Option Card Component
function NegotiationOptionCard({
  option,
  userDeposit,
  copied,
  onCopy
}: {
  option: WolseNegotiationOption;
  userDeposit: number;
  copied: boolean;
  onCopy: () => void;
}) {
  const formatWon = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toLocaleString()}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  return (
    <div
      className={`bg-white rounded-3xl p-6 cursor-pointer transition-all hover:shadow-xl shadow-xl shadow-amber-900/5 border ${
        option.recommended ? 'border-2 border-amber-400 bg-amber-50/30' : 'border-amber-100'
      }`}
      onClick={onCopy}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-bold text-[#1A202C] flex items-center gap-2">
            {option.name}
            {option.recommended && (
              <span className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full">
                Recommended
              </span>
            )}
          </h4>
          <p className="text-sm text-[#718096]">
            Rate: {option.rate.toFixed(2)}% • Rent: {formatWon(option.monthlyRent)}/month
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-amber-600">
            Save {formatWon(option.yearlySavings)}/yr
          </p>
          <p className="text-sm text-[#718096]">
            ({formatWon(option.monthlySavings)}/month)
          </p>
        </div>
      </div>

      {/* Script */}
      <div className="bg-amber-50 rounded-2xl p-4 text-sm text-[#4A5568] leading-relaxed border border-amber-100">
        "{option.script}"
      </div>

      {/* Copy indicator */}
      <div className="mt-3 text-right">
        <span className={`text-sm ${copied ? 'text-amber-600 font-medium' : 'text-[#A0AEC0]'}`}>
          {copied ? '✓ Copied to clipboard!' : 'Click to copy script'}
        </span>
      </div>
    </div>
  );
}
