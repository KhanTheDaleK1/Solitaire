#!/usr/bin/env python3
"""
MobilityWare Solitaire CLI - Main Interactive Application & REPL
"""

import sys
import os
import tty
import termios
import select
import time
import argparse
import datetime
from typing import Optional, List, Tuple

from .engine import SolitaireEngine
from .renderer import SolitaireRenderer
from .audio import SoundHapticEngine
from .storage import StorageManager
from .calendar_view import CalendarViewer


class RawTerminal:
    """Context manager for raw terminal input with full restoration."""
    def __init__(self):
        self.fd = sys.stdin.fileno()
        self.old_settings = None

    def __enter__(self):
        try:
            self.old_settings = termios.tcgetattr(self.fd)
            tty.setcbreak(self.fd)
            # Switch to alternate screen buffer, clear screen, hide cursor
            sys.stdout.write("\033[?1049h\033[2J\033[H\033[?25h")
            sys.stdout.flush()
        except Exception:
            pass
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            # Leave alternate screen buffer, show cursor
            sys.stdout.write("\033[?1049l\033[?25h\033[0m")
            sys.stdout.flush()
            if self.old_settings:
                termios.tcsetattr(self.fd, termios.TCSADRAIN, self.old_settings)
        except Exception:
            pass


def get_daily_seed(date_str: Optional[str] = None) -> int:
    """Generates a deterministic 32-bit seed from a YYYYMMDD date."""
    if date_str:
        clean = date_str.replace("-", "").replace("/", "")
        return int(clean)
    now = datetime.date.today()
    return int(now.strftime("%Y%m%d"))


