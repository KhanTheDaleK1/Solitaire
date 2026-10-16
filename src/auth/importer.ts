import { UserStats } from '../game/types';

export interface ParsedSaveData {
  stats: UserStats;
  sourceType: 'mobilityware-xml' | 'mobilityware-statistics' | 'mobilityware-plist' | 'json' | 'sqlite' | 'text-kvd' | 'unknown';
  detectedFields: Record<string, number | string>;
  confidence: number;
}

export class MobilityWareImporter {
  /**
   * Main entrypoint to parse file text or ArrayBuffer from MobilityWare Solitaire
   */
  public static parse(content: string | ArrayBuffer): ParsedSaveData {
    if (content instanceof ArrayBuffer) {
      // Check if it's SQLite or text
      const uint8 = new Uint8Array(content);
      const header = String.fromCharCode(...uint8.slice(0, 16));
      if (header.startsWith('SQLite format 3')) {
        return this.parseSQLite(uint8);
      }
      // Try decoding as utf-8 string
      const decoder = new TextDecoder('utf-8');
      content = decoder.decode(uint8);
    }

    const trimmed = content.trim();

    // 1. MobilityWare Statistics XML (<statistics><category name="..."><stat name="...">)
    if (trimmed.includes('<statistics') || (trimmed.includes('<category') && trimmed.includes('<stat'))) {
      return this.parseMobilityWareStatisticsXml(trimmed);
    }

    // 2. Android shared_prefs XML (<map><int name="..." value="..." />)
    if (trimmed.includes('<map') || (trimmed.startsWith('<?xml') && trimmed.includes('<int'))) {
      return this.parseAndroidXml(trimmed);
    }

    // 3. iOS Plist XML (<plist><dict><key>...)
    if (trimmed.includes('<plist') || trimmed.includes('<!DOCTYPE plist')) {
      return this.parseApplePlist(trimmed);
    }

    // 4. JSON format
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return this.parseJson(trimmed);
    }

