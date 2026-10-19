"""
MobilityWare Solitaire CLI - Daily Challenge Crown Calendar & Trophies
"""

import calendar
import datetime
from typing import Dict, Any, List
from .renderer import (
    FELT_BG, STATUS_BG, ACCENT_GOLD, TEXT_WHITE, TEXT_MUTED, RESET, CanvasBuffer
)

class CalendarViewer:
    @staticmethod
    def render(storage_data: Dict[str, Any], year: int, month: int, term_width: int, term_height: int) -> CanvasBuffer:
        buf = CanvasBuffer(term_width, term_height)
        buf.clear(FELT_BG)

        # Header
        header_style = STATUS_BG + TEXT_WHITE
        buf.put_text(0, 0, " " * term_width, header_style)
        buf.put_text(0, 2, "👑 MOBILITYWARE DAILY CHALLENGES & TROPHIES", STATUS_BG + ACCENT_GOLD)

        month_name = calendar.month_name[month].upper()
        header_title = f" ─── {month_name} {year} "
        header_line = header_title + "─" * max(0, 58 - len(header_title))

        start_y = 3
        start_x = max(2, (term_width - 60) // 2)

        buf.put_text(start_y, start_x, header_line, FELT_BG + ACCENT_GOLD)
        start_y += 1

        day_headers = "  Sun   Mon   Tue   Wed   Thu   Fri   Sat"
        buf.put_text(start_y, start_x, day_headers, FELT_BG + TEXT_MUTED)
        start_y += 1

        # Month days & crowns
        month_key = f"{year:04d}-{month:02d}"
        crowns_info = storage_data.get("crowns", {}).get(month_key, {})
        completed_days = set(crowns_info.get("days_completed", []))
        trophy_unlocked = crowns_info.get("trophy_unlocked", "NONE")

        cal = calendar.monthcalendar(year, month)
        today = datetime.date.today()

        for week in cal:
            week_str = ""
            for day in week:
                if day == 0:
                    cell = "      "
                elif day in completed_days:
                    cell = " [👑] "
                elif day == today.day and month == today.month and year == today.year:
                    cell = f" ({day:02d}) "
                else:
                    cell = f"  {day:02d}  "
                week_str += cell

            buf.put_text(start_y, start_x, week_str, FELT_BG + TEXT_WHITE)
            start_y += 1

        start_y += 1
        buf.put_text(start_y, start_x, "─" * 58, FELT_BG + ACCENT_GOLD)
        start_y += 1

        # Trophy status
        trophy_badges = {
            "GOLD": "[★ GOLD TROPHY UNLOCKED ★]",
            "SILVER": "[★ SILVER TROPHY UNLOCKED ★]",
            "BRONZE": "[★ BRONZE TROPHY UNLOCKED ★]",
            "NONE": "[ Progress: Need 5 for Bronze, 10 for Silver, 20 for Gold ]"
        }
        trophy_label = trophy_badges.get(trophy_unlocked, trophy_badges["NONE"])
        trophy_style = FELT_BG + (ACCENT_GOLD if trophy_unlocked != "NONE" else TEXT_MUTED)
        buf.put_text(start_y, start_x, f"  CURRENT TROPHY: {trophy_label}", trophy_style)
        start_y += 2

        # Leveling & Jigsaw Meta-progression
        lev = storage_data.get("leveling", {})
        jig = storage_data.get("jigsaw_pieces", {})
        prof = storage_data.get("profile", {})

        meta_line1 = f"  PLAYER LEVEL: {lev.get('level', 75)}   TOTAL STARS: {lev.get('total_stars', 62300)} ★"
        buf.put_text(start_y, start_x, meta_line1, FELT_BG + ACCENT_GOLD)
        start_y += 1

        meta_line2 = f"  JIGSAW PUZZLE: {jig.get('current_puzzle', 'autumn_cabin')} ({jig.get('pieces_collected', 226)} pieces earned, {jig.get('puzzles_completed', 12)} completed)"
        buf.put_text(start_y, start_x, meta_line2, FELT_BG + TEXT_MUTED)
        start_y += 1

        meta_line3 = f"  CAREER WINS: {prof.get('games_won', 97)} / {prof.get('games_played', 159)}  |  BEST TIME: {prof.get('best_time_seconds', 52)}s"
        buf.put_text(start_y, start_x, meta_line3, FELT_BG + TEXT_WHITE)
        start_y += 2

        # Footer instructions
        buf.put_text(term_height - 2, start_x, "Press [Space] or [Enter] or [q] to return to board, or 'play' for Today's Deal", FELT_BG + TEXT_MUTED)

        return buf
