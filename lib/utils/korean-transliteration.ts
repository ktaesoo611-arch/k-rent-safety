/**
 * Korean to English Transliteration Utility
 * Converts Korean apartment names to romanized English
 */

// Revised Romanization of Korean (국립국어원 표준)
const INITIAL_CONSONANTS: Record<string, string> = {
  'ㄱ': 'g', 'ㄲ': 'kk', 'ㄴ': 'n', 'ㄷ': 'd', 'ㄸ': 'tt',
  'ㄹ': 'r', 'ㅁ': 'm', 'ㅂ': 'b', 'ㅃ': 'pp', 'ㅅ': 's',
  'ㅆ': 'ss', 'ㅇ': '', 'ㅈ': 'j', 'ㅉ': 'jj', 'ㅊ': 'ch',
  'ㅋ': 'k', 'ㅌ': 't', 'ㅍ': 'p', 'ㅎ': 'h'
};

const VOWELS: Record<string, string> = {
  'ㅏ': 'a', 'ㅐ': 'ae', 'ㅑ': 'ya', 'ㅒ': 'yae', 'ㅓ': 'eo',
  'ㅔ': 'e', 'ㅕ': 'yeo', 'ㅖ': 'ye', 'ㅗ': 'o', 'ㅘ': 'wa',
  'ㅙ': 'wae', 'ㅚ': 'oe', 'ㅛ': 'yo', 'ㅜ': 'u', 'ㅝ': 'wo',
  'ㅞ': 'we', 'ㅟ': 'wi', 'ㅠ': 'yu', 'ㅡ': 'eu', 'ㅢ': 'ui',
  'ㅣ': 'i'
};

const FINAL_CONSONANTS: Record<string, string> = {
  'ㄱ': 'k', 'ㄲ': 'k', 'ㄳ': 'k', 'ㄴ': 'n', 'ㄵ': 'n',
  'ㄶ': 'n', 'ㄷ': 't', 'ㄹ': 'l', 'ㄺ': 'k', 'ㄻ': 'm',
  'ㄼ': 'l', 'ㄽ': 'l', 'ㄾ': 'l', 'ㄿ': 'p', 'ㅀ': 'l',
  'ㅁ': 'm', 'ㅂ': 'p', 'ㅄ': 'p', 'ㅅ': 't', 'ㅆ': 't',
  'ㅇ': 'ng', 'ㅈ': 't', 'ㅊ': 't', 'ㅋ': 'k', 'ㅌ': 't',
  'ㅍ': 'p', 'ㅎ': 't'
};

// Special mappings for common apartment name components
const SPECIAL_MAPPINGS: Record<string, string> = {
  // Major brands
  '아이파크': 'IPARK',
  '래미안': 'Raemian',
  '자이': 'Xi',
  '푸르지오': 'Prugio',
  '힐스테이트': 'Hillstate',
  'e편한세상': 'e-Pyeonhansesang',
  '센트럴': 'Central',
  '더샵': 'The Sharp',
  '롯데캐슬': 'LOTTE CASTLE',
  '호반베르디움': 'Hoban Verdi Um',
  '포레나': 'FORENA',
  '하늘채': 'Haneulchae',
  '센트레빌': 'Centreville',
  '써밋': 'Summit',

  // Builders/companies
  '현대': 'Hyundai',
  '삼성': 'Samsung',
  '한양': 'Hanyang',
  '주공': 'Jugong',
  '신동아': 'Shindonga',
  '한신': 'Hanshin',
  'GS': 'GS',
  'SK': 'SK',
  '한화': 'Hanwha',
  '코오롱': 'Kolon',
  '호반': 'Hoban',
  '동부': 'Dongbu',

  // Common descriptors
  '휴플러스': 'Huplus',
  '렉슬': 'Lexle',
  '아르테온': 'Arteon',
  '엠밸리': 'M-Valley',
  '스카이': 'Sky',
  '더힐': 'The Hill',
  '헬리오시티': 'Helios City',
  '신시가지': 'New Town',
  '프레지던스': 'Presidence',
  '아스테리움': 'Asterium',
  '시그니처': 'Signature',
  '트윈골드': 'Twin Gold',
  '베르': 'Verre',
  '에이디션': 'A.DITION',
  '뷰': 'VIEW',
  '갤러리아': 'Galleria',
  '포레': 'Forêt',
  '리버파크': 'River Park',
  '서울원': 'SEOULONE',
  '퍼스티어': 'FIRSTIER',

  // Premium brands (Tier 2)
  '아크로': 'ACRO',
  '디에이치': 'THE H',
  '르엘': 'LE-EL',
  '오티에르': 'HAUTERRE',
  '드파인': "DE'FINE",

  // Premium brand components
  '아너힐즈': 'Honor Hills',
  '포레센트': 'Forescent',
  '라클라스': 'La Classe',
  '라클라체': 'La Classe',
  '에델루이': 'Edelui',
  '아델스타': 'Adelstar',
  '어퍼하우스': 'UPPERHOUSE',
  '마에스트로': 'Maestro',
  '더 트레시아': 'The Tresia',
  '트레시아': 'Tresia',
  '라체르보': 'Lacervo',
  '자이 드파인': 'Xi DE\'FINE',
  '더 퍼스트': 'The First',

  // Tier 3 brands (Regional developers)
  '위브': "We've",
  '두산위브': "Doosan We've",
  '더제니스': 'the Zenith',
  '센티움': "Centi'um",
  '트레지움': 'TRESIUM',
  '아테라': 'ARTERA',
  '어울림': 'Oullim',
  '리첸시아': 'Richensia',
  '한남더힐': 'Hannam The Hill',
  '유보라': 'UBORA',
  '반도유보라': 'Bando UBORA',
  '카이브': 'KAIVE',
  '아이비파크': 'IVY PARK',
  '마크에디션': 'Mark Edition',
  '퍼스트리브': 'First Live',
  '팰리스': 'Palace',
  '에피트': 'EFETE',
  '한라비발디': 'Hanla VIVALDI',
  '어바닉': 'Urbanic',
  '에디션': 'Edition',
  '데시앙': 'DESIAN',
  '더 플래티넘': 'The PLATINUM',
  '플래티넘': 'PLATINUM',
  '예가': 'YEGA',
  '린': 'Lynn',
  '린스트라우스': 'Lynn StrauS',
  '더스카이': 'The Sky',
  '리슈빌': 'RICHVILLE',
  '로덴하우스': 'Roden Haus',
  '엘리프': 'ELIF',
  'S-클래스': 'S-CLASS',
  '에스클래스': 'S-CLASS',
  '리버티': 'Liberty',
  '에듀파크': 'Edu Park',
  '더휴': 'THE HUE',
  '한신더휴': 'Hanshin THE HUE',
  '한신휴플러스': 'Hanshin HUPLUS',
  '그린코아': 'Green Core',
  '한신그린코아': 'Hanshin Green Core',
  '리저브': 'RESERVE',
  '스위첸': 'SWItZEN',
  '웰츠타워': 'WELLTZ TOWER',
  '파밀리에': 'FAMILIE',
  '신동아 파밀리에': 'Shindonga FAMILIE',
  '수자인': 'SUJAIN',
  '한양수자인': 'Hanyang SUJAIN',
  '오브센트': 'Obscent',
  '노블랜드': 'NOBLE LAND',
  '대방노블랜드': 'Daebang NOBLE LAND',
  '디엠시티': 'THE M CITY',
  '로얄듀크': 'ROYAL DUKE',
  '동원로얄듀크': 'Dongwon ROYAL DUKE',
  '비스타': 'Vista',

  // Specific location + brand patterns (longer patterns first)
  '서울포레스트': 'Seoul Forest',
  '구의역 롯데캐슬 이스트폴': 'LOTTE CASTLE EASTPOLE',
  '청량리역 롯데캐슬': 'Cheongnyangni Stn. LOTTE CASTLE',
  '길음역 롯데캐슬': 'Gireum Station Lotte Castle',

  // Specific apartments
  '이스트폴': 'EASTPOLE',
  '텐즈힐': 'Tens Hill',
  '엘마파트': 'Elma Apartments',
  '까치마을': 'Kkachi Village',
  'SKY-L65': 'SKY-L65',

  // Location descriptors (shorter patterns last)
  '마을': 'Village',
  '타워': 'Tower',
  '파크': 'Park',
  '빌': 'Ville',
  '시티': 'City',
  '역': 'Station'
};

