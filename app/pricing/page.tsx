'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import { Button } from '@/components/ui/Button';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-0 w-full z-50">
        <Header />
      </div>

      <div className="pt-32 pb-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-block mb-4 px-5 py-2 bg-emerald-100 rounded-full">
              <span className="text-emerald-700 text-sm font-semibold">PRICING</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
              Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional jeonse safety analysis at an affordable price.
              <br />
              Currently FREE during beta period.
            </p>
          </div>

          {/* Beta Announcement */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-8 mb-12 text-center shadow-xl shadow-emerald-900/20">
            <div className="text-white">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-3">Beta Launch Special</h2>
              <p className="text-xl text-emerald-50 mb-4">
                All services are completely FREE during our beta testing period!
              </p>
              <p className="text-emerald-100 text-sm">
                베타 테스트 기간 동안 모든 서비스를 무료로 이용하실 수 있습니다.
              </p>
            </div>
          </div>

          {/* Product/Service Offerings */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Free Beta Plan */}
            <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-xl shadow-emerald-900/10 overflow-hidden transform hover:scale-105 transition-transform">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold">Beta Free Trial</h3>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                    LIMITED TIME
                  </span>
                </div>
                <p className="text-emerald-50 mb-4">Full access to all features</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">₩0</span>
                  <span className="text-emerald-100 line-through">₩29,000</span>
                </div>
              </div>

              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <FeatureItem text="English translation of property register" />
                  <FeatureItem text="20+ comprehensive risk checks" />
                  <FeatureItem text="AI-powered property valuation" />
                  <FeatureItem text="Safety score (0-100)" />
                  <FeatureItem text="Detailed PDF report" />
                  <FeatureItem text="Legal risk analysis" />
                  <FeatureItem text="Actionable recommendations" />
                  <FeatureItem text="2-minute analysis time" />
                </ul>

                <Link href="/analyze">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg py-6 rounded-xl font-semibold shadow-lg shadow-emerald-600/30">
                    Start Free Analysis →
                  </Button>
                </Link>
              </div>
            </div>

            {/* Standard Plan (Coming Soon) */}
            <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-lg overflow-hidden opacity-90">
              <div className="bg-gradient-to-br from-gray-700 to-gray-900 p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold">Standard Plan</h3>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                    COMING SOON
                  </span>
                </div>
                <p className="text-gray-200 mb-4">After beta period</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">₩29,000</span>
                  <span className="text-gray-300 text-sm">per report</span>
                </div>
              </div>

              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <FeatureItem text="English translation of property register" />
                  <FeatureItem text="20+ comprehensive risk checks" />
                  <FeatureItem text="AI-powered property valuation" />
                  <FeatureItem text="Safety score (0-100)" />
                  <FeatureItem text="Detailed PDF report" />
                  <FeatureItem text="Legal risk analysis" />
                  <FeatureItem text="Actionable recommendations" />
                  <FeatureItem text="Priority email support" />
                </ul>

                <Button
                  disabled
                  className="w-full bg-gray-300 text-gray-500 text-lg py-6 rounded-xl font-semibold cursor-not-allowed"
                >
                  Available After Beta
                </Button>
              </div>
            </div>
          </div>

          {/* What's Included Section */}
          <div className="bg-gray-50 rounded-2xl p-8 md:p-12 mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              What's Included in Every Report
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <IncludedItem
                icon="🌐"
                title="English Translation"
                description="Complete translation of Korean property register into clear English"
              />
              <IncludedItem
                icon="💰"
                title="Property Valuation"
                description="Market price analysis based on Ministry of Land transaction data"
              />
              <IncludedItem
                icon="⚖️"
                title="Legal Risk Check"
                description="Automated verification of mortgages, seizures, and legal issues"
              />
              <IncludedItem
                icon="📊"
                title="Safety Score"
                description="0-100 point safety rating based on comprehensive analysis"
              />
              <IncludedItem
                icon="🔍"
                title="Risk Breakdown"
                description="Detailed analysis of 20+ potential risk factors"
              />
              <IncludedItem
                icon="📄"
                title="PDF Report"
                description="Professional downloadable report you can share and keep"
              />
              <IncludedItem
                icon="✅"
                title="Action Checklist"
                description="Step-by-step guidance on what to do before signing"
              />
              <IncludedItem
                icon="⚡"
                title="Instant Delivery"
                description="Receive your report within 2-5 minutes of payment"
              />
              <IncludedItem
                icon="🔒"
                title="Secure & Private"
                description="Your data is encrypted and never shared with third parties"
              />
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4 max-w-3xl mx-auto">
              <FAQItem
                question="How long is the beta period?"
                answer="The beta period will continue until we've tested the service thoroughly with real users. We'll announce the end date at least 2 weeks in advance. All users who sign up during beta will receive special early-adopter benefits."
              />
              <FAQItem
                question="What payment methods do you accept?"
                answer="We accept all major credit cards (Visa, MasterCard, AMEX), Korean bank transfers, virtual accounts, and simple payment methods (Toss, Naver Pay, Kakao Pay) through Toss Payments."
              />
              <FAQItem
                question="Can I get a refund?"
                answer="Yes, refunds are available before you download the report, or if there was a technical error. Once you've downloaded the PDF report, refunds are not available as it's a digital product. See our full refund policy for details."
              />
              <FAQItem
                question="How accurate is the analysis?"
                answer="Our analysis is based on official government data from Ministry of Land (MOLIT) and automated risk assessment algorithms. However, this is for informational purposes and does not replace professional legal or real estate consultation."
              />
              <FAQItem
                question="What areas do you cover?"
                answer="Currently we support Seoul apartments during beta. We're working to expand to Gyeonggi Province, Incheon, and other property types (villa, officetel, multi-family) soon."
              />
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 rounded-2xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-100/5 to-transparent"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to check your jeonse safety?
              </h2>
              <p className="text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
                Join hundreds of foreigners who have protected their deposits with our analysis.
              </p>
              <Link href="/analyze">
                <Button
                  size="lg"
                  className="text-lg px-10 py-5 bg-white text-emerald-900 hover:bg-emerald-50 shadow-xl shadow-emerald-900/30 border-0 rounded-2xl font-semibold transition-all hover:scale-105"
                >
                  Start Free Analysis Now →
                </Button>
              </Link>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-12 text-center">
            <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <svg className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-gray-700">{text}</span>
    </li>
  );
}

function IncludedItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="bg-white rounded-xl border border-gray-200 p-6 group">
      <summary className="font-semibold text-gray-900 cursor-pointer list-none flex items-center justify-between">
        {question}
        <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <p className="mt-4 text-gray-600 leading-relaxed">{answer}</p>
    </details>
  );
}
