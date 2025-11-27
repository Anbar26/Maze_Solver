# Features Guide

Everything you can do with the Maze Solver.

---

## Training Features

### Algorithm Selection
Choose from 3 different learning methods. The app automatically sets optimal settings for each.

### Real-Time Monitoring
- Live training logs
- Progress bar showing completion
- Current episode and success rate
- Average reward tracking

### Smart Parameters
The app adjusts hyperparameters based on maze difficulty. You can also manually tune them.

---

## Maze Features

### Random Generation
Click Shuffle (🔀) to generate new mazes using 8 different algorithms:
- Prim's Algorithm (organic paths)
- Recursive Division (room-like)
- Kruskal's (multiple routes)
- DFS Backtracking (perfect mazes)
- Random Walk (caves)
- Grid-Based (structured)
- Cellular Automata (natural)
- Rooms & Corridors (dungeons)

### Difficulty Levels
- **Easy:** < 30 steps to goal
- **Medium:** 30-55 steps
- **Hard:** > 55 steps

Auto-detected and labeled for you!

### Maze Editor
Create custom mazes:
1. Click "Edit Mode"
2. Choose tool:
   - 🧱 Wall - Draw/erase walls
   - 🟢 Start - Set starting position
   - 🎯 Goal - Set goal position
   - ✏️ Path - Draw paths
3. Click and drag to draw
4. Save your creation!

---

## Visualization Features

### Policy Simulation
Watch your trained agent solve the maze:
- Blue dot shows current position
- Yellow trail shows path taken
- Rainbow celebration on success!
- Red warning on failure with helpful tips

### Q-Value Heatmap
See which cells the agent thinks are valuable:
- Blue = low value
- Yellow = medium value
- Red = high value (near goal)

### 3D Visualization
Interactive 3D plot of Q-values across the maze. Rotate and explore!

### Detailed Metrics
Click 📊 to see:
- Success rate percentage
- Average episode length
- Training time
- Reward curves
- Loss curves
- Q-value statistics

---

## Save & Load

### Save Mazes
- Auto-saved with timestamp
- Stores maze layout and difficulty
- Load anytime from the list

### Export/Import
- Download mazes as JSON
- Share with others
- Import custom designs

---

## Keyboard & Controls

### Main Controls
- **Shuffle** - Generate new maze
- **Play** - Start training
- **Simulate** - Watch agent navigate
- **Reset** - Clear everything
- **Detailed Report** - View metrics

### Editor Controls
- **Edit Mode** - Enable editing
- **Clear** - Blank canvas
- **Save** - Store current maze

---

## Tips & Tricks

### For Best Results
- Use Q-Learning for most cases
- Set episodes to 1000+ for complex mazes
- Keep gamma at 0.99 for long paths
- Try different random mazes to test learning

### For Experimentation
- Compare all 3 algorithms on same maze
- Create challenging custom mazes
- Adjust parameters and observe differences
- Export metrics for analysis

### For Fun
- Make impossible mazes (no path to goal)
- Create really easy mazes (straight line)
- Design maze art
- Challenge friends with your mazes

