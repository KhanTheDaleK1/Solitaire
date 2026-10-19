"""
MobilityWare Solitaire CLI - Audio & Haptic Feedback Engine
"""

import os
import sys
import time
import subprocess
from typing import Optional

class SoundHapticEngine:
    def __init__(self, sound_enabled: bool = True, haptics_enabled: bool = True):
        self.sound_enabled = sound_enabled
        self.haptics_enabled = haptics_enabled
        self.is_mac = sys.platform == 'darwin'

    def _play_mac_sound(self, sound_name: str) -> None:
        if not self.sound_enabled or not self.is_mac:
            return
        sound_path = f"/System/Library/Sounds/{sound_name}.aiff"
        if os.path.exists(sound_path):
            try:
                # Play asynchronously in background without blocking
                subprocess.Popen(
                    ['afplay', sound_path],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except Exception:
                pass

    def card_slide(self) -> None:
        """Card draw / slide sound."""
        if not self.sound_enabled:
            return
        self._play_mac_sound('Pop')

    def valid_drop(self) -> None:
        """Card drop / placement snap."""
        if not self.sound_enabled:
            return
        # Terminal bell or Tink sound
        if self.is_mac:
            self._play_mac_sound('Tink')
        else:
            sys.stdout.write('\a')
            sys.stdout.flush()

    def foundation_placed(self) -> None:
        """Ascending foundation placement chime."""
        if not self.sound_enabled:
            return
        if self.is_mac:
            self._play_mac_sound('Hero')
        else:
            sys.stdout.write('\a\a')
            sys.stdout.flush()

    def invalid_action(self) -> None:
        """Invalid move buzz / visual flash."""
        if self.haptics_enabled:
            # ANSI Visual Flash: Invert screen, short pause, restore
            try:
                sys.stdout.write('\033[?5h') # Reverse video mode on
                sys.stdout.flush()
                time.sleep(0.04)
                sys.stdout.write('\033[?5l') # Reverse video mode off
                sys.stdout.flush()
            except Exception:
                pass

        if self.sound_enabled:
            if self.is_mac:
                self._play_mac_sound('Basso')
            else:
                sys.stdout.write('\a')
                sys.stdout.flush()

    def win_cascade_bounce(self) -> None:
        """Audio trigger during victory card bounce."""
        if not self.sound_enabled:
            return
        if self.is_mac:
            self._play_mac_sound('Ping')
        else:
            sys.stdout.write('\a')
            sys.stdout.flush()
