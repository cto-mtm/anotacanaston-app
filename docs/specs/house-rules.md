# Canastón House Rules — Authoritative Scoring Specification

> This is the user's house-rules spec for the Anota Canaston scorekeeper. It is **authoritative**:
> where it differs from `rules.txt` (standard Canastone, kept for background), THIS file wins.
> PLAN.md's "Rule interpretations" section resolves the ambiguities in this spec.

## Session setup ("hand" / partida)

- To start each session, specify: the **date**, the **players' names**, a tap/click to indicate who is the **lead (mano)**, who **deals**, and the **initial partnerships**.
- Canastón begins with the player who cuts the highest card becoming the mano (first to play); the player to their left deals.
- A 4-player session consists of **3 games** — one per partnership combination — keeping an **individual score record** for each player. A record of who starts and who deals defines the order for changing partners.
- **The dealer and the mano do not move** between games, unless it is the **last combination**, in which case the **dealer moves, but never the mano**.
- 6-player games: two teams of 3, 8 red threes in play (vs 6 in 4-player).

## Per-round scoring elements

### Cut and deal
- **Exact cut (+500):** if the person who cuts creates a pile from which the hands are dealt and sets the table exactly, add 500. Checkbox.
- **Misdeal (−500):** if the dealer deals incorrectly, a 500-point penalty. Checkbox.

### Red Threes (Honors)
Only 6 exist in a 4-player game, 8 in a 6-player game. Enter the quantity per team; scoring depends on the team's closed canastas:

- **Both clean and dirty canastas closed:**
  - 1–3 honors: **+100 each**
  - 4+ honors: **+200 each**
- **Only clean canastas closed:** honors worth **0**.
- **Only dirty canastas closed, or no canastas closed:**
  - 1 → −200 · 2 → −400 · 3 → −600 · 4 → −1,600 · 5 → −2,000 · 6 → −2,400
  - (pattern: −200/honor up to 3; −400/honor from 4 — extends to 7 → −2,800, 8 → −3,200)

### Black Threes (Tapas Negras)
- The only cards that prevent picking up the discard pile (pilón). Cannot be melded. Count as **5 points** each.
- **+300 extra on la ida** if the winner lays down all 6 black threes at once.

### Going Out (La Ida)
- Worth **+300**. Only valid if the team has **at least one clean AND one dirty canasta**.
- You must discard a card to go out; you cannot discard black 3s, deuces (patos), or jokers to go out.
- Checkbox to add the points.

### Bonus canastas (by total closed count)
- **Canastón:** 9 canastas closed → **+3,000**
- **Super Canastón:** 12 canastas closed → **+5,000**
- Included or not depending on the total number of closed canastas.

### Canasta base values
| Type | Points |
|---|---|
| Clean canasta (limpia) | 500 |
| Dirty canasta (sucia) | 300 |
| Joker canasta (6 jokers + 1 deuce) | 5,000 |
| Clean deuce (patos) canasta | 2,000 |
| Monkey canasta (canastón de mono — melded straight from hand, drawing only from stock, never taking the pilón) | 4,000 |
| Clean ace canasta | 1,000 |
| Dirty ace canasta | 500 |

Canastas can be closed with up to 2 wildcards (monos).

### Round scoring
- **No canastas closed:** all melded cards AND cards remaining in hand are NEGATIVE. The app flags this condition and requests the point count.
- **At least one canasta closed:** cards remaining in hand are negative — the app requests the hand points remaining **per player**. All melded cards are tallied as **positive** points.

### Card point values
| Cards | Points |
|---|---|
| Joker | 50 |
| Ace, 2 (pato) | 20 |
| 8, 9, 10, J, Q, K | 10 |
| 3, 4, 5, 6, 7 | 5 |
| Black 3 | 5 |

## Game & session structure

- Games are played to **15,000 points**. The partnership that reaches 15,000 first (or has the highest score above 15,000) wins the game.
- An **individual tally** per player (sum of their teams' scores across the games) determines the overall session winner.

## Initial meld requirements (puntos para bajar)

A player cannot take the pilón until fulfilling their opening-meld points. At the start of each round, notify each team of its threshold based on its current cumulative score:

| Cumulative score | Minimum meld |
|---|---|
| 1 – 3,000 | 50 — and only clean melds allowed: no trios with wildcards (monos); only a clean run of 2s or a clean joker meld may use wilds |
| 3,005 – 5,000 | 90 |
| 5,005 – 7,000 | 120 |
| 7,005 – 10,000 | 160 |
| 10,005 – 12,000 | 180 |
| 12,005 – 15,000 | 200 |

## Informational (display on the Rules page)

- If a deuce (pato) or joker is thrown into the pilón, the pile becomes **frozen (triado)** and must be picked up with a natural trio, not a pair. Deuces and jokers cannot be used to pick up the pile.
