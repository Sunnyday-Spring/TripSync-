// Utility for smart destination detection, geocoding and coordinates lookup

export interface DestinationInfo {
  name: string;
  nameEn: string;
  lat: number;
  lng: number;
  zoom: number;
}

// Comprehensive dictionary of Thai provinces and popular travel destinations
export const POPULAR_DESTINATIONS: Record<string, DestinationInfo> = {
  // Bangkok & Central
  bangkok: { name: 'กรุงเทพมหานคร', nameEn: 'Bangkok', lat: 13.7563, lng: 100.5018, zoom: 12 },
  nonthaburi: { name: 'นนทบุรี', nameEn: 'Nonthaburi', lat: 13.8621, lng: 100.5144, zoom: 12 },
  pathumthani: { name: 'ปทุมธานี', nameEn: 'Pathum Thani', lat: 14.0208, lng: 100.5250, zoom: 12 },
  samutprakan: { name: 'สมุทรปราการ', nameEn: 'Samut Prakan', lat: 13.5991, lng: 100.5998, zoom: 12 },
  samutsakhon: { name: 'สมุทรสาคร', nameEn: 'Samut Sakhon', lat: 13.5475, lng: 100.2744, zoom: 12 },
  samutsongkhram: { name: 'สมุทรสงคราม', nameEn: 'Samut Songkhram', lat: 13.4098, lng: 99.9997, zoom: 12 },
  ayutthaya: { name: 'พระนครศรีอยุธยา', nameEn: 'Ayutthaya', lat: 14.3532, lng: 100.5684, zoom: 12 },
  suphanburi: { name: 'สุพรรณบุรี', nameEn: 'Suphan Buri', lat: 14.4745, lng: 100.1177, zoom: 11 },
  nakhonpathom: { name: 'นครปฐม', nameEn: 'Nakhon Pathom', lat: 13.8196, lng: 100.0601, zoom: 12 },
  nakhonnayok: { name: 'นครนายก', nameEn: 'Nakhon Nayok', lat: 14.2069, lng: 101.2131, zoom: 11 },
  saraburi: { name: 'สระบุรี', nameEn: 'Saraburi', lat: 14.5289, lng: 100.9101, zoom: 11 },
  lopburi: { name: 'ลพบุรี', nameEn: 'Lopburi', lat: 14.7995, lng: 100.6534, zoom: 11 },

  // North
  chiangmai: { name: 'เชียงใหม่', nameEn: 'Chiang Mai', lat: 18.7883, lng: 98.9853, zoom: 12 },
  chiangrai: { name: 'เชียงราย', nameEn: 'Chiang Rai', lat: 19.9105, lng: 99.8406, zoom: 11 },
  nan: { name: 'น่าน', nameEn: 'Nan', lat: 18.7833, lng: 100.7833, zoom: 11 },
  maehongson: { name: 'แม่ฮ่องสอน (ปาย)', nameEn: 'Mae Hong Son / Pai', lat: 19.3582, lng: 98.4405, zoom: 11 },
  lampang: { name: 'ลำปาง', nameEn: 'Lampang', lat: 18.2888, lng: 99.4928, zoom: 11 },
  lamphun: { name: 'ลำพูน', nameEn: 'Lamphun', lat: 18.5772, lng: 99.0087, zoom: 11 },
  phrae: { name: 'แพร่', nameEn: 'Phrae', lat: 18.1446, lng: 100.1411, zoom: 11 },
  phayao: { name: 'พะเยา', nameEn: 'Phayao', lat: 19.1664, lng: 99.9019, zoom: 11 },
  uttaradit: { name: 'อุตรดิตถ์', nameEn: 'Uttaradit', lat: 17.6201, lng: 100.0993, zoom: 11 },
  sukhothai: { name: 'สุโขทัย', nameEn: 'Sukhothai', lat: 17.0078, lng: 99.8234, zoom: 11 },
  phitsanulok: { name: 'พิษณุโลก', nameEn: 'Phitsanulok', lat: 16.8211, lng: 100.2659, zoom: 11 },
  phetchabun: { name: 'เพชรบูรณ์ (เขาค้อ/ภูทับเบิก)', nameEn: 'Khao Kho / Phetchabun', lat: 16.6322, lng: 100.9995, zoom: 11 },
  kamphaengphet: { name: 'กำแพงเพชร', nameEn: 'Kamphaeng Phet', lat: 16.4828, lng: 99.5227, zoom: 11 },
  tak: { name: 'ตาก', nameEn: 'Tak', lat: 16.8839, lng: 99.1259, zoom: 11 },
  nakhonsawan: { name: 'นครสวรรค์', nameEn: 'Nakhon Sawan', lat: 15.6930, lng: 100.1226, zoom: 11 },
  uthaithani: { name: 'อุทัยธานี', nameEn: 'Uthai Thani', lat: 15.3835, lng: 100.0245, zoom: 11 },

  // East & Beaches
  pattaya: { name: 'พัทยา / ชลบุรี', nameEn: 'Pattaya / Chon Buri', lat: 12.9276, lng: 100.8771, zoom: 12 },
  chonburi: { name: 'ชลบุรี (บางแสน/เกาะล้าน)', nameEn: 'Chon Buri', lat: 13.3611, lng: 100.9847, zoom: 12 },
  rayong: { name: 'ระยอง (เกาะเสม็ด)', nameEn: 'Rayong / Koh Samet', lat: 12.6815, lng: 101.2816, zoom: 11 },
  trat: { name: 'ตราด (เกาะช้าง/เกาะกูด)', nameEn: 'Trat / Koh Chang', lat: 12.0464, lng: 102.3275, zoom: 11 },
  chanthaburi: { name: 'จันทบุรี', nameEn: 'Chanthaburi', lat: 12.6114, lng: 102.1039, zoom: 11 },
  chachoengsao: { name: 'ฉะเชิงเทรา', nameEn: 'Chachoengsao', lat: 13.6904, lng: 101.0780, zoom: 11 },
  prachinburi: { name: 'ปราจีนบุรี', nameEn: 'Prachin Buri', lat: 14.0509, lng: 101.3733, zoom: 11 },
  sakaeo: { name: 'สระแก้ว', nameEn: 'Sa Kaeo', lat: 13.8140, lng: 102.0583, zoom: 11 },

  // West
  kanchanaburi: { name: 'กาญจนบุรี', nameEn: 'Kanchanaburi', lat: 14.0228, lng: 99.5328, zoom: 11 },
  ratchaburi: { name: 'ราชบุรี (สวนผึ้ง)', nameEn: 'Ratchaburi', lat: 13.5358, lng: 99.8164, zoom: 11 },
  huahin: { name: 'หัวหิน / ชะอำ', nameEn: 'Hua Hin / Cha-am', lat: 12.5684, lng: 99.9577, zoom: 12 },
  phetchaburi: { name: 'เพชรบุรี', nameEn: 'Phetchaburi', lat: 13.1114, lng: 99.9391, zoom: 11 },
  prachuap: { name: 'ประจวบคีรีขันธ์ (ปราณบุรี)', nameEn: 'Prachuap Khiri Khan', lat: 11.8124, lng: 99.7972, zoom: 11 },

  // South & Islands
  phuket: { name: 'ภูเก็ต', nameEn: 'Phuket', lat: 7.8804, lng: 98.3923, zoom: 11 },
  krabi: { name: 'กระบี่ (อ่าวนาง/เกาะพีพี)', nameEn: 'Krabi', lat: 8.0863, lng: 98.9063, zoom: 11 },
  samui: { name: 'เกาะสมุย / พะงัน / เต่า', nameEn: 'Koh Samui', lat: 9.5120, lng: 100.0136, zoom: 11 },
  suratthani: { name: 'สุราษฎร์ธานี (เขาสก/เชี่ยวหลาน)', nameEn: 'Surat Thani', lat: 9.1382, lng: 99.3215, zoom: 11 },
  phangnga: { name: 'พังงา (เขาหลัก/สิมิลัน)', nameEn: 'Phang Nga', lat: 8.4501, lng: 98.5255, zoom: 11 },
  hatyai: { name: 'หาดใหญ่ / สงขลา', nameEn: 'Hat Yai / Songkhla', lat: 7.0084, lng: 100.4767, zoom: 12 },
  songkhla: { name: 'สงขลา', nameEn: 'Songkhla', lat: 7.1898, lng: 100.5954, zoom: 12 },
  trang: { name: 'ตรัง', nameEn: 'Trang', lat: 7.5563, lng: 99.6114, zoom: 11 },
  satun: { name: 'สตูล (เกาะหลีเป๊ะ)', nameEn: 'Satun / Koh Lipe', lat: 6.6238, lng: 100.0674, zoom: 11 },
  chumphon: { name: 'ชุมพร', nameEn: 'Chumphon', lat: 10.4930, lng: 99.1800, zoom: 11 },
  ranong: { name: 'ระนอง', nameEn: 'Ranong', lat: 9.9658, lng: 98.6348, zoom: 11 },
  nakhonsithammarat: { name: 'นครศรีธรรมราช', nameEn: 'Nakhon Si Thammarat', lat: 8.4304, lng: 99.9631, zoom: 11 },
  phatthalung: { name: 'พัทลุง', nameEn: 'Phatthalung', lat: 7.6167, lng: 100.0740, zoom: 11 },

  // Northeast (Isan)
  khaoyai: { name: 'เขาใหญ่ / ปากช่อง', nameEn: 'Khao Yai', lat: 14.4392, lng: 101.3723, zoom: 11 },
  korat: { name: 'นครราชสีมา (โคราช)', nameEn: 'Nakhon Ratchasima', lat: 14.9799, lng: 102.0978, zoom: 11 },
  khonkaen: { name: 'ขอนแก่น', nameEn: 'Khon Kaen', lat: 16.4322, lng: 102.8236, zoom: 12 },
  udonthani: { name: 'อุดรธานี', nameEn: 'Udon Thani', lat: 17.4138, lng: 102.7872, zoom: 12 },
  ubonratchathani: { name: 'อุบลราชธานี', nameEn: 'Ubon Ratchathani', lat: 15.2448, lng: 104.8473, zoom: 11 },
  buriram: { name: 'บุรีรัมย์', nameEn: 'Buri Ram', lat: 14.9930, lng: 103.1029, zoom: 11 },
  surin: { name: 'สุรินทร์', nameEn: 'Surin', lat: 14.8818, lng: 103.4936, zoom: 11 },
  sisaket: { name: 'ศรีสะเกษ', nameEn: 'Si Sa Ket', lat: 15.1186, lng: 104.3220, zoom: 11 },
  nongkhai: { name: 'หนองคาย', nameEn: 'Nong Khai', lat: 17.8783, lng: 102.7420, zoom: 11 },
  nakhonphanom: { name: 'นครพนม', nameEn: 'Nakhon Phanom', lat: 17.3999, lng: 104.7695, zoom: 11 },
  sakonnakhon: { name: 'สกลนคร', nameEn: 'Sakon Nakhon', lat: 17.1611, lng: 104.1486, zoom: 11 },
  loei: { name: 'เลย (เชียงคาน/ภูกระดึง)', nameEn: 'Loei / Chiang Khan', lat: 17.8953, lng: 101.6547, zoom: 11 },
  mukdahan: { name: 'มุกดาหาร', nameEn: 'Mukdahan', lat: 16.5434, lng: 104.7235, zoom: 11 },
  mahasarakham: { name: 'มหาสารคาม', nameEn: 'Maha Sarakham', lat: 16.1852, lng: 103.3007, zoom: 11 },
  roiet: { name: 'ร้อยเอ็ด', nameEn: 'Roi Et', lat: 16.0538, lng: 103.6520, zoom: 11 },
  kalasin: { name: 'กาฬสินธุ์', nameEn: 'Kalasin', lat: 16.4328, lng: 103.5061, zoom: 11 },
  yasothon: { name: 'ยโสธร', nameEn: 'Yasothon', lat: 15.7926, lng: 104.1453, zoom: 11 },
  amnatcharoen: { name: 'อำนาจเจริญ', nameEn: 'Amnat Charoen', lat: 15.8585, lng: 104.6258, zoom: 11 },
  buengkan: { name: 'บึงกาฬ', nameEn: 'Bueng Kan', lat: 18.3611, lng: 103.6552, zoom: 11 },
  chiyaphum: { name: 'ชัยภูมิ', nameEn: 'Chaiyaphum', lat: 15.8105, lng: 102.0287, zoom: 11 },
  nongbualamphu: { name: 'หนองบัวลำภู', nameEn: 'Nong Bua Lam Phu', lat: 17.2036, lng: 102.4407, zoom: 11 },

  // Popular International
  tokyo: { name: 'โตเกียว (ญี่ปุ่น)', nameEn: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503, zoom: 11 },
  osaka: { name: 'โอซาก้า (ญี่ปุ่น)', nameEn: 'Osaka, Japan', lat: 34.6937, lng: 135.5023, zoom: 12 },
  kyoto: { name: 'เกียวโต (ญี่ปุ่น)', nameEn: 'Kyoto, Japan', lat: 35.0116, lng: 135.7681, zoom: 12 },
  hokkaido: { name: 'ฮอกไกโด (ซัปโปโร)', nameEn: 'Hokkaido, Japan', lat: 43.0618, lng: 141.3545, zoom: 11 },
  fukuoka: { name: 'ฟุกุโอกะ (ญี่ปุ่น)', nameEn: 'Fukuoka, Japan', lat: 33.5904, lng: 130.4017, zoom: 12 },
  seoul: { name: 'โซล (เกาหลีใต้)', nameEn: 'Seoul, South Korea', lat: 37.5665, lng: 126.9780, zoom: 12 },
  busan: { name: 'ปูซาน (เกาหลีใต้)', nameEn: 'Busan, South Korea', lat: 35.1796, lng: 129.0756, zoom: 12 },
  singapore: { name: 'สิงคโปร์', nameEn: 'Singapore', lat: 1.3521, lng: 103.8198, zoom: 12 },
  taipei: { name: 'ไทเป (ไต้หวัน)', nameEn: 'Taipei, Taiwan', lat: 25.0330, lng: 121.5654, zoom: 12 },
  hongkong: { name: 'ฮ่องกง', nameEn: 'Hong Kong', lat: 22.3193, lng: 114.1694, zoom: 12 },
  danang: { name: 'ดานัง (เวียดนาม)', nameEn: 'Da Nang, Vietnam', lat: 16.0544, lng: 108.2022, zoom: 12 },
  hanoi: { name: 'ฮานอย (เวียดนาม)', nameEn: 'Hanoi, Vietnam', lat: 21.0285, lng: 105.8542, zoom: 12 },
  saigon: { name: 'โฮจิมินห์ (เวียดนาม)', nameEn: 'Ho Chi Minh, Vietnam', lat: 10.8231, lng: 106.6297, zoom: 12 },
  bali: { name: 'บาหลี (อินโดนีเซีย)', nameEn: 'Bali, Indonesia', lat: -8.4095, lng: 115.1889, zoom: 11 },
  kualalumpur: { name: 'กัวลาลัมเปอร์ (มาเลเซีย)', nameEn: 'Kuala Lumpur', lat: 3.1390, lng: 101.6869, zoom: 12 },
  london: { name: 'ลอนดอน (อังกฤษ)', nameEn: 'London, UK', lat: 51.5074, lng: -0.1278, zoom: 12 },
  paris: { name: 'ปารีส (ฝรั่งเศส)', nameEn: 'Paris, France', lat: 48.8566, lng: 2.3522, zoom: 12 },
};

