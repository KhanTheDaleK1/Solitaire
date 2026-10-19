"""
MobilityWare Solitaire CLI - Game Engine & Rules
"""

import time
from typing import List, Dict, Optional, Tuple, Any

SUITS = ['♠', '♥', '♣', '♦']
SUIT_NAMES = {'♠': 'spades', '♥': 'hearts', '♣': 'clubs', '♦': 'diamonds'}
RED_SUITS = {'♥', '♦'}
BLACK_SUITS = {'♠', '♣'}

RANK_LABELS = {
    1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
    8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K'
}
LABEL_TO_RANK = {v: k for k, v in RANK_LABELS.items()}

class Mulberry32:
    """Deterministic 32-bit PRNG for Daily Challenges."""
    def __init__(self, seed: int):
        self.state = seed & 0xFFFFFFFF

    def next_float(self) -> float:
        self.state = (self.state + 0x6D2B79F5) & 0xFFFFFFFF
        t = self.state
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61))) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    def randbelow(self, n: int) -> int:
        return int(self.next_float() * n)

    def shuffle(self, seq: list) -> None:
        for i in range(len(seq) - 1, 0, -1):
            j = self.randbelow(i + 1)
            seq[i], seq[j] = seq[j], seq[i]


class Card:
    def __init__(self, suit: str, rank: int, face_up: bool = False):
        self.suit = suit
        self.rank = rank
        self.face_up = face_up

    @property
    def is_red(self) -> bool:
        return self.suit in RED_SUITS

    @property
    def is_black(self) -> bool:
        return self.suit in BLACK_SUITS

    @property
    def label(self) -> str:
        return RANK_LABELS[self.rank]

    @property
    def short_str(self) -> str:
        if not self.face_up:
            return "???"
        return f"{self.label}{self.suit}"

    def __repr__(self) -> str:
        status = "U" if self.face_up else "D"
        return f"{self.label}{self.suit}({status})"


class MoveRecord:
    def __init__(
        self,
        cards: List[Card],
        src_pile: str,
        dest_pile: str,
        card_flipped: bool = False,
        score_change: int = 0,
        recycled_stock: bool = False
    ):
        self.cards = cards
        self.src_pile = src_pile
        self.dest_pile = dest_pile
        self.card_flipped = card_flipped
        self.score_change = score_change
        self.recycled_stock = recycled_stock


