## Maze Solver Viva Guide

This guide breaks down every moving part of the Maze Solver project so you can explain it confidently in a viva. Each section pairs a short description with the exact code that drives it.

### High-Level Summary
- **Goal**: Train Reinforcement Learning (RL) agents (Q-Learning, Monte Carlo, SARSA) to navigate a maze.
- **Backend**: FastAPI service that spins up maze environments, trains agents in background threads, and streams progress.
- **Frontend**: Next.js (React) dashboard that lets you tweak hyperparameters, design mazes, launch training, and visualize performance.
- **Data Contract**: Frontend sends maze + hyperparameters to `/train`; backend responds with a `job_id` whose status, policy, metrics, and Q-table can be polled.

### End-to-End Flow
1. User configures the maze or generates one, selects an algorithm, and hits **Start Training**.
2. Frontend validates inputs, flattens the maze grid, and calls the FastAPI `/train` endpoint.
3. Backend creates `MazeEnv`, instantiates the requested agent class, and trains for `episodes` steps in a background thread while logging to `JOBS[job_id]`.
4. Frontend polls `/status/{job_id}` every second to show live progress, rewards, and success rate.
5. When training finishes, the policy grid and Q-table are cached client-side; the user can simulate the learned strategy, inspect heatmaps, or open the detailed metrics modal (fetched from `/metrics/{job_id}`).

### Backend Deep Dive

- **Environment (`MazeEnv`)**: Represents the 16×17 maze grid, enforces movement constraints, and emits rewards.

```3:85:backend/envs/maze_env.py
class MazeEnv:
    """Maze environment for RL agents. Cells: 0=wall, 1=path, 2=start, 3=goal"""
    
    def __init__(self, grid_flat=None, rows=16, cols=17, use_distance_shaping=False):
        self.rows = rows
        self.cols = cols
        self.use_distance_shaping = use_distance_shaping
        # ...
        self.start = int(starts[0])
        self.goal = int(goals[0])
        self.n_states = rows * cols
        self.n_actions = 4

    def reset(self):
        """Reset agent to start position"""
        self.agent_pos = int(self.start)
        return int(self.agent_pos)

    def step(self, state, action):
        """Take action and return (next_state, reward, done)"""
        # Up/Down/Left/Right transitions, wall collisions, reward shaping, goal detection
        # ...
```

Key takeaways:
- State is the flattened cell index (`row * cols + col`).
- Actions are integer-coded directions (`0=up`, `1=down`, `2=left`, `3=right`).
- Penalizes invalid moves with `-5`, regular moves with `-1`, and rewards reaching the goal with `+100`.
- Optional distance-based shaping speeds up Monte Carlo convergence.

- **Q-Learning Agent**: Off-policy temporal-difference learner with epsilon-greedy exploration.

```31:88:backend/agents/q_learning.py
    def run_episode(self, env, max_steps=200, epsilon=None, exploring_start=False):
        """Run one training episode"""
        state = env.reset()
        total_reward = 0
        discounted_return = 0
        episode_td_errors = []
        episode_squared_errors = []
        
        for step in range(max_steps):
            action = self.select_action(state, epsilon)
            next_state, reward, done = env.step(state, action)
            
            best_next = np.max(self.Q[next_state])
            td = reward + self.gamma * best_next - self.Q[state, action]
            
            episode_td_errors.append(abs(td))
            episode_squared_errors.append(td ** 2)
            
            self.Q[state, action] += self.alpha * td
            total_reward += reward
            discounted_return += (self.gamma ** step) * reward
            state = next_state
            
            if done:
                self._record_metrics(step + 1, total_reward, discounted_return, episode_td_errors, episode_squared_errors)
                return total_reward, True
        # ...
```

Explaining points:
- Uses `epsilon` value passed per episode (supports decay controlled by frontend).
- Tracks cumulative metrics (return, TD error, loss) for post-training analytics.
- `get_policy()` converts the Q-table to a deterministic action grid fed to the frontend.

- **SARSA Agent**: On-policy variant that updates using the next action actually taken, providing safer learning in noisy mazes (same structure as Q-Learning but bootstrap on `Q[next_state, next_action]`).

- **Monte Carlo Agent**: Learns from complete episodes using first-visit or every-visit returns, optional optimistic initialization, exploring starts, and visit-based averaging. Emphasize difference: no bootstrapping; uses stored episode returns.

