# Documentation

Simple guides to understand and use the Maze Solver.

---

## 📚 Quick Navigation

### [Getting Started](./GETTING_STARTED.md)
**Start here!** Learn how to use the app in 5 minutes.
- Pick an algorithm
- Train your agent
- Watch it solve mazes
- Fix common issues

### [Algorithms Explained](./ALGORITHMS.md)
Understand the three learning methods:
- Q-Learning (recommended)
- SARSA (safer approach)
- Monte Carlo (needs more training)

### [Features Guide](./FEATURES.md)
Everything you can do:
- Training & monitoring
- Maze generation & editing
- Visualizations & metrics
- Tips & tricks

---

## 🎯 What is This Project?

An AI that learns to solve mazes through trial and error (reinforcement learning).

**How it works:**
1. Agent starts knowing nothing
2. Tries random moves at first
3. Gets rewards for good moves (reaching goal)
4. Gets penalties for bad moves (hitting walls)
5. Learns the best path through practice

**Real-world applications:**
- Robot navigation
- Game AI
- Route optimization
- Self-driving cars

---

## 🚀 Quick Start

```bash
# Start both servers
./start.sh

# Open browser
http://localhost:3000

# Click "Start Training"
# Click "Simulate Policy"
# Watch the magic! ✨
```

---

## 🎮 Basic Concepts

### States
Every position in the maze (272 total positions in a 16×17 grid)

### Actions
4 moves the agent can make: Up, Down, Left, Right

### Rewards
- **+10** Reach the goal 🎯
- **-1** Each step (encourages efficiency)
- **-5** Hit a wall 🧱

### Policy
The agent's "strategy" - which action to take at each position

---

## 🧠 Learning Parameters

**Episodes:** How many practice runs (more = better but slower)
**Alpha (α):** Learning speed (0.3 is good)
**Gamma (γ):** Planning ahead (0.99 for mazes)
**Epsilon (ε):** Exploration vs using knowledge (0.15 is balanced)

**Don't worry!** The app sets these automatically. 😊

---

## 📊 Success Tips

✅ Use default settings first
✅ Try Q-Learning (fastest, most reliable)
✅ Give it enough episodes (1000+)
✅ Test on different mazes
✅ Check the detailed report to see metrics

---

## 🎓 For Students

This project demonstrates:
- Temporal Difference learning
- Value-based reinforcement learning
- Exploration vs exploitation
- Policy optimization
- Markov Decision Processes

Great for:
- Learning RL concepts
- Running experiments
- Comparing algorithms
- Understanding parameters

---

## 🔗 Project Structure

```
Maze_Solver/
├── frontend/        Next.js web interface
├── backend/         FastAPI + RL agents
└── documentation/   This folder!
```

---

## 🆘 Need Help?

1. Check [Getting Started](./GETTING_STARTED.md) for basics
2. Read [Features Guide](./FEATURES.md) for specific features
3. See troubleshooting in Getting Started
4. Check the training logs for hints

---

## 👥 Created By

**Arhaan Girdhar** - 220962050
**Anbar Althaf** - 220962051

CSE 4478 – Reinforcement Learning  
Department of CSE (AI & ML)

---

**Happy Learning! 🚀**
