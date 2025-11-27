import numpy as np

class MazeEnv:
    """Maze environment for RL agents. Cells: 0=wall, 1=path, 2=start, 3=goal"""
    
    def __init__(self, grid_flat=None, rows=16, cols=17, use_distance_shaping=False):
        self.rows = rows
        self.cols = cols
        self.use_distance_shaping = use_distance_shaping
        
        if grid_flat is None:
            self.grid = np.array([
                [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0],
                [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0],
                [0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
                [0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0],
                [0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0],
                [0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0],
                [0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0],
                [0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0],
                [0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0],
                [0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
                [0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                [0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0],
                [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
                [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
            ], dtype=int).flatten()
            self.grid[0 * cols + 1] = 2
            self.grid[15 * cols + 15] = 3
        else:
            assert len(grid_flat) == rows * cols
            self.grid = np.array(grid_flat, dtype=int)
            if 2 not in self.grid:
                self.grid[0 * cols + 1] = 2
            if 3 not in self.grid:
                self.grid[(rows - 1) * cols + (cols - 2)] = 3
        
        starts = np.where(self.grid == 2)[0]
        goals = np.where(self.grid == 3)[0]
        if len(starts) == 0 or len(goals) == 0:
            raise ValueError('Maze must have start and goal')
        
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
        r = state // self.cols
        c = state % self.cols
        nr, nc = r, c
        
        if action == 0: nr -= 1  # up
        elif action == 1: nr += 1  # down
        elif action == 2: nc -= 1  # left
        else: nc += 1  # right
        
        if nr < 0 or nr >= self.rows or nc < 0 or nc >= self.cols:
            return state, -5, False
        
        next_idx = nr * self.cols + nc
        
        if self.grid[next_idx] == 0:
            return state, -5, False
        
        if self.grid[next_idx] == 3:
            return next_idx, 100, True
        
        base_reward = -1
        if self.use_distance_shaping:
            goal_r, goal_c = self.goal // self.cols, self.goal % self.cols
            old_dist = abs(r - goal_r) + abs(c - goal_c)
            new_dist = abs(nr - goal_r) + abs(nc - goal_c)
            distance_reward = 0.1 * (old_dist - new_dist)
            base_reward += distance_reward
        
        return next_idx, base_reward, False