```121:172:backend/agents/monte_carlo.py
    def run_episode(self, env, max_steps=200, epsilon=None, exploring_start=True):
        """Complete one training episode"""
        episode, total_reward, success = self.generate_episode(env, max_steps, epsilon, exploring_start)
        returns = self.calculate_returns(episode)
        episode_squared_errors = self.update_q_values(episode, returns)
        # Track episode length, returns, losses, and success counts for metrics
        # ...
```

- **Background Training Workflow**: `/train` spins off a daemon thread, stores live stats inside `JOBS`, and computes summary metrics at the end.

```74:183:backend/app.py
@app.post('/train')
def start_train(req: TrainRequest):
    """Start a new training job in background thread"""
    job_id = str(uuid.uuid4())
    logger.info("="*60)
    logger.info(f"🚀 Training Started: {req.algorithm}")
    # Initialize shared job record
    JOBS[job_id] = {
        'status': 'queued',
        'progress': 0,
        'episode': 0,
        'episodes': req.episodes,
        'avg_reward': None,
        'success_rate': None,
        'policy': None,
        'q_table': None,
        'logs': [],
        'detailed_metrics': None,
        'q_value_history': None,
        'episode_returns_history': None,
        'episode_lengths_history': None,
        'loss_history': None
    }

    def _train():
        """Background training function"""
        JOBS[job_id]['status'] = 'running'
        # Create environment (optionally from user-supplied maze)
        # Instantiate the chosen agent class
        # Loop over episodes, apply epsilon decay, update metrics and logs
        # Persist Q-table, policy, and metrics when done
        # ...

    thread = threading.Thread(target=_train, daemon=True)
    thread.start()
    return {"job_id": job_id}
```

Useful details:
- Monte Carlo runs with distance shaping and a higher epsilon floor by default.
- Progress updates every 1% (based on `req.episodes // 100`).
- Final metrics bundle includes Q-value distribution, return percentiles, loss history, and throughput.

- **Status & Metrics Endpoints**:
  - `/status/{job_id}`: lightweight polling (progress, rewards, success rate, policy snapshot).
  - `/metrics/{job_id}`: heavy data (episode histories, q-value stats, loss curves).
  - `/policy/{job_id}`: direct access to learned policy and Q-table.
  - `/compare`: sequentially launches Q-Learning, Monte Carlo, and SARSA jobs for side-by-side evaluation.
  - `/reset`: clears the in-memory job registry (helpful before new experiments).

### Frontend Deep Dive (`frontend/app/page.tsx`)

- **State Setup & Defaults**: `useState` hooks configure algorithm choice, hyperparameters, maze matrix, training status, animation flags, editor state, visualization toggles, and cached metrics. The initial `useEffect` seeds the default maze, derives its shortest path via BFS, and applies algorithm-specific optimal hyperparameters.

- **Dynamic Hyperparameter Presets**: The `setOptimalParameters` helper auto-tunes episodes, α, γ, ε based on algorithm and maze complexity. Whenever you switch algorithm or generate a new maze, logs record the rationale for the change.

- **Training Launch Sequence**:

```947:1005:frontend/app/page.tsx
  const startTraining = async () => {
    const errors = {
      episodes: episodes < 1 || episodes > 10000,
      alpha: alpha < 0.01 || alpha > 1.0,
      gamma: gamma < 0.5 || gamma > 1.0,
      epsilon: epsilon < 0.0 || epsilon > 1.0
    }
    setValidationErrors(errors)
    if (errors.episodes || errors.alpha || errors.gamma || errors.epsilon) {
      setTrainingLogs(prev => [...prev, `❌ Invalid hyperparameters - please check highlighted fields`])
      return
    }

    try {
      setTrainingStatus({ status: "training" })
      setIsPolling(true)
      setTrainingLogs([])
      setTrainingLogs(prev => [...prev, `🚀 Starting training with ${algorithm}...`])
      setTrainingLogs(prev => [...prev, `📊 Episodes: ${episodes}, α: ${alpha}, γ: ${gamma}, ε: ${epsilon}`])

      const flatMaze = maze.flat()
      const response = await fetch(`${API_URL}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          algorithm,
          episodes,
          alpha,
          gamma,
          epsilon,
          max_steps: 200,
          mc_method: mcMethod,
          epsilon_decay: epsilonDecay,
          min_epsilon: minEpsilon,
          maze: flatMaze,
          rows: 16,
          cols: 17
        }),
      })
      if (!response.ok) throw new Error("Training failed to start")
      const data = await response.json()
      setJobId(data.job_id)
      setTrainingLogs(prev => [...prev, `✅ Training job started (ID: ${data.job_id.substring(0, 8)}...)`])
    } catch (error) {
      setTrainingStatus({ status: "error", message: "Failed to connect to backend" })
      setIsPolling(false)
      setTrainingLogs(prev => [...prev, `❌ Error: Failed to connect to backend`])
    }
  }
