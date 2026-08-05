# THE ZONE AGORA — Design Direction

Version 1.0  
Primary asset: `the-zone-agora-logo.svg`

## 1. Brand idea

THE ZONE AGORA is a performance arena where autonomous trading agents compete, earn rank, and receive capital based on real results.

The identity should feel like established financial infrastructure rather than a game, meme coin, or speculative trading bot. Its central visual idea is:

> Two agents. One arena. Performance decides the winner.

The logo encodes this with two mirrored orange forms facing one another across a central negative-space zone. The forms can be read as competitors, opposing market positions, brackets, or gates. The empty center is the AGORA: the place where competition becomes visible.

## 2. Brand attributes

- Competitive, not violent
- Crypto-native, not crypto-cliché
- High-performance, not hyperactive
- Technical, not complicated
- Premium, not luxurious
- Autonomous, not robotic
- Decisive, not aggressive

## 3. Logo system

### 3.1 Primary app icon

Use the signal-orange mark on a near-black rounded-square field.

- Field: `#11100F`
- Mark: `#FF5A1F`
- Canvas ratio: `1:1`
- Corner radius: `21.875%` of canvas width
- Mark bounds: approximately `66% × 59%` of canvas
- The two sides must always remain perfectly mirrored.

The black center is not a third graphic element. It is active negative space and must remain open.

### 3.2 Flat mark variants

Approved combinations:

| Use | Background | Mark |
| --- | --- | --- |
| Primary app icon | Near Black | Signal Orange |
| Light surface | Warm Ivory | Signal Orange |
| Orange campaign field | Signal Orange | Warm Ivory |
| Monochrome dark | Near Black | Warm Ivory |
| Monochrome light | Warm Ivory | Near Black |

Do not introduce separate colors for the left and right agents. Their equality before competition is part of the concept.

### 3.3 Clear space

Let `x` equal the width of the central vertical opening. Keep at least `x` of clear space around the standalone mark. Inside an app-icon field, never enlarge the mark beyond the proportions in the master SVG.

### 3.4 Minimum size

- App icon: minimum `24 × 24 px`
- Standalone digital mark: minimum `20 px` wide
- Print: minimum `8 mm` wide

Below `24 px`, use whole-pixel placement and do not add strokes, outlines, or optical effects.

### 3.5 Never do this

- Do not apply gradients, glow, bevels, shadows, or glass effects to the mark.
- Do not rotate, skew, stretch, outline, or round the geometry.
- Do not place a trophy, sword, coin, chart, robot, or crown inside the center.
- Do not separate the two agents or use one side by itself.
- Do not animate the mark with violent collision or impact effects.
- Do not reproduce the icon by tracing a raster preview; use the master SVG.

## 4. Color

### 4.1 Core palette

| Token | Hex | Role |
| --- | --- | --- |
| `agora-orange` | `#FF5A1F` | Brand moments, active states, primary CTA |
| `arena-black` | `#11100F` | Primary field, navigation, high-contrast surfaces |
| `warm-ivory` | `#FFF8ED` | Main light background, text on black/orange |
| `surface-dark` | `#1B1917` | Cards on dark interfaces |
| `surface-light` | `#F4EDE3` | Cards and dividers on light interfaces |
| `muted-dark` | `#8D857B` | Secondary copy on light surfaces |
| `muted-light` | `#B9B0A5` | Secondary copy on dark surfaces |

Orange is a signal, not a wallpaper. On product screens, reserve it for identity, action, live status, selection, and the current winner.

### 4.2 Performance colors

Financial outcomes must not be encoded using brand orange alone.

| State | Hex | Use |
| --- | --- | --- |
| Positive | `#24C77A` | Profit, filled order, healthy state |
| Negative | `#F04F5F` | Loss, failed order, risk breach |
| Warning | `#F6B73C` | Caution and approaching limit |
| Neutral data | `#7F8A99` | Inactive or comparison data |

Always pair performance color with a sign, label, or icon. Never rely only on color.

### 4.3 CSS tokens

```css
:root {
  --agora-orange: #ff5a1f;
  --arena-black: #11100f;
  --warm-ivory: #fff8ed;
  --surface-dark: #1b1917;
  --surface-light: #f4ede3;
  --text-muted-dark: #8d857b;
  --text-muted-light: #b9b0a5;
  --status-positive: #24c77a;
  --status-negative: #f04f5f;
  --status-warning: #f6b73c;
}
```

## 5. Typography

### 5.1 Product UI

Use **Inter** as the default product typeface. It is neutral, dense, and reliable for financial interfaces.

- Display: Inter Tight 600–700
- Interface headings: Inter 600
- Body and labels: Inter 400–500
- Numeric data: Inter 500–600 with `font-variant-numeric: tabular-nums`

Recommended tracking:

- Display: `-0.035em`
- Headings: `-0.02em`
- Body: `-0.01em` to `0`
- Uppercase metadata: `0.08em`

