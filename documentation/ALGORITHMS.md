# Understanding the Algorithms

Three ways to teach an AI agent to solve mazes.

---

## Q-Learning (Fastest)

**What it does:** Learns the best move for every position by trying different actions.

**How it works:**
1. Agent starts at beginning of maze
2. Tries moving in different directions
3. Remembers which moves lead to success
4. Gets smarter with each attempt

**When to use:** Most of the time! It's fast and reliable.

**Settings:**
- Episodes: 1000
- Learning rate (α): 0.3
- Discount (γ): 0.99
- Exploration (ε): 0.15

---

## SARSA (Safer)

**What it does:** Similar to Q-Learning but more careful.

**How it works:**
1. Learns while being cautious
2. Considers that it might explore randomly
3. Develops safer paths

**When to use:** When you want the agent to be more conservative.

**Settings:**
- Episodes: 1200 (needs more practice)
- Learning rate (α): 0.25 (slower learning)
- Discount (γ): 0.99
- Exploration (ε): 0.18 (explores more)

---

## Monte Carlo (Most Episodes)

**What it does:** Learns from complete maze runs.

**How it works:**
1. Runs through entire maze
2. Waits until end to learn
3. Updates based on total result

**When to use:** When you have time for lots of training episodes.

**Settings:**
- Episodes: 5000 (needs many attempts)
- Discount (γ): 0.99
- Exploration: Starts high (0.3), decreases over time

---

## Quick Comparison

| Algorithm | Speed | Episodes Needed | Best For |
|-----------|-------|----------------|----------|
| Q-Learning | ⚡ Fast | 1000 | Most mazes |
| SARSA | 🐢 Slower | 1200 | Safety |
| Monte Carlo | 🐌 Slowest | 5000+ | Accuracy |

---

## The Numbers Explained

**Episodes:** How many times the agent practices
**Alpha (α):** How quickly it learns (0.3 = good balance)
**Gamma (γ):** How much it values future rewards (0.99 = plans ahead)
**Epsilon (ε):** How often it tries new things (0.15 = mostly uses what it knows)

**Tip:** The app sets these automatically based on your maze difficulty!

