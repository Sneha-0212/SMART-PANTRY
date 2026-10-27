# Recipe Suggestions module: integration notes

Plain HTML/CSS/JS. Open `recipes.html` directly in a browser. No build step.

## Files
| File | Role | Status |
|---|---|---|
| `recipes.html` | Page markup (sidebar and header kept as they were) | modified |
| `recipes.css` | Styles, every class prefixed `rs-` | new |
| `recipes.js` | UI: cards, filters, modal, states | new |
| `recipe-engine.js` | Matching, scoring, sections, filters (pure functions) | new |
| `recipe-inventory-adapter.js` | The only place that reads inventory | new |
| `recipe-data.js` | 17 sample recipes and demo inventory | new |

`app.js`, `style.css` and every other page are untouched.

## Connecting the real inventory (Member 3)
The page checks, on every load and refresh:
1. `window.SmartPantry.getInventory()`, a function returning an array or a Promise of one
2. `localStorage["smartPantry.inventory"]`, a JSON array
3. otherwise demo data (with a "Demo data" badge and demo panel)

Item shape: `{ id, name, quantity, unit, status: "fresh" | "use_soon" | "expired", expiryDate? }`

No `status`? It is derived from `daysLeft`, `expiryDate`, or `urgency: "critical" | "warning"`.

After changing inventory on the same page, call:
`window.dispatchEvent(new CustomEvent('smartpantry:inventory-changed'))`
Other tabs update automatically through the `storage` event.

Example (inventory.html):
```js
localStorage.setItem('smartPantry.inventory', JSON.stringify(items));
```

## Scoring
`score = matchPercent * 0.6 + min(useSoonCount * 15, 40)`
Constants and the staples list (salt, oil, basic spices) are at the top of `recipe-engine.js`.

## Recipe photos
Each recipe has an optional `image` field in `recipe-data.js`, for example
`image: "images/recipes/palak-paneer.jpg"`. Without it (or if it fails to load) an illustrated tile is shown.

## Demo tips
- `recipes.html?error=1` shows the error state once; "Try again" recovers.
- Open "Demo pantry" at the bottom to add, expire or remove items and watch the ranking update.
