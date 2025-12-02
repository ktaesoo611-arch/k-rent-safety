# Toss Payments Test Guide
## Jeonse Safety Checker - Service Testing Instructions

**Merchant ID**: jeonsege3h
**Business Name**: 전세안전연구소 (Jeonse Safety Research)
**Service URL**: https://jeonse-safety-checker.vercel.app
**Test Date**: 2025-11-28

---

## Test Account Credentials

**Option 1 - Test Account (With Login)**:
- **Email**: `toss-review@jeonse-safety.com`
- **Password**: `TossTest2024!`
- **Login URL**: https://jeonse-safety-checker.vercel.app/auth/login

**Option 2 - Direct Testing (No Login Required)**:
- **Direct URL**: https://jeonse-safety-checker.vercel.app/analyze
- No account creation needed - service allows anonymous analysis

---

## Service Overview

### What We Do
Jeonse Safety Checker analyzes Korean rental properties (전세) for foreign and domestic tenants to identify financial and legal risks before signing contracts.

### Service Details
- **Product Name**: 전세 안전 분석 서비스 (Jeonse Safety Analysis Service)
- **Price**: ₩14,900 per analysis
- **Service Type**: One-time payment per property analysis
- **Delivery**: Instant digital report (1-2 minutes)
- **Payment Method**: Toss Payments integration

---

## Testing Workflow

### Quick Test (5 minutes)

**Step 1: Start Analysis**
1. Visit: https://jeonse-safety-checker.vercel.app
2. Click green **"Start Analysis"** button
3. Or go directly to: https://jeonse-safety-checker.vercel.app/analyze

**Step 2: Select Property**
- **District (구)**: Select "용산구 (Yongsan-gu)"
- **Neighborhood (동)**: Select "이촌동"
- **Apartment**: Select "보람더하임" or any apartment from dropdown
- **Jeonse Amount**: Enter `500000000` (5억 won = ₩500M)

**Step 3: Document Upload (Optional)**
- You can **skip this step** for quick testing
- Or upload any PDF file for OCR testing
- Click "Continue" or "Skip Upload"

**Step 4: Payment Testing**
- Review payment page (₩14,900)
- Click **"Pay with Toss Payments"** button
- Use Toss Payments test card numbers
- Complete test payment flow

**Step 5: View Report**
- After payment, instant redirect to analysis report
- Report shows: Risk Score, Property Info, Debt Analysis, Warnings

---

## Test Scenarios

### Scenario A: Standard User Flow (No Login)
```
1. Visit homepage
2. Click "Start Analysis"
3. Select: 용산구 > 이촌동 > 보람더하임
4. Enter jeonse: 500000000
5. Skip document upload
6. Complete test payment
7. View report
```

### Scenario B: Registered User Flow (With Login)
```
1. Login with test account (toss-review@jeonse-safety.com)
2. Click "Start Analysis" or "New Analysis"
3. Complete property selection
4. Complete payment
5. View report
6. Check "My Analyses" in profile for history
```

### Scenario C: Mobile Testing
```
1. Open on mobile device: https://jeonse-safety-checker.vercel.app
2. Follow standard flow
3. Test mobile-optimized tooltips (tap ⓘ icons)
4. Verify responsive layout
5. Complete mobile payment
```

---

## Payment Integration Details

### Current Status
- **Mode**: Test Mode (using test API keys)
- **Test Keys**: Implemented and functional
- **Production Keys**: Awaiting approval from this review

### Payment Flow
```
User completes property selection
    ↓
System creates analysis record in database
    ↓
Redirect to Toss Payments checkout
    ↓
User completes payment
    ↓
Toss webhook confirms payment
    ↓
System marks analysis as paid
    ↓
User redirected to report page
    ↓
Report displayed instantly
```

### Webhook Endpoint
- **URL**: https://jeonse-safety-checker.vercel.app/api/payments/webhook
- **Method**: POST
- **Authentication**: Toss Payments signature verification

### Security
- HTTPS only (enforced by Vercel)
- Webhook signature validation
- Database transaction integrity
- No card data stored (handled by Toss)

---

## Test Data Examples

### Property Examples You Can Test

**Example 1: Standard Apartment**
- District: 용산구
- Neighborhood: 이촌동
- Apartment: 보람더하임
- Jeonse: ₩500,000,000

**Example 2: High-Value Property**
- District: 강남구
- Neighborhood: 청담동
- Any available apartment
- Jeonse: ₩1,000,000,000

**Example 3: Mid-Range**
- District: 마포구
- Neighborhood: 공덕동
- Any available apartment
- Jeonse: ₩350,000,000

