# Toss Payments Integration - Payment Flow Documentation
## 전세안전연구소 (Jeonse Safety Institute)

---

## Slide 1: Service Overview

**Service Name:** Jeonse Safety Checker
**Website:** https://jeonse-safety-checker.vercel.app
**Business:** 전세안전연구소 (Jeonse Safety Institute)
**MID:** jeonsege3h

### Product Information
- **Service:** Digital jeonse safety analysis report
- **Target Users:** Foreigners renting in Korea
- **Delivery:** Instant digital delivery (PDF report)
- **Price:** ₩0 (Beta) → ₩29,000 - ₩50,000 (Standard)

---

## Slide 2: Payment Flow - Step 1
### Landing Page → Service Selection

**Page:** Homepage (/)
**URL:** https://jeonse-safety-checker.vercel.app

**User Actions:**
1. User visits homepage
2. Reads about the service
3. Clicks "Start for free now →" button

**Screenshot Elements:**
- Hero section with service description
- "Start for free now" CTA button
- Service features overview
- Footer with business information

**Navigation:** → `/analyze`

---

## Slide 3: Payment Flow - Step 2
### Property Selection

**Page:** Analysis Start Page (/analyze)
**URL:** https://jeonse-safety-checker.vercel.app/analyze

**User Actions:**
1. User creates account or logs in
2. Selects property location:
   - District (구)
   - Neighborhood (동)
   - Apartment name
3. Clicks "Start Analysis" button

**Data Collected:**
- User account (email, name)
- Selected property information
- Analysis request created

**Navigation:** → `/analyze/[id]`

---

## Slide 4: Payment Flow - Step 3
### Payment Page (Currently Free)

**Page:** Payment Page (/analyze/[id]/payment)
**URL:** https://jeonse-safety-checker.vercel.app/analyze/[id]/payment

**User Actions:**
1. Reviews order summary
   - Service: "Jeonse Safety Analysis"
   - Amount: ₩0 (Beta) or ₩29,000 (Standard)
2. Clicks "Proceed to Upload" (Beta) or "Pay Now" (Standard)

**Beta Period:**
- Payment amount: ₩0
- Direct proceed to document upload

**After Beta:**
- Payment amount: ₩29,000 - ₩50,000
- Toss Payments checkout integration
- Payment methods: Card, Bank Transfer, Virtual Account, Simple Pay

**Navigation:** → `/analyze/[id]/upload` (after payment)

---

## Slide 5: Payment Flow - Step 4
### Payment Processing (Post-Beta)

**Page:** Toss Payments Checkout
**Payment Methods Available:**
- 💳 Credit/Debit Cards (신용카드)
- 🏦 Bank Transfer (계좌이체)
- 📱 Virtual Account (가상계좌)
- ⚡ Simple Payment (간편결제)
  - Toss Pay
  - Naver Pay
  - Kakao Pay

**Process:**
1. User selects payment method
2. Enters payment information
3. Confirms payment
4. Toss Payments processes transaction
5. Redirects back to success/fail page

**Success URL:** `/analyze/[id]/payment/success`
**Fail URL:** `/analyze/[id]/payment/fail`

---

## Slide 6: Payment Flow - Step 5
### Payment Success

**Page:** Payment Success (/analyze/[id]/payment/success)
**URL:** https://jeonse-safety-checker.vercel.app/analyze/[id]/payment/success

**System Actions:**
1. Receives payment confirmation from Toss Payments
2. Verifies payment with Toss API
3. Updates order status to "paid"
4. Sends confirmation email to user

**User See:**
- ✅ Payment successful message
- Order confirmation details
- Next steps instructions
- "Continue to Upload" button

**Navigation:** → `/analyze/[id]/upload`

---

## Slide 7: Payment Flow - Step 6
### Document Upload

**Page:** Upload Page (/analyze/[id]/upload)
**URL:** https://jeonse-safety-checker.vercel.app/analyze/[id]/upload

**User Actions:**
1. Uploads property register PDF (등기부등본)
2. Optionally uploads building registry (건축물대장)
3. Reviews uploaded documents
4. Clicks "Start Analysis" button

**System Actions:**
- Validates payment status
- Accepts document uploads
- Initiates analysis process

**Navigation:** → `/analyze/[id]/processing`

---

## Slide 8: Payment Flow - Step 7
### Analysis Processing

**Page:** Processing Page (/analyze/[id]/processing)
**URL:** https://jeonse-safety-checker.vercel.app/analyze/[id]/processing

**System Actions:**
1. Extracts text from uploaded documents using OCR
2. Translates Korean to English
3. Fetches property data from government APIs
4. Analyzes 20+ risk factors
5. Calculates safety score
6. Generates comprehensive PDF report