class SolitaireEngine:
    def __init__(self, draw_count: int = 1, seed: Optional[int] = None):
        self.draw_count = draw_count
        self.seed = seed
        self.stock: List[Card] = []
        self.waste: List[Card] = []
        self.foundations: List[List[Card]] = [[] for _ in range(4)] # ♠, ♥, ♣, ♦
        self.tableau: List[List[Card]] = [[] for _ in range(7)]
        self.history: List[MoveRecord] = []
        self.score: int = 0
        self.moves: int = 0
        self.start_time: Optional[float] = None
        self.elapsed_time: int = 0
        self.is_won: bool = False
        self.is_started: bool = False

        self.reset_game(seed)

    def reset_game(self, seed: Optional[int] = None) -> None:
        if seed is not None:
            self.seed = seed

        # Build clean 52-card deck
        deck = [Card(suit, rank, face_up=False) for suit in SUITS for rank in range(1, 14)]

        if self.seed is not None:
            rng = Mulberry32(self.seed)
            rng.shuffle(deck)
        else:
            import random
            random.shuffle(deck)

        self.stock = []
        self.waste = []
        self.foundations = [[] for _ in range(4)]
        self.tableau = [[] for _ in range(7)]
        self.history = []
        self.score = 0
        self.moves = 0
        self.start_time = None
        self.elapsed_time = 0
        self.is_won = False
        self.is_started = False

        # Deal to 7 Tableau columns
        for col in range(7):
            for row in range(col + 1):
                c = deck.pop()
                c.face_up = (row == col)
                self.tableau[col].append(c)

        # Remaining 24 cards become Stock
        self.stock = deck
        for c in self.stock:
            c.face_up = False

    def start_timer_if_needed(self) -> None:
        if not self.is_started:
            self.is_started = True
            self.start_time = time.time()

    def get_elapsed_seconds(self) -> int:
        if not self.is_started or self.start_time is None:
            return 0
        if self.is_won:
            return self.elapsed_time
        return int(time.time() - self.start_time)

    def draw_card(self) -> bool:
        """Draw cards from Stock to Waste."""
        self.start_timer_if_needed()

        if not self.stock:
            if not self.waste:
                return False
            # Recycle waste to stock
            recycled = list(reversed(self.waste))
            for c in recycled:
                c.face_up = False

            penalty = -100 if self.draw_count == 1 else -20
            self.score = max(0, self.score + penalty)
            self.stock = recycled
            self.waste = []
            self.moves += 1

            self.history.append(
                MoveRecord(
                    cards=[],
                    src_pile="W",
                    dest_pile="S",
                    score_change=penalty,
                    recycled_stock=True
                )
            )
            return True

        drawn_count = min(self.draw_count, len(self.stock))
        drawn_cards = []
        for _ in range(drawn_count):
            c = self.stock.pop()
            c.face_up = True
            drawn_cards.append(c)

        self.waste.extend(drawn_cards)
        self.moves += 1

        self.history.append(
            MoveRecord(
                cards=drawn_cards,
                src_pile="S",
                dest_pile="W",
                score_change=0
            )
        )
        return True

    def is_valid_tableau_move(self, cards: List[Card], col_idx: int) -> bool:
        if not cards or col_idx < 0 or col_idx > 6:
            return False
        col = self.tableau[col_idx]
        moving_card = cards[0]

        if not col:
            # Only King can be placed on empty tableau column
            return moving_card.rank == 13

        top_card = col[-1]
        if not top_card.face_up:
            return False

        # Must alternate color and be descending rank
        return (top_card.is_red != moving_card.is_red) and (top_card.rank == moving_card.rank + 1)

    def is_valid_foundation_move(self, card: Card, found_idx: int) -> bool:
        if found_idx < 0 or found_idx > 3:
            return False
        foundation = self.foundations[found_idx]
        expected_suit = SUITS[found_idx]

        if card.suit != expected_suit:
            return False

        if not foundation:
            # Must start with Ace (rank 1)
            return card.rank == 1

        top_card = foundation[-1]
        return card.rank == top_card.rank + 1

    def move(self, src: str, dest: str, card_spec: Optional[str] = None) -> Tuple[bool, str]:
        """
        Executes a move from src to dest.
        src: 'W', 'T1'-'T7', 'F1'-'F4'
        dest: 'T1'-'T7', 'F1'-'F4'
        card_spec: optional specific card indicator like '8H' or '8♥'
        """
        self.start_timer_if_needed()
        src = src.upper().strip()
        dest = dest.upper().strip()

        # Parse Source
        cards_to_move: List[Card] = []
        card_flipped = False
        score_change = 0

        if src == 'W':
            if not self.waste:
                return False, "Waste pile is empty"
            cards_to_move = [self.waste[-1]]
        elif src.startswith('T') and len(src) == 2 and src[1].isdigit():
            col_idx = int(src[1]) - 1
            if col_idx < 0 or col_idx > 6:
                return False, f"Invalid tableau column {src}"
            col = self.tableau[col_idx]
            if not col:
                return False, f"Tableau column {src} is empty"

            if card_spec:
                # Find matching card in column
                card_spec_clean = card_spec.upper().replace('♥', 'H').replace('♦', 'D').replace('♠', 'S').replace('♣', 'C')
                target_idx = -1
                for idx, c in enumerate(col):
                    if not c.face_up:
                        continue
                    suit_code = 'H' if c.suit == '♥' else ('D' if c.suit == '♦' else ('S' if c.suit == '♠' else 'C'))
                    c_code = f"{c.label}{suit_code}".upper()
                    if c_code == card_spec_clean or c.short_str.upper() == card_spec.upper():
                        target_idx = idx
                        break
                if target_idx == -1:
                    return False, f"Card {card_spec} not found or not face up in {src}"
                cards_to_move = col[target_idx:]
            else:
                # Default: find deepest movable stack or top card
                first_face_up = next((i for i, c in enumerate(col) if c.face_up), -1)
                if first_face_up == -1:
                    return False, f"No face-up cards in {src}"
                cards_to_move = col[first_face_up:]
        elif src.startswith('F') and len(src) == 2 and src[1].isdigit():
            f_idx = int(src[1]) - 1
            if f_idx < 0 or f_idx > 3 or not self.foundations[f_idx]:
                return False, f"Foundation {src} is empty"
            cards_to_move = [self.foundations[f_idx][-1]]
        else:
            return False, f"Unknown source {src}"

        # Parse & Validate Destination
        if dest.startswith('F'):
            if len(cards_to_move) != 1:
                return False, "Can only move one card at a time to a Foundation"
            f_idx = -1
            if len(dest) == 2 and dest[1].isdigit():
                f_idx = int(dest[1]) - 1
            else:
                # Auto-find matching foundation
                f_idx = SUITS.index(cards_to_move[0].suit)

            if not self.is_valid_foundation_move(cards_to_move[0], f_idx):
                return False, f"Cannot place {cards_to_move[0].short_str} onto Foundation {dest}"

            # Remove from source
            if src == 'W':
                self.waste.pop()
                score_change += 10
            elif src.startswith('T'):
                src_col = self.tableau[int(src[1]) - 1]
                src_col.pop()
                score_change += 10
                if src_col and not src_col[-1].face_up:
                    src_col[-1].face_up = True
                    card_flipped = True
                    score_change += 5
            elif src.startswith('F'):
                self.foundations[int(src[1]) - 1].pop()

            self.foundations[f_idx].append(cards_to_move[0])

        elif dest.startswith('T') and len(dest) == 2 and dest[1].isdigit():
            dest_col_idx = int(dest[1]) - 1
            if not self.is_valid_tableau_move(cards_to_move, dest_col_idx):
                # If moving a whole stack was invalid, try moving just the valid tail subset
                if len(cards_to_move) > 1:
                    moved_sub = False
                    for split_idx in range(len(cards_to_move) - 1, -1, -1):
                        sub_stack = cards_to_move[split_idx:]
                        if self.is_valid_tableau_move(sub_stack, dest_col_idx):
                            cards_to_move = sub_stack
                            moved_sub = True
                            break
                    if not moved_sub:
                        return False, f"Cannot place {cards_to_move[0].short_str} on Tableau {dest}"
                else:
                    return False, f"Cannot place {cards_to_move[0].short_str} on Tableau {dest}"

            # Remove from source
            if src == 'W':
                self.waste.pop()
                score_change += 5
            elif src.startswith('T'):
                src_col_idx = int(src[1]) - 1
                src_col = self.tableau[src_col_idx]
                cut_idx = len(src_col) - len(cards_to_move)
                del src_col[cut_idx:]
                if src_col and not src_col[-1].face_up:
                    src_col[-1].face_up = True
                    card_flipped = True
                    score_change += 5
            elif src.startswith('F'):
                self.foundations[int(src[1]) - 1].pop()
                score_change -= 15

            self.tableau[dest_col_idx].extend(cards_to_move)
        else:
            return False, f"Invalid destination {dest}"

        self.score = max(0, self.score + score_change)
        self.moves += 1

        self.history.append(
            MoveRecord(
                cards=cards_to_move,
                src_pile=src,
                dest_pile=dest,
                card_flipped=card_flipped,
                score_change=score_change
            )
        )

        self.check_win()
        return True, "Success"

    def auto_move(self, pile_code: str) -> Tuple[bool, str]:
        """Automatically moves a card from pile_code to Foundation or Tableau."""
        pile_code = pile_code.upper().strip()

        target_card: Optional[Card] = None
        src_cards: List[Card] = []

        if pile_code == 'W':
            if not self.waste:
                return False, "Waste is empty"
            target_card = self.waste[-1]
            src_cards = [target_card]
        elif pile_code.startswith('T') and len(pile_code) == 2 and pile_code[1].isdigit():
            col = self.tableau[int(pile_code[1]) - 1]
            if not col or not col[-1].face_up:
                return False, f"No accessible cards in {pile_code}"
            target_card = col[-1]
            src_cards = [target_card]
        else:
            return False, f"Auto-move not supported for {pile_code}"

        # 1. Try Foundation First
        for f_idx in range(4):
            if self.is_valid_foundation_move(target_card, f_idx):
                return self.move(pile_code, f"F{f_idx + 1}")

        # 2. Try Tableau
        if pile_code.startswith('T'):
            col = self.tableau[int(pile_code[1]) - 1]
            # Try full movable stacks
            for i in range(len(col)):
                if col[i].face_up:
                    candidate_stack = col[i:]
                    for dest_col in range(7):
                        if dest_col == int(pile_code[1]) - 1:
                            continue
                        if self.is_valid_tableau_move(candidate_stack, dest_col):
                            return self.move(pile_code, f"T{dest_col + 1}", candidate_stack[0].short_str)

        if pile_code == 'W':
            for dest_col in range(7):
                if self.is_valid_tableau_move([target_card], dest_col):
                    return self.move('W', f"T{dest_col + 1}")

        return False, "No valid moves found for this card"

    def undo(self) -> Tuple[bool, str]:
        """Revert the last move."""
        if not self.history:
            return False, "No moves to undo"

        last = self.history.pop()

        if last.recycled_stock:
            # Revert stock recycle
            self.waste = list(reversed(self.stock))
            for c in self.waste:
                c.face_up = True
            self.stock = []
        elif last.src_pile == 'S' and last.dest_pile == 'W':
            # Revert draw
            for _ in range(len(last.cards)):
                c = self.waste.pop()
                c.face_up = False
                self.stock.append(c)
        else:
            cards = last.cards
            # Remove from destination
            if last.dest_pile.startswith('F'):
                f_idx = int(last.dest_pile[1]) - 1
                for _ in range(len(cards)):
                    self.foundations[f_idx].pop()
            elif last.dest_pile.startswith('T'):
                t_idx = int(last.dest_pile[1]) - 1
                cut = len(self.tableau[t_idx]) - len(cards)
                del self.tableau[t_idx][cut:]

            # Unflip source card if flipped
            if last.card_flipped and last.src_pile.startswith('T'):
                src_col = self.tableau[int(last.src_pile[1]) - 1]
                if src_col:
                    src_col[-1].face_up = False

            # Restore to source
            if last.src_pile == 'W':
                self.waste.extend(cards)
            elif last.src_pile.startswith('T'):
                self.tableau[int(last.src_pile[1]) - 1].extend(cards)
            elif last.src_pile.startswith('F'):
                self.foundations[int(last.src_pile[1]) - 1].extend(cards)

        self.score = max(0, self.score - last.score_change)
        self.moves = max(0, self.moves - 1)
        self.is_won = False
        return True, "Move undone"

    def can_auto_finish(self) -> bool:
        """True when all cards in tableau are face-up and stock/waste are clear."""
        if self.stock or self.waste:
            return False
        for col in self.tableau:
            if any(not c.face_up for c in col):
                return False
        return not self.is_won

    def auto_finish_step(self) -> bool:
        """Moves one legal card from tableau to foundation."""
        for col_idx in range(7):
            col = self.tableau[col_idx]
            if col:
                card = col[-1]
                for f_idx in range(4):
                    if self.is_valid_foundation_move(card, f_idx):
                        self.move(f"T{col_idx + 1}", f"F{f_idx + 1}")
                        return True
        return False

    def get_hint(self) -> Optional[str]:
        """Calculates a high-value recommended move."""
        # 1. Waste to Foundation
        if self.waste:
            top_w = self.waste[-1]
            for f in range(4):
                if self.is_valid_foundation_move(top_w, f):
                    return f"Move Waste {top_w.short_str} to Foundation F{f + 1} (move W F{f + 1})"

        # 2. Tableau to Foundation
        for t_idx, col in enumerate(self.tableau):
            if col and col[-1].face_up:
                top_c = col[-1]
                for f in range(4):
                    if self.is_valid_foundation_move(top_c, f):
                        return f"Move Tableau T{t_idx + 1} ({top_c.short_str}) to Foundation F{f + 1} (move T{t_idx + 1} F{f + 1})"

        # 3. Tableau to Tableau revealing face-down card
        for src_idx, col in enumerate(self.tableau):
            first_up = next((i for i, c in enumerate(col) if c.face_up), -1)
            if first_up > 0: # has face-down card underneath
                stack = col[first_up:]
                for dest_idx in range(7):
                    if src_idx != dest_idx and self.is_valid_tableau_move(stack, dest_idx):
                        return f"Move T{src_idx + 1}:{stack[0].short_str} to T{dest_idx + 1} to reveal hidden card"

        # 4. Waste to Tableau
        if self.waste:
            top_w = self.waste[-1]
            for dest_idx in range(7):
                if self.is_valid_tableau_move([top_w], dest_idx):
                    return f"Move Waste {top_w.short_str} to Tableau T{dest_idx + 1}"

        # 5. Any other Tableau move
        for src_idx, col in enumerate(self.tableau):
            for i in range(len(col)):
                if col[i].face_up:
                    stack = col[i:]
                    if stack[0].rank == 13 and i == 0:
                        continue # King already on empty column
                    for dest_idx in range(7):
                        if src_idx != dest_idx and self.is_valid_tableau_move(stack, dest_idx):
                            return f"Move T{src_idx + 1}:{stack[0].short_str} to T{dest_idx + 1}"

        if self.stock or self.waste:
            return "No moves on table: draw a card from Stock (draw or Space)"
        return "No moves available"

    def check_win(self) -> bool:
        total_foundation = sum(len(f) for f in self.foundations)
        if total_foundation == 52:
            self.is_won = True
            if self.start_time is not None:
                self.elapsed_time = int(time.time() - self.start_time)
            return True
        return False