// Map of keywords and regexes pointing to key in POPULAR_DESTINATIONS
const KEYWORD_MAPPINGS: { pattern: RegExp; key: string }[] = [
  // Bangkok
  { pattern: /(กรุงเทพ|กทม|bangkok|bkk|พระนคร|krungthep|krung thep)/i, key: 'bangkok' },
  // Chiang Mai
  { pattern: /(เชียงใหม่|chiang\s*mai|chiangmai|cnx|นิมมาน|ดอยสุเทพ|ดอยอินทนนท์)/i, key: 'chiangmai' },
  // Phuket
  { pattern: /(ภูเก็ต|phuket|hkt|ป่าตอง|กะรน|กะตะ)/i, key: 'phuket' },
  // Pattaya & Chonburi
  { pattern: /(พัทยา|pattaya|เกาะล้าน|kohlarn|koh larn|บางแสน|bangsaen|สัตหีบ|ชลบุรี|chonburi)/i, key: 'pattaya' },
  // Hua Hin & Cha-am
  { pattern: /(หัวหิน|hua\s*hin|huahin|ปราณบุรี|ชะอำ|cha-am|chaam|ประจวบ)/i, key: 'huahin' },
  // Koh Samui & Surat
  { pattern: /(สมุย|samui|koh samui|พะงัน|phangan|koh tao|เกาะเต่า|สุราษฎร์|เขาสก|เชี่ยวหลาน)/i, key: 'samui' },
  // Krabi
  { pattern: /(กระบี่|krabi|อ่าวนาง|ao nang|พีพี|phi phi|เกาะลันตา|ไร่เลย์)/i, key: 'krabi' },
  // Khao Yai
  { pattern: /(เขาใหญ่|khao\s*yai|khaoyai|ปากช่อง|pak chong|โคราช|korat|นครราชสีมา)/i, key: 'khaoyai' },
  // Kanchanaburi
  { pattern: /(กาญจนบุรี|kanchanaburi|สังขละบุรี|ไทรโยค|เอราวัณ|สะพานข้ามแม่น้ำแคว)/i, key: 'kanchanaburi' },
  // Ayutthaya
  { pattern: /(อยุธยา|ayutthaya|กรุงเก่า)/i, key: 'ayutthaya' },
  // Nan
  { pattern: /(น่าน|nan|ปัว|บ่อเกลือ|สะปัน)/i, key: 'nan' },
  // Chiang Rai
  { pattern: /(เชียงราย|chiang\s*rai|chiangrai|cei|แม่สาย|ดอยตุง|ภูชี้ฟ้า|สามเหลี่ยมทองคำ)/i, key: 'chiangrai' },
  // Mae Hong Son / Pai
  { pattern: /(แม่ฮ่องสอน|mae\s*hong\s*son|ปาย|pai|ปางอุ๋ง)/i, key: 'maehongson' },
  // Rayong / Samet
  { pattern: /(ระยอง|rayong|เสม็ด|koh samet|เกาะเสม็ด)/i, key: 'rayong' },
  // Trat / Koh Chang
  { pattern: /(ตราด|trat|เกาะช้าง|koh chang|เกาะกูด|koh kood|เกาะหมาก)/i, key: 'trat' },
  // Khon Kaen
  { pattern: /(ขอนแก่น|khon\s*kaen|kku)/i, key: 'khonkaen' },
  // Udon Thani
  { pattern: /(อุดร|อุดรธานี|udon\s*thani|คำชะโนด)/i, key: 'udonthani' },
  // Ubon
  { pattern: /(อุบล|อุบลราชธานี|ubon)/i, key: 'ubonratchathani' },
  // Hat Yai & Songkhla
  { pattern: /(หาดใหญ่|hat\s*yai|สงขลา|songkhla)/i, key: 'hatyai' },
  // Loei
  { pattern: /(เชียงคาน|chiang\s*khan|เลย|loei|ภูกระดึง|ภูเรือ)/i, key: 'loei' },
  // Phetchabun
  { pattern: /(เขาค้อ|khao\s*kho|ภูทับเบิก|เพชรบูรณ์|phetchabun)/i, key: 'phetchabun' },
  // Satun / Koh Lipe
  { pattern: /(หลีเป๊ะ|lipe|koh lipe|สตูล|satun)/i, key: 'satun' },
  // Phang Nga
  { pattern: /(พังงา|phang\s*nga|เขาหลัก|khao lak|สิมิลัน|similan|สุรินทร์เกาะ)/i, key: 'phangnga' },
  // Suphan Buri
  { pattern: /(สุพรรณบุรี|suphan\s*buri)/i, key: 'suphanburi' },
  // Nakhon Pathom
  { pattern: /(นครปฐม|nakhon\s*pathom)/i, key: 'nakhonpathom' },
  // Nakhon Nayok
  { pattern: /(นครนายก|nakhon\s*nayok)/i, key: 'nakhonnayok' },
  // Nonthaburi
  { pattern: /(นนทบุรี|nonthaburi)/i, key: 'nonthaburi' },
  // Samut Prakan
  { pattern: /(สมุทรปราการ|samut\s*prakan|บางปู)/i, key: 'samutprakan' },
  // Ratchaburi
  { pattern: /(สวนผึ้ง|suan\s*phueng|ราชบุรี|ratchaburi)/i, key: 'ratchaburi' },

  // International
  { pattern: /(โตเกียว|tokyo)/i, key: 'tokyo' },
  { pattern: /(โอซาก้า|osaka)/i, key: 'osaka' },
  { pattern: /(เกียวโต|kyoto)/i, key: 'kyoto' },
  { pattern: /(ฮอกไกโด|ซัปโปโร|hokkaido|sapporo)/i, key: 'hokkaido' },
  { pattern: /(ฟุกุโอกะ|fukuoka)/i, key: 'fukuoka' },
  { pattern: /(โซล|seoul)/i, key: 'seoul' },
  { pattern: /(ปูซาน|busan)/i, key: 'busan' },
  { pattern: /(สิงคโปร์|singapore)/i, key: 'singapore' },
  { pattern: /(ไต้หวัน|ไทเป|taiwan|taipei)/i, key: 'taipei' },
  { pattern: /(ฮ่องกง|hong\s*kong)/i, key: 'hongkong' },
  { pattern: /(ดานัง|da\s*nang)/i, key: 'danang' },
  { pattern: /(ฮานอย|hanoi)/i, key: 'hanoi' },
  { pattern: /(บาหลี|bali)/i, key: 'bali' },
  { pattern: /(ลอนดอน|london)/i, key: 'london' },
  { pattern: /(ปารีส|paris)/i, key: 'paris' },
];

