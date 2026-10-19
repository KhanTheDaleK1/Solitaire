"""
MobilityWare Solitaire CLI - ANSI Visual & Animation Engine
"""

import sys
import time
import math
import shutil
from typing import List, Tuple, Optional, Dict, Any
from .engine import Card, SUITS, RED_SUITS

# ANSI Color Codes
RESET = "\033[0m"

# Table Felt Color (Dark Forest Green)
FELT_BG = "\033[48;2;11;71;42m"
FELT_FG = "\033[38;2;11;71;42m"

# Card Stock (Bright White with Dark Ink)
CARD_BG = "\033[48;2;248;249;250m"
CARD_TEXT_BLACK = "\033[38;2;18;18;18m"
CARD_TEXT_RED = "\033[38;2;230;0;0m"
CARD_SHADOW = "\033[38;2;26;26;26m"

# Card Back (Royal Blue with Hatch Texture)
BACK_BG = "\033[48;2;16;52;166m"
BACK_FG = "\033[38;2;180;210;255m"

# Empty Slot Formatting
SLOT_BG = "\033[48;2;8;52;30m"
SLOT_FG = "\033[38;2;60;140;95m"

# Header & Accent
ACCENT_GOLD = "\033[38;2;251;191;36m"
TEXT_WHITE = "\033[38;2;255;255;255m"
TEXT_MUTED = "\033[38;2;148;163;184m"
STATUS_BG = "\033[48;2;5;25;15m"


class CanvasBuffer:
    """2D Character and style grid for double-buffered ANSI rendering."""
    def __init__(self, width: int = 100, height: int = 30):
        self.width = width
        self.height = height
        self.cells = [[' ' for _ in range(width)] for _ in range(height)]
        self.styles = [['' for _ in range(width)] for _ in range(height)]

    def clear(self, bg_style: str = FELT_BG):
        for r in range(self.height):
            for c in range(self.width):
                self.cells[r][c] = ' '
                self.styles[r][c] = bg_style

    def put_char(self, row: int, col: int, char: str, style: str = ''):
        if 0 <= row < self.height and 0 <= col < self.width:
            self.cells[row][col] = char
            self.styles[row][col] = style

    def put_text(self, row: int, col: int, text: str, style: str = ''):
        curr_col = col
        for ch in text:
            if 0 <= row < self.height and 0 <= curr_col < self.width:
                self.cells[row][curr_col] = ch
                self.styles[row][curr_col] = style
                curr_col += 1

    def flush(self, out=sys.stdout):
        """Flushes the entire double-buffered grid in a single pass to eliminate flicker."""
        lines = []
        for r in range(self.height):
            current_style = None
            line_parts = []
            for c in range(self.width):
                style = self.styles[r][c]
                if style != current_style:
                    line_parts.append(RESET + style)
                    current_style = style
                line_parts.append(self.cells[r][c])
            line_parts.append(RESET)
            lines.append("".join(line_parts))

        # Cursor home and dump
        out.write("\033[H" + "\n".join(lines))
        out.flush()