    // 5. Key-Value or plain text
    return this.parseKeyValueText(trimmed);
  }

  /**
   * Parses official MobilityWare Solitaire <statistics> XML format
   */
  public static parseMobilityWareStatisticsXml(xmlStr: string): ParsedSaveData {
    const detected: Record<string, number | string> = {};

    let totalWon = 0;
    let totalLost = 0;
    let shortestTimeSec: number | null = null;
    let highestScore = 0;
    let currentStreak = 0;
    let longestStreak = 0;

    // Match categories like <category name="Draw 1">...</category>
    const categoryRegex = /<category\s+name="([^"]+)">([\s\S]*?)<\/category>/g;
    let catMatch: RegExpExecArray | null;

    while ((catMatch = categoryRegex.exec(xmlStr)) !== null) {
      const catName = catMatch[1].trim();
      const catBody = catMatch[2];

      const statRegex = /<stat\s+name="([^"]+)"(?:\s+percentage="([^"]*)")?>([^<]*)<\/stat>/g;
      let statMatch: RegExpExecArray | null;

      while ((statMatch = statRegex.exec(catBody)) !== null) {
        const statName = statMatch[1].trim();
        const statVal = statMatch[3].trim();
        const fieldKey = `${catName} - ${statName}`;
        detected[fieldKey] = statVal;

        // Klondike Draw 1 or Draw 3 statistics
        if (catName.includes('Draw 1') || catName.includes('Draw 3')) {
          if (statName === 'Games Won') {
            const val = parseInt(statVal, 10);
            if (!isNaN(val)) totalWon += val;
          } else if (statName === 'Games Lost') {
            const val = parseInt(statVal, 10);
            if (!isNaN(val)) totalLost += val;
          } else if (statName === 'Shortest Winning Time') {
            const secs = this.parseTimeToSeconds(statVal);
            if (secs > 0 && (shortestTimeSec === null || secs < shortestTimeSec)) {
              shortestTimeSec = secs;
            }
          } else if (statName === 'High Standard Score' || statName.includes('High Score') || statName.includes('Score')) {
            const score = parseInt(statVal, 10);
            if (!isNaN(score) && score > highestScore) {
              highestScore = score;
            }
          } else if (statName === 'Current Winning Streak') {
            const streak = parseInt(statVal, 10);
            if (!isNaN(streak)) currentStreak = streak;
          } else if (statName === 'Longest Winning Streak') {
            const streak = parseInt(statVal, 10);
            if (!isNaN(streak) && streak > longestStreak) {
              longestStreak = streak;
            }
          }
        } else if (catName === 'Leveling') {
          if (statName === 'Level') detected['Level'] = parseInt(statVal, 10) || statVal;
          if (statName === 'Total Stars') detected['Stars'] = parseInt(statVal, 10) || statVal;
        }
      }
    }

    const gamesPlayed = totalWon + totalLost;
    if (longestStreak < currentStreak) {
      longestStreak = currentStreak;
    }

    return {
      stats: {
        gamesPlayed,
        gamesWon: totalWon,
        currentStreak,
        bestStreak: longestStreak,
        bestScore: highestScore,
        bestTime: shortestTimeSec
      },
      sourceType: 'mobilityware-statistics',
      detectedFields: detected,
      confidence: 100
    };
  }

  /**
   * Parse Android shared_prefs XML from com.mobilityware.solitaire
   */
  public static parseAndroidXml(xmlStr: string): ParsedSaveData {
    const detected: Record<string, number | string> = {};

    const regexTag = /<(int|long|string|boolean)\s+name="([^"]+)"(?:\s+value="([^"]*)")?(?:>([^<]*)<\/(?:int|long|string|boolean)>)?/g;
    let match: RegExpExecArray | null;

    while ((match = regexTag.exec(xmlStr)) !== null) {
      const key = match[2];
      const val = match[3] !== undefined ? match[3] : match[4] || '';
      const numVal = parseInt(val, 10);
      detected[key] = isNaN(numVal) ? val : numVal;
    }

    return this.mapDetectedToStats(detected, 'mobilityware-xml');
  }

  /**
   * Parse Apple .plist XML from iOS MobilityWare Solitaire
   */
  public static parseApplePlist(plistStr: string): ParsedSaveData {
    const detected: Record<string, number | string> = {};

    const regex = /<key>([^<]+)<\/key>\s*<(integer|real|string)>([^<]+)<\/(?:integer|real|string)>/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(plistStr)) !== null) {
      const key = match[1];
      const val = match[3];
      const num = parseInt(val, 10);
      detected[key] = isNaN(num) ? val : num;
    }

    return this.mapDetectedToStats(detected, 'mobilityware-plist');
  }

  /**
   * Parse JSON save backup
   */
  public static parseJson(jsonStr: string): ParsedSaveData {
    try {
      const raw = JSON.parse(jsonStr);
      const detected: Record<string, number | string> = {};

      const flatten = (obj: Record<string, unknown>, prefix = '') => {
        for (const [k, v] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${k}` : k;
          if (typeof v === 'number' || typeof v === 'string') {
            detected[fullKey] = v;
          } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            flatten(v as Record<string, unknown>, fullKey);
          }
        }
      };

      flatten(raw);
      return this.mapDetectedToStats(detected, 'json');
    } catch {
      return this.parseKeyValueText(jsonStr);
    }
  }

  /**
   * Parse SQLite database binary by scanning text strings and numbers
   */
  public static parseSQLite(bytes: Uint8Array): ParsedSaveData {
    const decoder = new TextDecoder('latin1');
    const text = decoder.decode(bytes);
    const detected: Record<string, number | string> = {};

    const keywords = [
      'gamesplayed', 'games_played', 'gameswon', 'games_won',
      'highscore', 'high_score', 'bestscore', 'best_score',
      'currentstreak', 'current_streak', 'winningstreak', 'winning_streak',
      'besttime', 'best_time', 'fastesttime'
    ];

    for (const kw of keywords) {
      const regex = new RegExp(`${kw}["'\\s:=]+(\\d+)`, 'gi');
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        detected[kw] = parseInt(m[1], 10);
      }
    }

    return this.mapDetectedToStats(detected, 'sqlite');
  }

  /**
   * Parse loose key: value text lines
   */
  public static parseKeyValueText(text: string): ParsedSaveData {
    const detected: Record<string, number | string> = {};
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      const parts = line.split(/[:=]/);
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const valStr = parts[1].trim();
        const secs = this.parseTimeToSeconds(valStr);
        detected[key] = secs > 0 ? secs : valStr;
      }
    }

    return this.mapDetectedToStats(detected, 'text-kvd');
  }

  /**
   * Converts time strings like "0:52", "1:37", "03:15" into seconds
   */
  public static parseTimeToSeconds(timeStr: string): number {
    if (!timeStr) return 0;
    const clean = timeStr.trim();
    if (clean.includes(':')) {
      const parts = clean.split(':').map(p => parseInt(p, 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] * 60 + parts[1];
      }
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }
    const num = parseInt(clean.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Map detected keys from MobilityWare / iOS / Android to Solitaire UserStats
   */
  private static mapDetectedToStats(
    detected: Record<string, number | string>,
    sourceType: ParsedSaveData['sourceType']
  ): ParsedSaveData {
    let gamesPlayed = 0;
    let gamesWon = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let bestScore = 0;
    let bestTime: number | null = null;
    let fieldsMatched = 0;

    for (const [rawKey, rawVal] of Object.entries(detected)) {
      const key = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      const numVal = typeof rawVal === 'number'
        ? rawVal
        : (String(rawVal).includes(':') ? this.parseTimeToSeconds(String(rawVal)) : parseInt(String(rawVal).replace(/[^0-9]/g, ''), 10));
      if (isNaN(numVal)) continue;

      if (key.includes('gamesplayed') || key === 'played' || key.includes('totalgames')) {
        gamesPlayed = Math.max(gamesPlayed, numVal);
        fieldsMatched++;
      } else if (key.includes('gameswon') || key === 'won' || key.includes('wins') || key.includes('totalwins')) {
        gamesWon = Math.max(gamesWon, numVal);
        fieldsMatched++;
      } else if (key.includes('currentstreak') || (key.includes('streak') && !key.includes('best') && !key.includes('max') && !key.includes('longest'))) {
        currentStreak = Math.max(currentStreak, numVal);
        fieldsMatched++;
      } else if (key.includes('beststreak') || key.includes('maxstreak') || key.includes('longeststreak') || key.includes('longestwinningstreak')) {
        bestStreak = Math.max(bestStreak, numVal);
        fieldsMatched++;
      } else if (key.includes('highscore') || key.includes('bestscore') || key.includes('topscore') || key === 'score' || key.includes('highstandardscore')) {
        bestScore = Math.max(bestScore, numVal);
        fieldsMatched++;
      } else if (key.includes('besttime') || key.includes('fastesttime') || key.includes('mintime') || key.includes('shortestwinningtime') || key.includes('shortesttime')) {
        let seconds = numVal;
        if (seconds > 360000) {
          seconds = Math.round(seconds / 1000);
        }
        if (bestTime === null || (seconds > 5 && seconds < bestTime)) {
          bestTime = seconds;
        }
        fieldsMatched++;
      }
    }

    // Sanity checks
    if (gamesWon > gamesPlayed && gamesPlayed > 0) {
      gamesPlayed = gamesWon;
    }
    if (bestStreak < currentStreak) {
      bestStreak = currentStreak;
    }

    const confidence = Math.min(100, fieldsMatched * 25);

    return {
      stats: {
        gamesPlayed,
        gamesWon,
        currentStreak,
        bestStreak,
        bestScore,
        bestTime
      },
      sourceType,
      detectedFields: detected,
      confidence
    };
  }
}
