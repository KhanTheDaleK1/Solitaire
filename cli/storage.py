"""
MobilityWare Solitaire CLI - Profile, Crowns, and Daily Challenge Storage
"""

import os
import json
import re
from typing import Dict, Any, Optional

DEFAULT_CONFIG_DIR = os.path.expanduser("~/.config/solitaire")
PROFILE_FILE = os.path.join(DEFAULT_CONFIG_DIR, "profile.json")

INITIAL_PROFILE: Dict[str, Any] = {
    "profile": {
        "games_played": 159,
        "games_won": 97,
        "current_streak": 0,
        "longest_streak": 7,
        "best_score": 14061,
        "best_time_seconds": 52
    },
    "crowns": {
        "2026-10": {
            "days_completed": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
            "trophy_unlocked": "GOLD"
        }
    },
    "jigsaw_pieces": {
        "current_puzzle": "autumn_cabin",
        "pieces_collected": 226,
        "puzzles_completed": 12,
        "badges_earned": 6
    },
    "leveling": {
        "level": 75,
        "total_stars": 62300,
        "stars_to_next_level": 890
    }
}


class StorageManager:
    def __init__(self, file_path: str = PROFILE_FILE):
        self.file_path = file_path
        self.data: Dict[str, Any] = self.load()

    def load(self) -> Dict[str, Any]:
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass

        # Ensure directory exists and save initial profile
        try:
            os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump(INITIAL_PROFILE, f, indent=2)
        except Exception:
            pass

        return json.loads(json.dumps(INITIAL_PROFILE))

    def save(self) -> None:
        try:
            os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2)
        except Exception:
            pass

    def record_game_result(self, won: bool, score: int, elapsed_seconds: int, daily_date: Optional[str] = None) -> None:
        p = self.data.setdefault("profile", {})
        p["games_played"] = p.get("games_played", 0) + 1

        if won:
            p["games_won"] = p.get("games_won", 0) + 1
            p["current_streak"] = p.get("current_streak", 0) + 1
            if p["current_streak"] > p.get("longest_streak", 0):
                p["longest_streak"] = p["current_streak"]

            if score > p.get("best_score", 0):
                p["best_score"] = score

            best_time = p.get("best_time_seconds")
            if best_time is None or elapsed_seconds < best_time:
                p["best_time_seconds"] = elapsed_seconds

            # Leveling stars
            lev = self.data.setdefault("leveling", {})
            lev["total_stars"] = lev.get("total_stars", 0) + 150
            if lev.get("stars_to_next_level", 890) <= 150:
                lev["level"] = lev.get("level", 1) + 1
                lev["stars_to_next_level"] = 1000
            else:
                lev["stars_to_next_level"] -= 150

            # If Daily Challenge game won, reward crown
            if daily_date:
                # daily_date format "YYYY-MM-DD"
                try:
                    year_month, day_str = daily_date.rsplit('-', 1)
                    day = int(day_str)
                    crowns = self.data.setdefault("crowns", {})
                    month_data = crowns.setdefault(year_month, {"days_completed": [], "trophy_unlocked": "NONE"})
                    if day not in month_data["days_completed"]:
                        month_data["days_completed"].append(day)
                        month_data["days_completed"].sort()

                    count = len(month_data["days_completed"])
                    if count >= 20:
                        month_data["trophy_unlocked"] = "GOLD"
                    elif count >= 10:
                        month_data["trophy_unlocked"] = "SILVER"
                    elif count >= 5:
                        month_data["trophy_unlocked"] = "BRONZE"
                except Exception:
                    pass
        else:
            p["current_streak"] = 0

        self.save()

    def import_mobilityware_xml(self, xml_text: str) -> bool:
        """Parses MobilityWare XML and updates profile data."""
        try:
            total_won = 0
            total_lost = 0
            shortest_time = None
            high_score = 0
            current_streak = 0
            longest_streak = 0

            cat_regex = re.compile(r'<category\s+name="([^"]+)">([\s\S]*?)</category>')
            stat_regex = re.compile(r'<stat\s+name="([^"]+)"(?:\s+percentage="([^"]*)")?>([^<]*)</stat>')

            for cat_match in cat_regex.finditer(xml_text):
                cat_name = cat_match.group(1)
                cat_body = cat_match.group(2)

                for stat_match in stat_regex.finditer(cat_body):
                    s_name = stat_match.group(1).strip()
                    s_val = stat_match.group(3).strip()

                    if 'Draw 1' in cat_name or 'Draw 3' in cat_name:
                        if s_name == 'Games Won':
                            total_won += int(s_val) if s_val.isdigit() else 0
                        elif s_name == 'Games Lost':
                            total_lost += int(s_val) if s_val.isdigit() else 0
                        elif s_name == 'Shortest Winning Time' and ':' in s_val:
                            parts = [int(p) for p in s_val.split(':') if p.isdigit()]
                            if len(parts) == 2 and (parts[0] > 0 or parts[1] > 0):
                                secs = parts[0] * 60 + parts[1]
                                if shortest_time is None or secs < shortest_time:
                                    shortest_time = secs
                        elif s_name == 'High Standard Score' and s_val.isdigit():
                            high_score = max(high_score, int(s_val))
                        elif s_name == 'Current Winning Streak' and s_val.isdigit():
                            current_streak = int(s_val)
                        elif s_name == 'Longest Winning Streak' and s_val.isdigit():
                            longest_streak = max(longest_streak, int(s_val))
                    elif cat_name == 'Leveling':
                        if s_name == 'Level' and s_val.isdigit():
                            self.data.setdefault('leveling', {})['level'] = int(s_val)
                        elif s_name == 'Total Stars' and s_val.isdigit():
                            self.data.setdefault('leveling', {})['total_stars'] = int(s_val)
                    elif cat_name == 'Jigsaw Events':
                        if s_name == 'Pieces Earned' and s_val.isdigit():
                            self.data.setdefault('jigsaw_pieces', {})['pieces_collected'] = int(s_val)
                        elif s_name == 'Puzzles Completed' and s_val.isdigit():
                            self.data.setdefault('jigsaw_pieces', {})['puzzles_completed'] = int(s_val)

            p = self.data.setdefault("profile", {})
            p["games_played"] = total_won + total_lost
            p["games_won"] = total_won
            p["current_streak"] = current_streak
            p["longest_streak"] = max(longest_streak, current_streak)
            p["best_score"] = high_score
            if shortest_time:
                p["best_time_seconds"] = shortest_time

            self.save()
            return True
        except Exception:
            return False