---

## Expected Test Results

### After Payment Success
You should see:
- ✅ Immediate redirect to report page
- ✅ Overall risk score (0-500 points)
- ✅ Risk level badge (SAFE / MODERATE / HIGH / CRITICAL)
- ✅ Property information section
- ✅ Detailed score breakdown (5 components)
- ✅ Risk warnings (if any detected)
- ✅ Debt analysis and priority ranking
- ✅ Print and download options

### Report Sections
1. **Overall Score**: Aggregate safety score with color-coded badge
2. **Property Information**: Address, jeonse amount, estimated value, LTV ratio
3. **Detailed Scores**:
   - LTV Score (loan-to-value)
   - Debt Score
   - Legal Compliance Score
   - Market Score
   - Building Score
4. **Detected Risks**: Any red flags found (mortgages, liens, etc.)
5. **Debt & Collateral Analysis**: Priority ranking of debts
6. **Small Amount Priority**: Eligibility for 소액보증금 protection

---

## Technical Integration

### APIs Used
- **Toss Payments**: Payment processing
- **Google Document AI**: OCR for document parsing (optional)
- **MOLIT API**: Real estate transaction data
- **Anthropic Claude**: AI-powered document analysis (optional)
- **Supabase**: Database and authentication

### Performance
- **Analysis Time**: 1-2 minutes
- **Report Generation**: Instant after payment
- **Uptime**: 99.9% (Vercel hosting)
- **Mobile Support**: Fully responsive

---

## Dev Mode Features (Currently Active)

**Skip Payment Button**:
- Yellow button visible on payment page
- **For Testing Only** - allows bypassing payment
- Will be **disabled in production**
- Useful for internal testing without incurring test charges

**Test API Keys**:
- Currently using Toss test environment
- No real money processed
- All payments are simulated

---

## Production Readiness

### Ready for Production Keys
Once approved, we will:
1. ✅ Update environment variables with production keys
2. ✅ Disable dev mode (remove skip payment button)
3. ✅ Test production payment flow
4. ✅ Enable production webhook
5. ✅ Monitor first live transactions

### Code Quality
- ✅ TypeScript for type safety
- ✅ Error handling and logging
- ✅ Webhook signature verification
- ✅ Database transaction safety
- ✅ Mobile-optimized UI

---

## Support & Contact

### For Testing Issues
- **Email**: ktaesoo611@gmail.com
- **Response Time**: Within 24 hours

### Business Information
- **Business Name**: 전세안전연구소 (Jeonse Safety Research)
- **Service**: Jeonse Safety Analysis
- **Target Users**: Foreign and domestic tenants in Korea
- **Business Model**: Pay-per-analysis (₩14,900)

---

## FAQ for Reviewers

**Q: Why is the payment amount ₩14,900?**
A: This is our production pricing - affordable for individual tenants while covering API costs (MOLIT, Document AI, Claude AI).

**Q: Is this a subscription service?**
A: No, it's a one-time payment per property analysis. Users pay only when they need to analyze a specific property.

**Q: What happens after payment?**
A: Users receive instant access to a comprehensive safety report they can print, save, or share. No additional purchases required.

**Q: Can users get refunds?**
A: Yes, if analysis fails or produces errors, we issue full refunds. Contact support for refund requests.

**Q: How do you verify property data?**
A: We use official Korean government APIs (MOLIT) for transaction data and users upload their 등기부등본 (property registry) for verification.

---

## Test Checklist for Reviewers

Please verify:

- [ ] Homepage loads correctly
- [ ] Property selection dropdown works
- [ ] Payment page displays correct amount (₩14,900)
- [ ] Toss payment widget loads
- [ ] Test payment completes successfully
- [ ] Redirect to report works
- [ ] Report displays all sections
- [ ] Mobile layout is responsive
- [ ] Tooltips work on mobile (tap icons)
- [ ] Print function works
- [ ] "New Analysis" button works

---

## Additional Notes

**Database**: All test data is stored in separate test environment and can be cleared upon request.

**Privacy**: We comply with Korean personal information protection laws. User data is encrypted and stored securely.

**Business Registration**: Registered business operating in South Korea.

**Service Availability**: Currently available for Seoul apartments only. Expanding to other regions in 2025.

---

**Thank you for reviewing our application!**

For any questions or additional testing requirements, please contact:
- Email: ktaesoo611@gmail.com
- Business Hours: Mon-Fri 9:00-18:00 KST

We appreciate your time and look forward to working with Toss Payments.