```

Talking points:
- Hyperparameter validation prevents backend crashes.
- Maze is serialized as a flattened array (length `rows * cols`).
- Logs double as user feedback for viva demonstrations.

- **Status Polling & Policy Extraction**:
  - `checkStatus()` hits `/status/{job_id}` every second while training.
  - Converts the flattened policy into a `16×17` grid for rendering arrows.
  - Stores last 200 reward logs for plotting/diagnostics.
  - Stops polling automatically once the job completes or errors.

- **Detailed Metrics Modal**:

```1101:1126:frontend/app/page.tsx
  const fetchDetailedMetrics = async () => {
    if (!jobId) {
      setTrainingLogs(prev => [...prev, "⚠️ No training job available to fetch metrics"])
      return
    }
    setLoadingMetrics(true)
    try {
      const response = await fetch(`${API_URL}/metrics/${jobId}`)
      const data: MetricsResponse = await response.json()
      if (data.status === "finished" && data.detailed_metrics) {
        setDetailedMetrics(data)
        setIsMetricsModalOpen(true)
        setTrainingLogs(prev => [...prev, "📊 Detailed metrics loaded successfully"])
      } else if (data.status === "running" || data.status === "queued") {
        setTrainingLogs(prev => [...prev, "⏳ Training still in progress. Complete training first."])
      } else {
        setTrainingLogs(prev => [...prev, "⚠️ Metrics not available yet"])
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error)
      setTrainingLogs(prev => [...prev, "❌ Error fetching detailed metrics"])
    } finally {
      setLoadingMetrics(false)
    }
  }