/**
 * Decompose a Korean character into its components
 */
function decomposeHangul(char: string): { initial: string; vowel: string; final: string } | null {
  const code = char.charCodeAt(0);

  // Check if it's a Hangul syllable (가-힣)
  if (code < 0xAC00 || code > 0xD7A3) {
    return null;
  }

  const syllableIndex = code - 0xAC00;
  const initialIndex = Math.floor(syllableIndex / 588);
  const vowelIndex = Math.floor((syllableIndex % 588) / 28);
  const finalIndex = syllableIndex % 28;

  const initialConsonants = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const vowels = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  const finalConsonants = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  return {
    initial: initialConsonants[initialIndex],
    vowel: vowels[vowelIndex],
    final: finalConsonants[finalIndex]
  };
}

/**
 * Transliterate a single Korean character to English
 */
function transliterateChar(char: string): string {
  const decomposed = decomposeHangul(char);

  if (!decomposed) {
    // Not a Korean character, return as-is
    return char;
  }

  const initial = INITIAL_CONSONANTS[decomposed.initial] || '';
  const vowel = VOWELS[decomposed.vowel] || '';
  const final = decomposed.final ? (FINAL_CONSONANTS[decomposed.final] || '') : '';

  return initial + vowel + final;
}

/**
 * Transliterate Korean text to English using Revised Romanization
 */
export function transliterateKorean(korean: string): string {
  // Check for special mappings first
  for (const [kr, en] of Object.entries(SPECIAL_MAPPINGS)) {
    if (korean.includes(kr)) {
      korean = korean.replace(new RegExp(kr, 'g'), `|${en}|`);
    }
  }

  // Transliterate remaining Korean characters
  let result = '';
  for (let i = 0; i < korean.length; i++) {
    const char = korean[i];

    // Keep special markers
    if (char === '|') {
      result += char;
      continue;
    }

    // Transliterate Korean character
    result += transliterateChar(char);
  }

  // Clean up special markers and capitalize
  result = result
    .split('|')
    .map(part => {
      // If it's a special mapping, keep it as-is
      if (Object.values(SPECIAL_MAPPINGS).includes(part)) {
        return part;
      }
      // Otherwise, capitalize first letter
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ')
    .trim();

  // Clean up multiple spaces
  result = result.replace(/\s+/g, ' ');

  return result;
}

/**
 * Generate English name for an apartment complex
 * Handles common patterns and special cases
 */
export function generateApartmentEnglishName(koreanName: string): string {
  // Handle phase numbers (e.g., "1단지", "2단지")
  const phaseMatch = koreanName.match(/(.+)\((\d+)단지\)/);
  if (phaseMatch) {
    const baseName = transliterateKorean(phaseMatch[1]);
    const phase = phaseMatch[2];
    return `${baseName} (Complex ${phase})`;
  }

  // Standard transliteration
  return transliterateKorean(koreanName);
}
