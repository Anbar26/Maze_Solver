# Maze Solver

**Reinforcement Learning–Based Maze Navigation**

> Monte Carlo, SARSA, and Q-Learning approaches for autonomous maze solving.

---

## 🗺️ Overview

**Maze Solver** is a reinforcement learning project that explores how an agent learns to navigate a maze environment through trial-and-error.
The maze is modeled as a **Markov Decision Process (MDP)**, and the project implements and compares three core reinforcement learning algorithms:

* **Q-Learning** – off-policy Temporal Difference control.
* **SARSA** – on-policy Temporal Difference control.
* **Monte Carlo (MC)** – learning from complete episodes.

This progression illustrates how reinforcement learning evolves from **experience-based** to **bootstrapped** and **off-policy** learning.

---

## 🎯 Project Objectives

* Model maze navigation as an MDP.
* Implement and compare Monte Carlo, SARSA, and Q-Learning algorithms.
* Analyze convergence behavior and policy optimality.
* Visualize how exploration (ε-greedy) influences learning outcomes.

---

## 🧩 Core Concepts

### **Markov Decision Process (MDP)**

The maze is formulated as an MDP defined by:
⟨S, A, P, R, γ⟩

* **S** — set of states (grid positions)
* **A** — set of actions (up, down, left, right)
* **P** — transition probabilities
* **R** — reward function
* **γ** — discount factor

The objective is to learn an optimal policy π* that maximizes expected cumulative reward.

---

## ⚙️ Algorithms Implemented

### 🧮 1. Monte Carlo (MC)

**Idea:** Learn from *complete episodes* by averaging returns.

* Updates value estimates only at the end of each episode.
* No bootstrapping → high variance but unbiased estimates.

**Update rule:**

> `Q(s,a) ← Q(s,a) + α [G_t − Q(s,a)]`
> where `G_t` is the total return from time *t* onward.

**Use case:**
Excellent for illustrating learning from experience when the environment is episodic and model-free.

---

### 🔁 2. SARSA (On-Policy TD Control)

**Idea:** Learns the action-value function while *following* the same policy used for acting (on-policy).

* Bootstraps from the next state’s estimated Q-value.
* Sensitive to exploration strategy (ε-greedy).

**Update rule:**

> `Q(s,a) ← Q(s,a) + α [r + γQ(s′,a′) − Q(s,a)]`

**Use case:**
More stable than Q-Learning in stochastic environments because it learns the policy it actually follows.

---

### ⚡ 3. Q-Learning (Off-Policy TD Control)

**Idea:** Learns the *optimal* policy independent of the agent’s behavior.

* Bootstraps using the max Q-value of the next state.
* Off-policy → uses greedy target updates even during exploratory behavior.

**Update rule:**

> `Q(s,a) ← Q(s,a) + α [r + γ maxₐ′ Q(s′,a′) − Q(s,a)]`

**Use case:**
Fast convergence to optimal policy; ideal for deterministic or well-defined environments.

---

## 🧠 Exploration Strategy — ε-Greedy

To balance exploration and exploitation, all three algorithms use **ε-greedy action selection**:

> * With probability **ε**, choose a random action (explore).
> * With probability **1−ε**, choose the best action (exploit).

ε decays gradually over time to shift from exploration to exploitation as learning progresses.

---

## 🧪 Environment Setup

* **Grid-based maze**: start state, goal state, and obstacles.
* **Actions**: Up, Down, Left, Right.
* **Rewards**:

  * `+10` → goal reached
  * `−1` → step penalty
  * `−5` → collision with wall

---

## 📈 Metrics and Visualization

Each algorithm tracks:

* Average reward per episode
* Success rate (% of episodes reaching goal)
* Steps per episode
* Convergence of Q-values

Visualizations include:

* Learning curve (reward vs episodes)
* Heatmap of learned policy
* Trajectory visualization of the final policy

---

## 📁 Repository Structure

```
Maze_Solver/
├── backend/
│   ├── envs/
│   │   └── maze_env.py
│   ├── agents/
│   │   ├── q_learning.py
│   │   ├── sarsa.py
│   │   └── monte_carlo.py
│   ├── app.py
│   └── requirements.txt
├── frontend/
│   ├── app/
│   ├── components/
│   └── package.json
├── documentation/
└── README.md
```

---

## 🚀 Quick Start

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend Setup
```bash
cd frontend
pnpm install
pnpm dev
```

### Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs

### Train Agents via Web UI
1. Select algorithm (Q-Learning, SARSA, or Monte Carlo)
2. Configure hyperparameters (episodes, alpha, gamma, epsilon)
3. Click "Start Training"
4. View real-time training logs and policy visualization
5. Simulate the learned policy

---

## 📊 Comparative Summary

| Algorithm       | Type     | Policy     | Bootstraps | Sample Efficiency | Variance | Notes                              |
| --------------- | -------- | ---------- | ---------- | ----------------- | -------- | ---------------------------------- |
| **Monte Carlo** | Episodic | On-policy  | ❌          | Low               | High     | Learns from full episodes only     |
| **SARSA**       | TD       | On-policy  | ✅          | Moderate          | Moderate | Safer in stochastic environments   |
| **Q-Learning**  | TD       | Off-policy | ✅          | High              | Moderate | Converges faster to optimal policy |

---

## 🧩 Future Work

* Extend to **TD(λ)** or **n-step TD** for smoother convergence.
* Implement **Boltzmann (Softmax) exploration** as an alternative to ε-greedy.
* Use **neural function approximation (DQN)** for larger mazes.

---

## 👨‍💻 Authors

**Arhaan Girdhar  --> (220962050)**
</br>
**Anbar Althaf   ----->  (220962051)**
</br>
*CSE 4478 – Reinforcement Learning*
</br>
Department of Computer Science and Engineering ( AI & ML )

---

## 📜 License

MIT License — free for academic and research use.

---