class SolitaireCLIApp:
    def __init__(self, draw_count: int = 1, seed: Optional[int] = None, is_daily: bool = False):
        self.draw_count = draw_count
        self.is_daily = is_daily
        self.daily_date_str = datetime.date.today().strftime("%Y-%m-%d") if is_daily else None
        self.seed = seed if seed is not None else (get_daily_seed(self.daily_date_str) if is_daily else None)

        self.engine = SolitaireEngine(draw_count=self.draw_count, seed=self.seed)
        self.renderer = SolitaireRenderer()
        self.audio = SoundHapticEngine()
        self.storage = StorageManager()

        self.message = "Welcome to MobilityWare Solitaire CLI! Press [d]raw to begin."
        self.running = True
        self.input_buffer = ""
        self.view_mode = "game" # "game" or "calendar"

    def run(self):
        with RawTerminal():
            self.loop()

    def loop(self):
        last_render_time = 0.0

        while self.running:
            now = time.time()
            if now - last_render_time > 0.08:
                self.render_current_view()
                last_render_time = now

            # Non-blocking poll for stdin keystrokes (up to 50ms timeout)
            r, _, _ = select.select([sys.stdin], [], [], 0.05)
            if r:
                char = sys.stdin.read(1)
                self.handle_input_char(char)

    def render_current_view(self):
        if self.view_mode == "calendar":
            today = datetime.date.today()
            buf = CalendarViewer.render(
                self.storage.data,
                today.year,
                today.month,
                self.renderer.term_width,
                self.renderer.term_height
            )
            buf.flush()
        else:
            self.renderer.render_board(self.engine, self.storage.data, self.message)
            # Position cursor at bottom prompt line after input buffer
            bot_y = self.renderer.term_height
            col_x = 14 + len(self.input_buffer)
            sys.stdout.write(f"\033[{bot_y};{col_x}H{self.input_buffer}")
            sys.stdout.flush()

    def handle_input_char(self, char: str):
        # Escape / Ctrl+C
        if char == '\x03' or char == '\x1b': # Ctrl+C or Esc
            if self.view_mode == "calendar":
                self.view_mode = "game"
                self.message = "Returned to game."
                return
            if self.input_buffer:
                self.input_buffer = ""
                return
            self.running = False
            return

        # Calendar View dismissal
        if self.view_mode == "calendar":
            if char in (' ', '\r', '\n', 'q', 'Q', 'c', 'C'):
                self.view_mode = "game"
                self.message = "Returned to game."
            return

        # Enter key -> execute command in input_buffer
        if char in ('\r', '\n'):
            cmd = self.input_buffer.strip()
            self.input_buffer = ""
            if cmd:
                self.execute_command(cmd)
            return

        # Backspace
        if char in ('\x7f', '\x08'):
            if self.input_buffer:
                self.input_buffer = self.input_buffer[:-1]
            return

        # If input buffer is currently empty, check single-key instant hotkeys
        if not self.input_buffer:
            # Space or 'd' -> Draw
            if char in (' ', 'd', 'D'):
                if self.engine.draw_card():
                    self.audio.card_slide()
                    self.message = "Drew card from Stock."
                else:
                    self.audio.invalid_action()
                    self.message = "Stock and Waste are both empty!"
                return

            # 'u' -> Undo
            if char in ('u', 'U'):
                ok, msg = self.engine.undo()
                if ok:
                    self.audio.valid_drop()
                else:
                    self.audio.invalid_action()
                self.message = msg
                return

            # 'h' -> Hint
            if char in ('h', 'H'):
                hint = self.engine.get_hint()
                self.audio.card_slide()
                self.message = f"HINT: {hint}"
                return

            # 'f' -> Finish / Autocomplete
            if char in ('f', 'F'):
                self.execute_finish()
                return

            # 'c' -> Calendar
            if char in ('c', 'C'):
                self.view_mode = "calendar"
                return

            # 'q' -> Quit
            if char in ('q', 'Q'):
                self.running = False
                return

            # Quick number keys 1..7 -> auto-move tableau column T1..T7
            if char in '1234567':
                col_name = f"T{char}"
                ok, msg = self.engine.auto_move(col_name)
                if ok:
                    self.audio.valid_drop()
                    self.message = f"Auto-moved from {col_name}!"
                    self.check_game_won()
                else:
                    self.audio.invalid_action()
                    self.message = f"{col_name}: {msg}"
                return

            # 'w' -> quick auto-move waste
            if char in ('w', 'W'):
                ok, msg = self.engine.auto_move('W')
                if ok:
                    self.audio.valid_drop()
                    self.message = "Auto-moved from Waste!"
                    self.check_game_won()
                else:
                    self.audio.invalid_action()
                    self.message = f"Waste: {msg}"
                return

        # Otherwise, append character to buffer for command line entry
        if 32 <= ord(char) <= 126:
            self.input_buffer += char

    def execute_command(self, cmd_line: str):
        tokens = cmd_line.strip().split()
        if not tokens:
            return

        cmd = tokens[0].lower()

        # 1. Draw
        if cmd in ('draw', 'd'):
            if self.engine.draw_card():
                self.audio.card_slide()
                self.message = "Drew card from Stock."
            else:
                self.audio.invalid_action()
                self.message = "Stock and Waste are both empty!"

        # 2. Move (e.g. "move W T3", "w 3", "t1 4", "t2:8h t5", "move 1 4")
        elif cmd in ('move', 'm') or (len(tokens) >= 2 and (cmd.startswith('t') or cmd.startswith('w') or cmd.startswith('f'))):
            src = tokens[0] if cmd not in ('move', 'm') else (tokens[1] if len(tokens) > 1 else '')
            dest = tokens[1] if cmd not in ('move', 'm') else (tokens[2] if len(tokens) > 2 else '')

            if not src or not dest:
                self.audio.invalid_action()
                self.message = "Usage: move <src> <dest> (e.g. 'move W T3' or 't1 t4')"
                return

            # Format shorthand numbers: '1' -> 'T1', '3' -> 'T3'
            if src.isdigit():
                src = f"T{src}"
            if dest.isdigit():
                dest = f"T{dest}"

            # Check if source contains card spec like 'T2:8H'
            card_spec = None
            if ':' in src:
                src, card_spec = src.split(':', 1)

            ok, msg = self.engine.move(src, dest, card_spec)
            if ok:
                if dest.upper().startswith('F'):
                    self.audio.foundation_placed()
                else:
                    self.audio.valid_drop()
                self.message = f"Moved {src} to {dest}."
                self.check_game_won()
            else:
                self.audio.invalid_action()
                self.message = f"Invalid move: {msg}"

        # 3. Auto-move (e.g. "auto T4", "a 4", "auto w")
        elif cmd in ('auto', 'a'):
            if len(tokens) < 2:
                self.audio.invalid_action()
                self.message = "Usage: auto <pile> (e.g. 'auto T4' or 'auto W')"
                return
            target = tokens[1]
            if target.isdigit():
                target = f"T{target}"
            ok, msg = self.engine.auto_move(target)
            if ok:
                self.audio.valid_drop()
                self.message = f"Auto-moved from {target}!"
                self.check_game_won()
            else:
                self.audio.invalid_action()
                self.message = f"{target}: {msg}"

        # 4. Finish / Autocomplete
        elif cmd in ('finish', 'f', 'autocomplete'):
            self.execute_finish()

        # 5. Undo
        elif cmd in ('undo', 'u'):
            ok, msg = self.engine.undo()
            if ok:
                self.audio.valid_drop()
            else:
                self.audio.invalid_action()
            self.message = msg

        # 6. Hint
        elif cmd in ('hint', 'h'):
            hint = self.engine.get_hint()
            self.audio.card_slide()
            self.message = f"HINT: {hint}"

        # 7. Calendar / Daily Challenge view
        elif cmd in ('calendar', 'c', 'daily', 'crowns'):
            self.view_mode = "calendar"

        # 8. New Game / Restart
        elif cmd in ('new', 'restart', 'deal'):
            self.engine.reset_game(self.seed)
            self.audio.card_slide()
            self.message = "Started a fresh hand."

        # 9. Import MobilityWare XML
        elif cmd == 'import' and len(tokens) > 1:
            file_path = tokens[1]
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        xml_content = f.read()
                    if self.storage.import_mobilityware_xml(xml_content):
                        self.audio.foundation_placed()
                        self.message = f"Successfully imported MobilityWare stats from {file_path}!"
                    else:
                        self.audio.invalid_action()
                        self.message = "Failed to parse XML file format."
                except Exception as e:
                    self.audio.invalid_action()
                    self.message = f"Error reading file: {e}"
            else:
                self.audio.invalid_action()
                self.message = f"File not found: {file_path}"

        # 10. Quit
        elif cmd in ('quit', 'exit', 'q'):
            self.running = False
        else:
            self.audio.invalid_action()
            self.message = f"Unknown command '{cmd}'. Try 'draw', 'move W T3', 'hint', or 'quit'."

    def execute_finish(self):
        """Runs the auto-finish sequence when conditions are met."""
        if not self.engine.can_auto_finish():
            self.audio.invalid_action()
            self.message = "Auto-finish is only available once all face-down cards are revealed!"
            return

        self.message = "Auto-finishing remaining cards..."
        while self.engine.auto_finish_step():
            self.audio.valid_drop()
            self.render_current_view()
            time.sleep(0.06)

        self.check_game_won()

    def check_game_won(self):
        if self.engine.check_win():
            elapsed = self.engine.get_elapsed_seconds()
            self.storage.record_game_result(
                won=True,
                score=self.engine.score,
                elapsed_seconds=elapsed,
                daily_date=self.daily_date_str
            )

            # Victory cascade animation
            self.renderer.animate_victory_cascade(self.audio)
            mins, secs = divmod(elapsed, 60)
            self.message = f"👑 VICTORY! Solved in {mins:02d}:{secs:02d} ({self.engine.moves} moves, Score: {self.engine.score})! Press [new] for next hand."


def main():
    parser = argparse.ArgumentParser(description="MobilityWare Solitaire CLI Terminal Client")
    parser.add_argument("--daily", action="store_true", help="Play Today's Daily Challenge")
    parser.add_argument("--seed", type=int, default=None, help="Specific game seed for deal generation")
    parser.add_argument("--draw", type=int, choices=[1, 3], default=1, help="Draw 1 or Draw 3 mode")
    parser.add_argument("--import-xml", dest="import_xml", type=str, default=None, help="Path to MobilityWare XML save file to import")

    args = parser.parse_args()

    # If import flag passed, import and exit
    if args.import_xml:
        storage = StorageManager()
        if os.path.exists(args.import_xml):
            with open(args.import_xml, 'r', encoding='utf-8') as f:
                content = f.read()
            if storage.import_mobilityware_xml(content):
                print(f"Successfully imported MobilityWare statistics from {args.import_xml}")
            else:
                print("Failed to parse MobilityWare XML file.")
        else:
            print(f"File not found: {args.import_xml}")
        sys.exit(0)

    app = SolitaireCLIApp(draw_count=args.draw, seed=args.seed, is_daily=args.daily)
    app.run()


if __name__ == "__main__":
    main()
