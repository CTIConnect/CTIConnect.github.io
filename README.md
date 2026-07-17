# CTIConnect — Project Website

Source for the [CTIConnect](https://cticonnect.github.io/) project page.

**Paper:** CTIConnect: A Benchmark for Retrieval-Augmented LLMs over Heterogeneous Cyber Threat Intelligence (KDD 2026).
**Code & data:** https://github.com/peng-gao-lab/CTIConnect

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Structure

| Path | Contents |
|---|---|
| `index.html` | Single-page site |
| `css/styles.css` | Styling |
| `js/main.js` | Leaderboard, task examples, interactivity |
| `data/leaderboard.json` | Table III scores — edit to update leaderboard |
| `data/tasks.json` | Task definitions and worked examples |
| `assets/kb/` | CVE / CWE / CAPEC / MITRE ATT&CK logos |
| `assets/vendors/` | Featured vendor logos |
| `assets/figures/` | Pipeline figure |
| `.nojekyll` | Disables Jekyll on GitHub Pages |

## Updating

Edit files locally, then:

```bash
git add .
git commit -m "Update site"
git push
```

GitHub Pages redeploys automatically in ~1 minute.
