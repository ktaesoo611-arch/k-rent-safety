import axios from 'axios';
import { WolseTransaction } from '../types';

/**
 * MOLIT Wolse (Monthly Rent) API Service
 * Endpoint: 아파트 전월세 실거래가 API
 * Data includes both jeonse (전세) and wolse (월세) transactions
 */
export class MolitWolseAPI {
  private apiKey: string;
  private baseUrl = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get apartment rent transaction data for a district and month
   * @param lawdCd - Legal district code (법정동코드, 5 digits)
   * @param dealYmd - Year-month (YYYYMM)
   */
  async getRentTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<WolseTransaction[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/getRTMSDataSvcAptRent`,
        {
          params: {
            serviceKey: this.apiKey,
            pageNo: 1,
            numOfRows: 1000,
            LAWD_CD: lawdCd,
            DEAL_YMD: dealYmd
          },
          timeout: 30000
        }
      );

      const result = response.data;
      const items = result.response?.body?.items?.item || [];
      const transactions = Array.isArray(items) ? items : (items ? [items] : []);

      console.log(`MOLIT Wolse API: Found ${transactions.length} rent transactions for ${lawdCd} ${dealYmd}`);

      return transactions.map((item: any) => ({
        apartmentName: item.aptNm?.trim() || '',
        legalDong: item.umdNm?.trim() || '',
        exclusiveArea: parseFloat(item.excluUseAr) || 0,
        floor: parseInt(item.floor) || 0,
        deposit: this.parseAmount(item.deposit), // 보증금
        monthlyRent: this.parseAmount(item.monthlyRent), // 월세
        year: parseInt(item.dealYear),
        month: parseInt(item.dealMonth),
        day: parseInt(item.dealDay),
        contractType: item.contractType?.trim() || undefined // 신규/갱신
      }));
    } catch (error) {
      console.error('MOLIT Wolse API Error:', error);
      throw new Error('Failed to fetch rent transaction data');
    }
  }

  /**
   * Get wolse-only transactions (filter out pure jeonse)
   * Pure jeonse has monthlyRent = 0
   */
  async getWolseTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<WolseTransaction[]> {
    const allTransactions = await this.getRentTransactions(lawdCd, dealYmd);
    // Filter to only wolse (monthly rent > 0)
    return allTransactions.filter(t => t.monthlyRent > 0);
  }

  /**
   * Get recent wolse transactions for a specific apartment
   * @param lawdCd - Legal district code
   * @param apartmentName - Apartment name to filter
   * @param area - Exclusive area in ㎡ (optional, filters within ±10%)
   * @param monthsBack - Number of months to look back (default 6)
   */
  async getRecentWolseForApartment(
    lawdCd: string,
    apartmentName: string,
    area?: number,
    monthsBack: number = 6
  ): Promise<WolseTransaction[]> {
    console.log(`\n🔍 MOLIT Wolse API Query:`);
    console.log(`   lawdCd: "${lawdCd}"`);
    console.log(`   apartmentName: "${apartmentName}"`);
    console.log(`   area: ${area}㎡`);
    console.log(`   monthsBack: ${monthsBack}`);

    const transactions: WolseTransaction[] = [];
    const today = new Date();

    // Fetch last N months
    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        console.log(`\n📅 Fetching ${yearMonth}...`);
        const monthData = await this.getWolseTransactions(lawdCd, yearMonth);
        console.log(`   → Got ${monthData.length} wolse transactions for this district+month`);

        // Filter for specific apartment
        const filtered = monthData.filter(t => {
          const nameMatches = this.matchApartmentName(t.apartmentName, apartmentName);
          if (!nameMatches) return false;

          // If area is specified, check area match (within 10%)
          if (area !== undefined) {
            const areaTolerance = area * 0.1; // 10% tolerance
            const areaMatches = Math.abs(t.exclusiveArea - area) <= areaTolerance;
            if (!areaMatches) {
              console.log(`   ⚠️  Name matched "${t.apartmentName}" but area didn't: ${t.exclusiveArea}㎡ vs ${area}㎡`);
            }
            return areaMatches;
          }

          return true;
        });

        console.log(`   → After filtering: ${filtered.length} transactions match`);
        if (filtered.length > 0) {
          const sample = filtered[0];
          console.log(`   ✅ Sample: ${sample.apartmentName}, ${sample.exclusiveArea}㎡, 보증금 ${(sample.deposit / 10000).toLocaleString()}만원, 월세 ${(sample.monthlyRent / 10000).toLocaleString()}만원`);
        }

        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch data for ${yearMonth}:`, error);
        // Continue with other months
      }
    }

    // Sort by date (newest first)
    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Get wolse transactions for a neighborhood (동) - fallback when building data is insufficient
   */
  async getWolseForDong(
    lawdCd: string,
    dong: string,
    area?: number,
    monthsBack: number = 6,
    areaToleranceRatio: number = 0.1  // Default ±10%, can be set to 0.05 for ±5%
  ): Promise<WolseTransaction[]> {
    console.log(`\n🏘️ MOLIT Wolse API - Dong-level Query:`);
    console.log(`   lawdCd: "${lawdCd}", dong: "${dong}"`);
    console.log(`   Period: ${monthsBack} months, Area tolerance: ±${(areaToleranceRatio * 100).toFixed(0)}%`);

    const transactions: WolseTransaction[] = [];
    const today = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        const monthData = await this.getWolseTransactions(lawdCd, yearMonth);

        // Filter by dong and area
        const filtered = monthData.filter(t => {
          const dongMatches = t.legalDong === dong || t.legalDong.includes(dong);
          if (!dongMatches) return false;

          if (area !== undefined) {
            const areaTolerance = area * areaToleranceRatio;
            return Math.abs(t.exclusiveArea - area) <= areaTolerance;
          }
          return true;
        });

        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch dong data for ${yearMonth}:`, error);
      }
    }

    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Match apartment names with various normalizations
   */
  private matchApartmentName(targetName: string, queryName: string): boolean {
    const normalize = (name: string): string => {
      return name
        .replace(/아파트$/g, '')
        .replace(/APT$/gi, '')
        .replace(/\s+/g, '')
        .trim()
        .toLowerCase();
    };

    const normalizedQuery = normalize(queryName);
    const normalizedTarget = normalize(targetName);

    return (
      targetName === queryName ||
      normalizedTarget === normalizedQuery ||
      targetName.startsWith(queryName + '(') ||
      normalizedTarget.startsWith(normalizedQuery + '(') ||
      normalizedTarget.includes(normalizedQuery)
    );
  }

  /**
   * Parse amount from API response
   * Amount comes as string like "12,345" (in 만원)
   */
  private parseAmount(amount: string | number | undefined): number {
    if (amount === undefined || amount === null || amount === '') return 0;
    if (typeof amount === 'number') return amount * 10000;
    const cleanAmount = amount.toString().replace(/,/g, '');
    const parsed = parseInt(cleanAmount);
    return isNaN(parsed) ? 0 : parsed * 10000; // Convert 만원 to 원
  }
}

// Re-export district code helper from main molit module
export { getDistrictCode } from './molit';