```

Inside the modal, `react-plotly.js` renders line charts for Q-value trends, episode returns, and loss curves (SSR disabled via `dynamic()` to avoid Next.js hydration issues). Metric cards summarize success rate, average episode length, return percentiles, and training speed.

- **Simulation Engine**:

```1129:1289:frontend/app/page.tsx
  const simulatePolicy = async () => {
    if (!trainingStatus.policy || isAnimating) return
    setIsAnimating(true)
    setAgentPath([])
    setAgentPosition(null)
    setGoalReached(false)
    setSimulationFailed(false)
    setFailureReason("")
    await new Promise(resolve => setTimeout(resolve, 100))
    let start: [number, number] = [0, 1]
    let goal: [number, number] = [15, 15]
    for (let r = 0; r < maze.length; r++) {
      for (let c = 0; c < maze[r].length; c++) {
        if (maze[r][c] === 2) start = [r, c]
        if (maze[r][c] === 3) goal = [r, c]
      }
    }
    let currentPos = start
    const path: [number, number][] = []
    let steps = 0
    const maxSteps = 200
    setAgentPosition(start)
    path.push(start)
    setAgentPath([...path])
    await new Promise(resolve => setTimeout(resolve, 300))
    while (steps < maxSteps) {
      const [row, col] = currentPos
      if (row === goal[0] && col === goal[1]) {
        setGoalReached(true)
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsAnimating(false)
        return
      }
      const action = trainingStatus.policy[row]?.[col]
      if (action === null || action === undefined) {
        setSimulationFailed(true)
        setFailureReason("Policy has no action for this position. Try increasing episodes to 1000+ or gamma to 0.99 for better coverage.")
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsAnimating(false)
        return
      }
      let newRow = row
      let newCol = col
      if (action === 0) newRow -= 1
      else if (action === 1) newRow += 1
      else if (action === 2) newCol -= 1
      else if (action === 3) newCol += 1
      if (newRow < 0 || newRow >= 16 || newCol < 0 || newCol >= 17) {
        setSimulationFailed(true)
        setFailureReason("Agent tried to move outside the maze. Policy is broken - try alpha=0.3, gamma=0.99, and 1000+ episodes.")
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsAnimating(false)
        return
      }
      if (maze[newRow]?.[newCol] === 0) {
        setSimulationFailed(true)
        const minEpisodes = mazeComplexity === "hard" ? 2000 : mazeComplexity === "medium" ? 1000 : 500
        const suggestedGamma = mazeComplexity === "hard" ? 0.99 : 0.95
        if (gamma < 0.9) {
          setFailureReason(`Gamma (${gamma}) is too low for this ${mazeComplexity} maze (path: ${pathLength} steps). Increase to ${suggestedGamma} for better long-term planning.`)
        } else if (episodes < minEpisodes) {
          setFailureReason(`Only ${episodes} episodes for ${mazeComplexity} maze - not enough training. This maze needs ${minEpisodes}+ episodes for complete learning.`)
        } else {
          setFailureReason(`Agent hit a wall in ${mazeComplexity} maze. Try epsilon=0.15, gamma=${suggestedGamma}, and ${minEpisodes}+ episodes.`)
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsAnimating(false)
        return
      }
      if (path.some(([r, c]) => r === newRow && c === newCol)) {
        setSimulationFailed(true)
        const minEpisodes = mazeComplexity === "hard" ? 2000 : mazeComplexity === "medium" ? 1000 : 500
        if (alpha > 0.7) {
          setFailureReason(`Alpha (${alpha}) is too high - learning is unstable. Reduce to 0.2-0.3 and train for ${minEpisodes}+ episodes on this ${mazeComplexity} maze.`)
        } else if (gamma < 0.9) {
          setFailureReason(`Gamma (${gamma}) is too low for ${mazeComplexity} maze - agent can't plan ${pathLength}-step path. Increase gamma to 0.99.`)
        } else if (episodes < minEpisodes) {
          setFailureReason(`${episodes} episodes insufficient for ${mazeComplexity} maze (${pathLength}-step solution). Train for ${minEpisodes}+ episodes.`)
        } else {
          setFailureReason(`Loop in ${mazeComplexity} maze - try alpha=0.3, gamma=0.99, epsilon=0.1, episodes=${minEpisodes}.`)
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsAnimating(false)
        return
      }
      currentPos = [newRow, newCol]
      path.push(currentPos)
      setAgentPosition([newRow, newCol])
      setAgentPath([...path])
      await new Promise(resolve => setTimeout(resolve, 250))
      steps++
    }
    setSimulationFailed(true)
    const minEpisodes = mazeComplexity === "hard" ? 2000 : mazeComplexity === "medium" ? 1000 : 500
    if (epsilon > 0.3) {
      setFailureReason(`Epsilon (${epsilon}) too high for ${mazeComplexity} maze. Reduce to 0.1 and train ${minEpisodes}+ episodes.`)
    } else if (gamma < 0.9) {
      setFailureReason(`Gamma (${gamma}) too low for ${pathLength}-step solution. Increase to 0.99 for this ${mazeComplexity} maze.`)
    } else if (episodes < minEpisodes) {
      setFailureReason(`${episodes} episodes not enough for ${mazeComplexity} maze. This ${pathLength}-step path needs ${minEpisodes}+ episodes.`)
    } else {
      setFailureReason(`Inefficient path in ${mazeComplexity} maze (optimal: ${pathLength} steps). Try alpha=0.3, gamma=0.99, episodes=${minEpisodes}.`)
    }
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsAnimating(false)
  }
```

Highlights:
- Animates the agent step-by-step with 250 ms delay.
- Detects failed outcomes (wall hit, loop, max steps) and recommends hyperparameter fixes based on current maze difficulty.
- Uses saved policy grid and Q-table to color cells, draw arrows, and display success/failure animations.

- **Maze Editor & Persistence**:

```1306:1385:frontend/app/page.tsx
  const handleCellMouseDown = (row: number, col: number) => {
    if (!isEditorMode || isAnimating || trainingStatus.status === "training") return
    setIsDrawing(true)
    if (editorTool === 'wall') {
      const cellValue = maze[row][col]
      setDrawValue(cellValue === 0 ? 1 : 0)
    } else if (editorTool === 'path') {
      setDrawValue(1)
    } else if (editorTool === 'start') {
      setDrawValue(2)
    } else if (editorTool === 'goal') {
      setDrawValue(3)
    }
    applyDrawing(row, col)
  }

  const applyDrawing = (row: number, col: number) => {
    const newMaze = maze.map(r => [...r])
    const currentCellValue = newMaze[row][col]
    if (editorTool === 'start') {
      newMaze.forEach((r, i) => r.forEach((c, j) => {
        if (c === 2) newMaze[i][j] = 1
      }))
      newMaze[row][col] = 2
    } else if (editorTool === 'goal') {
      newMaze.forEach((r, i) => r.forEach((c, j) => {
        if (c === 3) newMaze[i][j] = 1
      }))
      newMaze[row][col] = 3
    } else if (editorTool === 'wall') {
      if (drawValue !== null) {
        if (currentCellValue === 2 || currentCellValue === 3) {
          newMaze[row][col] = drawValue === 0 ? 0 : 1
        } else {
          newMaze[row][col] = drawValue
        }
      } else {
        if (currentCellValue === 2 || currentCellValue === 3) {
          newMaze[row][col] = 1
        } else {
          newMaze[row][col] = currentCellValue === 0 ? 1 : 0
        }
      }
    } else if (editorTool === 'path') {
      if (drawValue !== null) {
        newMaze[row][col] = drawValue
      }
    }
    setMaze(newMaze)
    setTrainingStatus({ status: "idle" })
    setAgentPath([])
    setAgentPosition(null)
  }
```

Talking points:
- Drag-to-draw mechanism uses `onMouseDown` + `onMouseEnter` with debounced `isDrawing` flag.
- Start/Goal cells are unique; editor automatically clears previous markers.
- Saved mazes persist in `localStorage` and list inside editor panel.

- **Heatmap Overlay (Q-table visualizer)**:

```1491:1515:frontend/app/page.tsx
  const getHeatmapValue = (row: number, col: number): number => {
    if (!qTable || maze[row][col] === 0) return 0
    const stateIndex = row * 17 + col
    if (stateIndex >= qTable.length) return 0
    const qValues = qTable[stateIndex]
    return Math.max(...qValues)
  }

  const getHeatmapColor = (value: number, maxValue: number): string => {
    if (maxValue === 0) return 'rgba(0, 0, 0, 0)'
    const normalized = Math.min(value / maxValue, 1)
    if (normalized < 0.5) {
      const t = normalized * 2
      return `rgba(${Math.round(t * 255)}, ${Math.round(t * 255)}, 255, 0.6)`
    } else {
      const t = (normalized - 0.5) * 2
      return `rgba(255, ${Math.round((1 - t) * 255)}, ${Math.round((1 - t) * 100)}, 0.6)`
    }
  }
```

Explaining points:
- Converts per-state Q-values into a color scale (blue → yellow → red) to highlight high-value tiles.
- Coupled with UI toggle and Plotly 3D modal (`is3DModalOpen`) for deeper inspection.

### Data Flow Cheat Sheet (Explain in viva)
- **Input**: Maze grid (2=start, 3=goal, 1=path, 0=wall), algorithm choice, α/γ/ε hyperparameters, Monte Carlo options.
- **Processing**: Backend trains agent episodes → updates shared job registry → returns metrics.
- **Output**: Policy grid, Q-table, reward logs, TD errors, success rate, Q-value history.
- **Visualization**: Maze UI (arrows, heatmap, animations), logs, progress bar, metrics modal, Plotly charts.

### Common Viva Questions & Prepared Answers
- **Why three algorithms?** Compare off-policy vs on-policy vs Monte Carlo return-based learning; show `/compare` endpoint for evidence.
- **How are rewards designed?** Walls and boundary hits give `-5`, step cost `-1`, success `+100`; optional distance shaping encourages progress.
- **How do you prevent stale policies?** Reset simulation state when the maze is edited; `trainingStatus` resets to `idle`.
- **What happens if training diverges?** Simulation failure reasons recommend tuning `episodes`, `alpha`, `gamma`, or `epsilon`; heatmap exposes poorly learned regions.
- **How scalable is this?** Training happens in background threads with non-blocking endpoints; front-end polls every second but can be adjusted; Q-table shape is `rows*cols × 4`.

### Running, Testing, and Troubleshooting
- **Run Backend**: `uvicorn app:app --reload` from `backend/`.
- **Run Frontend**: `npm install && npm run dev` from `frontend/`.
- **Check Logs**: `backend/app.py` logs structured progress; frontend keeps human-readable logs in the right sidebar.
- **Resetting State**: Use `/reset` endpoint or front-end Reset button to clear stale jobs before rerunning.
- **Handling CORS**: Backend allows localhost dev origins plus deployed Vercel subdomains.
- **Production Deploy**: Dockerfiles present in both backend and frontend; `render.yaml`, `Procfile`, and `railway.json` give deployment templates.

### Quick Recap
Memorize this pitch:
> “The Maze Solver pairs a FastAPI RL backend with a Next.js analytics dashboard. A maze grid and hyperparameters go to `/train`, a background job runs one of three RL agents over the `MazeEnv`, and the frontend polls for live progress, simulates the learned policy, and visualizes Q-tables via heatmaps and Plotly charts. Users can edit mazes, save designs, and receive hyperparameter coaching directly inside the UI.”

With this document, you can confidently map every viva question to the relevant code and explain the rationale behind each design decision.