class SolitaireRenderer:
    def __init__(self):
        self.update_dimensions()
        self.buffer = CanvasBuffer(self.term_width, self.term_height)

    def update_dimensions(self):
        size = shutil.get_terminal_size((100, 30))
        self.term_width = max(80, size.columns)
        self.term_height = max(24, size.lines)
        if hasattr(self, 'buffer'):
            self.buffer = CanvasBuffer(self.term_width, self.term_height)

    def draw_card_face_up(self, row: int, col: int, card: Card, buffer: Optional[CanvasBuffer] = None):
        buf = buffer or self.buffer
        color_fg = CARD_TEXT_RED if card.is_red else CARD_TEXT_BLACK
        style = CARD_BG + color_fg

        # Format rank & suit corners
        # Top corner: left-aligned
        rank_str = card.label
        if len(rank_str) == 1:
            top_content = f"{rank_str} {card.suit}  "
            bot_content = f"  {card.suit} {rank_str}"
        else: # '10'
            top_content = f"{rank_str}{card.suit}  "
            bot_content = f"  {card.suit}{rank_str}"

        lines = [
            f"┌─────┐",
            f"│{top_content}│",
            f"│     │",
            f"│{bot_content}│",
            f"└─────┘"
        ]

        for r_idx, line in enumerate(lines):
            buf.put_text(row + r_idx, col, line, style)

    def draw_card_face_down(self, row: int, col: int, buffer: Optional[CanvasBuffer] = None):
        buf = buffer or self.buffer
        style = BACK_BG + BACK_FG
        lines = [
            "┌─────┐",
            "│░▒░▒░│",
            "│▒░▒░▒│",
            "│░▒░▒░│",
            "└─────┘"
        ]
        for r_idx, line in enumerate(lines):
            buf.put_text(row + r_idx, col, line, style)

    def draw_empty_slot(self, row: int, col: int, glyph: str = " ", buffer: Optional[CanvasBuffer] = None):
        buf = buffer or self.buffer
        style = SLOT_BG + SLOT_FG
        lines = [
            "┌ · · ┐",
            "·     ·",
            f"·  {glyph}  ·",
            "·     ·",
            "└ · · ┘"
        ]
        for r_idx, line in enumerate(lines):
            buf.put_text(row + r_idx, col, line, style)

    def render_board(self, engine, profile_data: Optional[Dict[str, Any]] = None, message: str = ""):
        self.update_dimensions()
        buf = self.buffer
        buf.clear(FELT_BG)

        # 1. Header Banner & Statistics
        header_style = STATUS_BG + TEXT_WHITE
        buf.put_text(0, 0, " " * self.term_width, header_style)

        title = "♠ MOBILITYWARE SOLITAIRE CLI"
        buf.put_text(0, 2, title, STATUS_BG + ACCENT_GOLD)

        elapsed = engine.get_elapsed_seconds()
        mins, secs = divmod(elapsed, 60)
        time_str = f"TIME: {mins:02d}:{secs:02d}"
        score_str = f"SCORE: {engine.score}"
        moves_str = f"MOVES: {engine.moves}"

        p = (profile_data or {}).get("profile", {})
        streak = p.get("current_streak", 0)
        wins = p.get("games_won", 0)
        streak_str = f"STREAK: {streak} | WINS: {wins}"

        stats_line = f"{score_str}   {time_str}   {moves_str}   {streak_str}"
        buf.put_text(0, self.term_width - len(stats_line) - 2, stats_line, header_style)

        # 2. Coordinates calculation
        # Standard card width = 7, spacing = 2 -> total width for 7 piles = 7 * 7 + 6 * 2 = 61 chars
        start_x = max(2, (self.term_width - 64) // 2)

        # Piles layout:
        # Top Row: Stock (start_x), Waste (start_x + 9), Spacers, Foundation 1..4 (start_x + 36, 45, 54, 63)
        top_y = 2

        # Stock Pile (S)
        buf.put_text(top_y - 1, start_x + 1, "[S] STOCK", FELT_BG + TEXT_MUTED)
        if engine.stock:
            self.draw_card_face_down(top_y, start_x, buf)
            # Show remaining count
            cnt_str = f"({len(engine.stock)})"
            buf.put_text(top_y + 2, start_x + 2, cnt_str, BACK_BG + TEXT_WHITE)
        else:
            self.draw_empty_slot(top_y, start_x, "↺", buf)

        # Waste Pile (W)
        waste_x = start_x + 9
        buf.put_text(top_y - 1, waste_x + 1, "[W] WASTE", FELT_BG + TEXT_MUTED)
        if engine.waste:
            self.draw_card_face_up(top_y, waste_x, engine.waste[-1], buf)
        else:
            self.draw_empty_slot(top_y, waste_x, "·", buf)

        # Foundations F1..F4
        foundations_start_x = start_x + 32
        for f_idx in range(4):
            fx = foundations_start_x + f_idx * 9
            suit_sym = SUITS[f_idx]
            buf.put_text(top_y - 1, fx + 1, f"[F{f_idx + 1}]", FELT_BG + TEXT_MUTED)
            foundation = engine.foundations[f_idx]
            if foundation:
                self.draw_card_face_up(top_y, fx, foundation[-1], buf)
            else:
                self.draw_empty_slot(top_y, fx, suit_sym, buf)

        # 3. Tableau Columns T1..T7
        tableau_y = top_y + 6
        for col_idx in range(7):
            tx = start_x + col_idx * 9
            col = engine.tableau[col_idx]
            buf.put_text(tableau_y - 1, tx + 1, f"[T{col_idx + 1}]", FELT_BG + TEXT_MUTED)

            if not col:
                self.draw_empty_slot(tableau_y, tx, "·", buf)
                continue

            current_row = tableau_y
            for i, card in enumerate(col):
                if not card.face_up:
                    # Face-down overlap: top 1-2 rows
                    style = BACK_BG + BACK_FG
                    buf.put_text(current_row, tx, "┌─────┐", style)
                    buf.put_text(current_row + 1, tx, "│░▒░▒░│", style)
                    current_row += 1
                else:
                    # If this is the last card, draw full 5 rows
                    if i == len(col) - 1:
                        self.draw_card_face_up(current_row, tx, card, buf)
                        current_row += 5
                    else:
                        # Cascade 2 rows offset with rank/suit header
                        color_fg = CARD_TEXT_RED if card.is_red else CARD_TEXT_BLACK
                        style = CARD_BG + color_fg
                        rank_str = card.label
                        top_content = f"{rank_str} {card.suit}  " if len(rank_str) == 1 else f"{rank_str}{card.suit}  "
                        buf.put_text(current_row, tx, "┌─────┐", style)
                        buf.put_text(current_row + 1, tx, f"│{top_content}│", style)
                        current_row += 2

        # 4. Bottom Controls & Message Bar
        bot_y = self.term_height - 3
        buf.put_text(bot_y, 0, "─" * self.term_width, FELT_BG + TEXT_MUTED)

        if message:
            msg_style = STATUS_BG + ACCENT_GOLD
            buf.put_text(bot_y + 1, 2, f"➤ {message}", msg_style)
        else:
            hint_txt = "Commands: [d]raw | [m]ove <src> <dest> | [a]uto <col> | [u]ndo | [h]int | [f]inish | [c]alendar | [q]uit"
            buf.put_text(bot_y + 1, 2, hint_txt, FELT_BG + TEXT_WHITE)

        prompt_txt = "solitaire> "
        buf.put_text(bot_y + 2, 2, prompt_txt, STATUS_BG + TEXT_WHITE)

        buf.flush()

    def animate_flip(self, row: int, col: int, card: Card):
        """Card Flip (120ms, 5 frames) as specified in Section 2."""
        frames = [
            # Frame 1 (Full): Face-down width 7
            ("┌─────┐", "│░▒░▒░│", "│▒░▒░▒│", "│░▒░▒░│", "└─────┘", BACK_BG + BACK_FG, 0),
            # Frame 2 (Collapse): Width 3 centered
            (" ┌─┐ ", " │░│ ", " │▒│ ", " │░│ ", " └─┘ ", BACK_BG + BACK_FG, 0),
            # Frame 3 (Edge): Single vertical border
            ("  │  ", "  │  ", "  │  ", "  │  ", "  │  ", BACK_BG + TEXT_WHITE, 0),
            # Frame 4 (Expand): Width 3 with new suit/rank hint
            (" ┌─┐ ", f" │{card.suit}│ ", " │ │ ", f" │{card.label}│ ", " └─┘ ", CARD_BG + (CARD_TEXT_RED if card.is_red else CARD_TEXT_BLACK), 0),
            # Frame 5 (Full): Face-up width 7
            ("┌─────┐", f"│{card.label}{card.suit}   │", "│     │", f"│   {card.suit}{card.label}│", "└─────┘", CARD_BG + (CARD_TEXT_RED if card.is_red else CARD_TEXT_BLACK), 0)
        ]

        for frame in frames:
            f_lines, style = frame[0:5], frame[5]
            for idx, line in enumerate(f_lines):
                self.buffer.put_text(row + idx, col, line, style)
            self.buffer.flush()
            time.sleep(0.024) # ~120ms / 5

    def animate_victory_cascade(self, audio_engine=None):
        """
        Victory Cascade ('Card Waterfall') as specified in Section 2:
        Kinematic loop: x_{t+1} = x_t + v_x, y_{t+1} = y_t + v_y, v_y = v_y + g
        Bounce when y exceeds floor with restitution e = -0.75.
        Cards paint trail without clearing screen.
        """
        sys.stdout.write("\033[?25l") # Hide cursor
        sys.stdout.flush()

        width = self.term_width
        height = self.term_height - 2
        floor_y = height - 5

        # 4 suits foundation positions
        start_x = max(2, (width - 64) // 2)
        foundations_x = [start_x + 32 + i * 9 for i in range(4)]
        start_y = 2

        deck_cards = [Card(suit, rank, face_up=True) for rank in range(13, 0, -1) for suit in SUITS]

        gravity = 0.65
        restitution = -0.75

        # Animate cards cascading down in sequence
        for card_idx, card in enumerate(deck_cards[:24]):
            f_idx = SUITS.index(card.suit)
            x = float(foundations_x[f_idx])
            y = float(start_y)
            import random
            vx = (random.random() - 0.5) * 5.0 + (3.0 if f_idx >= 2 else -3.0)
            vy = -(random.random() * 2.5 + 1.0)

            card_fg = CARD_TEXT_RED if card.is_red else CARD_TEXT_BLACK
            card_style = CARD_BG + card_fg

            lines = [
                "┌─────┐",
                f"│{card.label}{card.suit}   │",
                "│     │",
                f"│   {card.suit}{card.label}│",
                "└─────┘"
            ]

            bounces = 0
            while bounces < 4 and -10 < x < width + 10:
                int_x = int(x)
                int_y = int(y)

                # Overwrite directly to terminal without clearing, creating the iconic retro waterfall
                if 0 <= int_y < height and 0 <= int_x < width - 7:
                    for r_idx, line in enumerate(lines):
                        if int_y + r_idx < height:
                            sys.stdout.write(f"\033[{int_y + r_idx + 1};{int_x + 1}H{card_style}{line}{RESET}")
                    sys.stdout.flush()

                x += vx
                y += vy
                vy += gravity

                if y >= floor_y:
                    y = float(floor_y)
                    vy = vy * restitution
                    bounces += 1
                    if audio_engine:
                        audio_engine.win_cascade_bounce()

                time.sleep(0.012)

        sys.stdout.write("\033[?25h") # Show cursor
        sys.stdout.flush()