**User See:**
- Loading animation
- Progress indicators
- Estimated time: 2-5 minutes

**Navigation:** → `/analyze/[id]/report` (auto-redirect when complete)

---

## Slide 9: Payment Flow - Step 8
### Report Delivery

**Page:** Report Page (/analyze/[id]/report)
**URL:** https://jeonse-safety-checker.vercel.app/analyze/[id]/report

**User Actions:**
1. Views online report with:
   - English-translated property register
   - Safety score (0-100)
   - Risk breakdown
   - Property valuation
   - Action checklist
2. Downloads PDF report
3. Saves for records

**Service Delivery:**
- ✅ Instant digital delivery
- ✅ No physical shipping
- ✅ Immediately accessible after analysis
- ✅ Downloadable PDF format

**Service Complete:** User has received full value

---

## Slide 10: Payment Flow - Alternative Flow
### Payment Failure

**Page:** Payment Fail (/analyze/[id]/payment/fail)
**URL:** https://jeonse-safety-checker.vercel.app/analyze/[id]/payment/fail

**User See:**
- ❌ Payment failed message
- Reason for failure (if available)
- "Try Again" button
- Contact support information

**User Actions:**
1. Reviews error message
2. Clicks "Try Again" to return to payment page
3. Or contacts support for assistance

**Navigation:** → `/analyze/[id]/payment` (retry)

---

## Slide 11: Refund Policy Summary

### Full Refund (100%)
✅ Payment error - charged but no report received
✅ Technical failure - system error during analysis
✅ Incorrect property - wrong property analyzed
✅ Before download - refund requested before downloading

### No Refund
❌ After download - PDF report already downloaded
❌ Change of mind - simple change of mind
❌ Disagreement with results - based on objective data
❌ User error - wrong property selected

**Refund Request:**
- Email: contact@jeonse-safety.com
- Phone: 010-2382-8432
- Review: 1 business day
- Processing: 3-5 business days

---

## Slide 12: Technical Integration Details

### Payment Integration
- **Gateway:** Toss Payments
- **SDK:** @tosspayments/tosspayments-sdk v2.4.1
- **MID:** jeonsege3h
- **Client Key:** (environment variable)

### Security
- ✅ HTTPS encryption
- ✅ PCI-DSS compliant (through Toss Payments)
- ✅ No credit card storage
- ✅ Secure payment processing

### Service Delivery Timeline
- **Payment Processing:** Instant
- **Analysis Time:** 2-5 minutes
- **Total Delivery:** < 10 minutes
- **Maximum Service Period:** Instant (digital product)

---

## Slide 13: Business Information

**Company Name:** 전세안전연구소 (Jeonse Safety Institute)
**Representative:** 김태수 (Kim Tae-soo)
**Business Registration:** 595-47-01161
**Tax Type:** 간이과세자 (Simplified taxpayer)

**Address:**
서울특별시 중구 왕십리로 407, 101동 601호
(신당동, 신당파인힐하나유보라아파트)

**Contact:**
Phone: 010-2382-8432
Email: contact@jeonse-safety.com
Website: https://jeonse-safety-checker.vercel.app

**통신판매업 신고번호:** Not required (간이과세자)
**Note:** KB Kookmin Card excluded due to simplified taxpayer status

---

## Slide 14: Payment Flow Diagram

```
[Landing Page]
      ↓
  (Start for free)
      ↓
[Property Selection]
      ↓
  (Start Analysis)
      ↓
[Payment Page] ←──────┐
      ↓                │
  (Pay Now)           │
      ↓                │
[Toss Payments]       │
  ↙        ↘          │
Success   Fail ───────┘
  ↓
[Document Upload]
  ↓
[Processing]
  ↓
[Report Delivery]
  ✓ Complete
```

---

## Slide 15: Key Compliance Points

### Toss Payments Requirements Met:

✅ **Product Page:** Created at /pricing with clear product information
✅ **Business Info:** Added to footer on all pages
✅ **Refund Policy:** Detailed page at /terms
✅ **Payment Integration:** Toss Payments SDK integrated
✅ **Service Delivery:** Instant (< 10 minutes)
✅ **Maximum Service Period:** Instant delivery (< 6 months rule)

### Additional Notes:
- Digital product with instant delivery
- No physical shipping required
- Service delivery period: immediate
- Refund policy clearly stated
- Business information displayed on all pages

---

**End of Documentation**

For questions or clarifications:
Email: contact@jeonse-safety.com
Phone: 010-2382-8432
