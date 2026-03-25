import type { FanPortrait } from '../shared/types';

export function extractFanPortrait(): FanPortrait | null {
  const body = document.body.textContent ?? '';
  if (!body.includes('粉丝画像') && !body.includes('性别分布')) return null;

  // Gender: "男性 71%" or "71% 男性"
  const maleMatch = body.match(/男性?\s*(\d+)%|(\d+)%\s*男/);
  const femaleMatch = body.match(/女性?\s*(\d+)%|(\d+)%\s*女/);
  const male = parseInt(maleMatch?.[1] ?? maleMatch?.[2] ?? '0', 10);
  const female = parseInt(femaleMatch?.[1] ?? femaleMatch?.[2] ?? '0', 10);

  // Interests table: "兴趣 占比" then rows
  const interests: Array<{ interest: string; percentage: number }> = [];
  const interestRows = body.match(/(?:随拍|音乐|二次元|游戏|舞蹈|动物|明星|体育|时尚|美食)\s+(\d+)%/g);
  if (interestRows) {
    for (const row of interestRows) {
      const m = row.match(/(\S+)\s+(\d+)%/);
      if (m) interests.push({ interest: m[1], percentage: parseInt(m[2], 10) });
    }
  }

  // Provinces table
  const topProvinces: Array<{ province: string; percentage: number }> = [];
  const provinceRows = body.match(/(?:北京|广东|四川|山东|河南|浙江|江苏|福建|上海|湖北)\s+(\d+)%/g);
  if (provinceRows) {
    for (const row of provinceRows) {
      const m = row.match(/(\S+)\s+(\d+)%/);
      if (m) topProvinces.push({ province: m[1], percentage: parseInt(m[2], 10) });
    }
  }

  return {
    gender: { male, female },
    ageGroups: [], // Chart data hard to extract from DOM text
    topProvinces,
    devices: [],
    interests,
    activityLevels: [],
  };
}