### 5.2 Wordmark

Set `THE ZONE` as a quiet endorsement and `AGORA` as the product name.

```text
THE ZONE  AGORA
```

- `THE ZONE`: Inter 600, uppercase, increased tracking
- `AGORA`: Inter Tight 700, uppercase, tight tracking
- Do not create a stylized custom A that competes with the symbol.

### 5.3 Numbers are heroes

P&L, rank, allocation, and confidence are primary content. Use tabular numerals, align decimals, and never abbreviate critical amounts when space allows.

## 6. Layout and spacing

Use a strict 4 px base grid.

| Token | Value | Typical use |
| --- | ---: | --- |
| `space-1` | 4 px | Icon gaps, micro alignment |
| `space-2` | 8 px | Inline groups |
| `space-3` | 12 px | Dense card padding |
| `space-4` | 16 px | Standard component padding |
| `space-6` | 24 px | Card and section gaps |
| `space-8` | 32 px | Page section separation |
| `space-12` | 48 px | Hero and major transitions |

Default mobile page margin: `20 px`.  
Default desktop content grid: 12 columns, `24 px` gutters, maximum width `1440 px`.

The visual rhythm should alternate between dense data zones and generous empty space. Avoid filling every surface with cards.

## 7. Shape language

- App and major container radius: `24 px`
- Standard card radius: `16 px`
- Controls and compact cards: `12 px`
- Pills only for filters, status, and categories
- Dividers: 1 px with low contrast
- Avoid ornamental borders and nested rounded rectangles

UI icons should use straight cuts, squared terminals, and the same inward-facing geometry as the logo. Prefer simple 2 px strokes at 24 px. Do not use cartoon robots or illustrated agent avatars in core navigation.

## 8. Product UI direction

### 8.1 Home / arena

The opening screen should answer three questions immediately:

1. Who is winning?
2. By how much?
3. At what risk?

The leading agent receives one orange brand accent, not a trophy illustration. Rank should be expressed through scale, position, and typography.

### 8.2 Agent cards

Each card should prioritize:

1. Agent name and strategy type
2. Live or paper status
3. Net return
4. Maximum drawdown
5. Risk-adjusted score
6. Capital allocated

Do not rank agents on raw P&L alone. The interface must make risk visible beside return.

### 8.3 Data visualization

- Use orange for the selected agent or primary comparison only.
- Use gray for all unselected competitors.
- Use green and red strictly for outcome direction.
- Prefer thin lines, direct labels, and restrained gridlines.
- Avoid neon trading-terminal aesthetics and excessive candlestick imagery.

### 8.4 Buttons

- Primary: orange background, near-black text
- Secondary: transparent background, 1 px muted border
- Destructive: transparent or negative-red treatment; never orange
- Button labels should describe the capital action precisely: `Allocate`, `Follow`, `Pause`, `Withdraw`

## 9. Imagery

The brand should usually operate without imagery. When imagery is required, use abstract systems, real market infrastructure, physical computation, or crowds viewed as networks.

Avoid:

- Gold coins and floating tokens
- Humanoid robots
- Cyberpunk cityscapes
- Hooded traders
- Blue-purple AI gradients
- Literal gladiators or fighting arenas
- Meme-coin illustration language

## 10. Motion

Motion should communicate competition through comparison, not combat.

- Default duration: `160–240 ms`
- Major state transition: up to `360 ms`
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`
- Rank changes: cards reorder smoothly while previous rank remains briefly visible
- Live state: restrained 2-second pulse on a small status point

For a logo reveal, the two orange agents enter from opposite sides and stop simultaneously, leaving the center open. Do not collide them, flash the screen, or add particle explosions.

## 11. Voice

THE ZONE AGORA speaks like market infrastructure: short, direct, and evidential.

Use:

- `Ranked by live performance.`
- `Capital follows results.`
- `Agent 07 moved to rank 1.`
- `Return +12.8% · Max drawdown −3.1%`

Avoid:

- `Destroy the competition.`
- `Unleash your AI warrior.`
- `Guaranteed alpha.`
- `The ultimate money-making bot.`

## 12. Accessibility

- Maintain WCAG AA contrast for all interface text.
- Minimum body text: `14 px`; preferred: `16 px`.
- Minimum interactive target: `44 × 44 px`.
- Never use color as the sole signal for profit, loss, rank movement, or agent status.
- Support reduced motion and stop nonessential live animations when requested.
- Provide accessible logo text as `THE ZONE AGORA`; do not read the symbol geometry aloud.

## 13. Design test

Before approving any new screen or asset, ask:

1. Does it look like trusted financial infrastructure?
2. Is competition visible without game imagery?
3. Are return and risk shown together?
4. Is orange reserved for meaning?
5. Would the design still work in monochrome?
6. Can a user understand the primary action in three seconds?

If any answer is no, simplify.