/**
 * Intelligent detector: infers the intended travel destination based on:
 * 1. Explicit destination field (if provided)
 * 2. Trip title/name
 * 3. Trip description
 * Returns the matched destination object or a default (Bangkok).
 */
export const detectTripDestination = (
  tripName: string = '',
  tripDescription: string = '',
  explicitDestination?: string
): DestinationInfo => {
  const combined = `${explicitDestination || ''} ${tripName} ${tripDescription}`.trim();

  // Test against keyword patterns
  for (const mapping of KEYWORD_MAPPINGS) {
    if (mapping.pattern.test(combined)) {
      const dest = POPULAR_DESTINATIONS[mapping.key];
      if (dest) return dest;
    }
  }

  // Fallback to Bangkok as standard default center for Thailand
  return POPULAR_DESTINATIONS.bangkok;
};

/**
 * Checks if a string has a recognizable destination
 */
export const getKnownDestinationKey = (text: string): string | null => {
  for (const mapping of KEYWORD_MAPPINGS) {
    if (mapping.pattern.test(text)) {
      return mapping.key;
    }
  }
  return null;
};

/**
 * Fetch coordinates dynamically from OpenStreetMap Nominatim with retry
 */
export const geocodeLocation = async (
  query: string,
  destinationHint?: string
): Promise<{ lat: number; lng: number; displayName: string } | null> => {
  if (!query || query.trim().length < 2) return null;

  try {
    const searchQuery = destinationHint && !query.includes(destinationHint)
      ? `${query}, ${destinationHint}`
      : query;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=1&accept-language=th,en&countrycodes=th`
    );

    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    }

    // Try again without country restriction if not found
    const globalRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1&accept-language=th,en`
    );
    const globalData = await globalRes.json();
    if (globalData && globalData.length > 0) {
      return {
        lat: parseFloat(globalData[0].lat),
        lng: parseFloat(globalData[0].lon),
        displayName: globalData[0].display_name,
      };
    }
  } catch (err) {
    console.warn('Geocoding failed for query:', query, err);
  }

  return null;
};

