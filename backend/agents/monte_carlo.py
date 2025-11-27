import numpy as np
from collections import defaultdict

class MonteCarloAgent:
    """Monte Carlo: Learns from complete episodes"""
    
    def __init__(self, n_states, n_actions, gamma=0.99, epsilon=0.15, method='first_visit', optimistic_init=0.0):
        self.n_states = n_states
        self.n_actions = n_actions
        self.gamma = gamma
        self.epsilon = epsilon
        self.epsilon_initial = epsilon
        self.method = method
        
        self.Q = np.full((n_states, n_actions), optimistic_init, dtype=float)
        self.returns = defaultdict(lambda: defaultdict(list))
        self.visit_counts = np.zeros((n_states, n_actions), dtype=int)
        self.policy = np.zeros(n_states, dtype=int)
        self.episode_count = 0
        self.success_count = 0
        
        self.episode_lengths = []
        self.episode_returns = []
        self.discounted_returns = []
        self.training_losses = []
        self.q_value_history = {'mean': [], 'max': [], 'min': [], 'std': []}
        self.loss_history = []

    def select_action(self, state, epsilon=None):
        """Pick action: explore or exploit"""
        if epsilon is None:
            epsilon = self.epsilon
        if np.random.rand() < epsilon:
            return np.random.randint(self.n_actions)
        return int(np.argmax(self.Q[state]))

    def generate_episode(self, env, max_steps=200, epsilon=None, exploring_start=True):
        """Run through maze once, collecting experience"""
        if exploring_start and np.random.rand() < 0.85:
            valid_states = [s for s in range(env.n_states) if env.grid[s] != 0]
            if len(valid_states) > 0:
                goal_r, goal_c = env.goal // env.cols, env.goal % env.cols
                distances = []
                for s in valid_states:
                    r, c = s // env.cols, s % env.cols
                    dist = abs(r - goal_r) + abs(c - goal_c)
                    distances.append(dist)
                
                max_dist = max(distances) + 1
                weights = [max_dist - d for d in distances]
                total_weight = sum(weights)
                probs = [w / total_weight for w in weights]
                state = np.random.choice(valid_states, p=probs)
            else:
                state = env.reset()
        else:
            state = env.reset()
        
        episode = []
        total_reward = 0
        
        for step in range(max_steps):
            action = self.select_action(state, epsilon)
            next_state, reward, done = env.step(state, action)
            episode.append((state, action, reward))
            total_reward += reward
            state = next_state
            if done:
                return episode, total_reward, True
        return episode, total_reward, False

    def calculate_returns(self, episode):
        """Calculate total rewards from each step onward"""
        G = 0
        returns = []
        for t in reversed(range(len(episode))):
            state, action, reward = episode[t]
            G = reward + self.gamma * G
            returns.insert(0, G)
        return returns

    def update_q_values(self, episode, returns):
        """Update Q-table based on episode results"""
        if self.method == 'first_visit':
            return self._first_visit_mc(episode, returns)
        else:
            return self._every_visit_mc(episode, returns)

    def _first_visit_mc(self, episode, returns):
        """Update only on first occurrence of each state-action pair"""
        visited = set()
        episode_squared_errors = []
        
        for t, (state, action, _) in enumerate(episode):
            state_action = (state, action)
            if state_action not in visited:
                visited.add(state_action)
                old_q = self.Q[state, action]
                self.returns[state][action].append(returns[t])
                self.visit_counts[state, action] += 1
                self.Q[state, action] = np.mean(self.returns[state][action])
                
                prediction_error = returns[t] - old_q
                episode_squared_errors.append(prediction_error ** 2)
        return episode_squared_errors

    def _every_visit_mc(self, episode, returns):
        """Update on every occurrence of state-action pairs"""
        episode_squared_errors = []
        
        for t, (state, action, _) in enumerate(episode):
            old_q = self.Q[state, action]
            self.returns[state][action].append(returns[t])
            self.visit_counts[state, action] += 1
            self.Q[state, action] = np.mean(self.returns[state][action])
            
            prediction_error = returns[t] - old_q
            episode_squared_errors.append(prediction_error ** 2)
        return episode_squared_errors

    def run_episode(self, env, max_steps=200, epsilon=None, exploring_start=True):
        """Complete one training episode"""
        episode, total_reward, success = self.generate_episode(env, max_steps, epsilon, exploring_start)
        returns = self.calculate_returns(episode)
        episode_squared_errors = self.update_q_values(episode, returns)
        
        episode_length = len(episode)
        discounted_return = returns[0] if len(returns) > 0 else 0
        
        self.episode_lengths.append(episode_length)
        self.episode_returns.append(total_reward)
        self.discounted_returns.append(discounted_return)
        
        episode_loss = float(np.mean(episode_squared_errors)) if len(episode_squared_errors) > 0 else 0.0
        self.training_losses.append(episode_loss)
        self.loss_history.append(episode_loss)
        self._update_q_value_stats()
        
        self.episode_count += 1
        if success:
            self.success_count += 1
        return total_reward, success
    
    def _update_q_value_stats(self):
        """Track Q-value statistics"""
        self.q_value_history['mean'].append(float(np.mean(self.Q)))
        self.q_value_history['max'].append(float(np.max(self.Q)))
        self.q_value_history['min'].append(float(np.min(self.Q)))
        self.q_value_history['std'].append(float(np.std(self.Q)))
    
    def get_metrics_summary(self, last_n=100):
        """Get recent performance stats"""
        if len(self.episode_returns) == 0:
            return {}
        
        return {
            'avg_return': float(np.mean(self.episode_returns[-last_n:])),
            'std_return': float(np.std(self.episode_returns[-last_n:])),
            'avg_discounted_return': float(np.mean(self.discounted_returns[-last_n:])),
            'avg_episode_length': float(np.mean(self.episode_lengths[-last_n:])),
            'min_episode_length': float(np.min(self.episode_lengths[-last_n:])),
            'avg_td_error': 0.0,
            'training_loss': float(np.mean(self.training_losses[-last_n:])) if len(self.training_losses) > 0 else 0.0,
            'final_loss': self.training_losses[-1] if len(self.training_losses) > 0 else 0.0,
            'q_value_mean': self.q_value_history['mean'][-1] if self.q_value_history['mean'] else 0.0,
            'q_value_max': self.q_value_history['max'][-1] if self.q_value_history['max'] else 0.0,
            'q_value_min': self.q_value_history['min'][-1] if self.q_value_history['min'] else 0.0,
            'q_value_std': self.q_value_history['std'][-1] if self.q_value_history['std'] else 0.0,
            'return_p25': float(np.percentile(self.episode_returns[-last_n:], 25)),
            'return_p50': float(np.percentile(self.episode_returns[-last_n:], 50)),
            'return_p75': float(np.percentile(self.episode_returns[-last_n:], 75)),
        }

    def get_policy(self, env):
        """Get best action for each position"""
        policy = []
        for s in range(env.n_states):
            if env.grid[s] == 0 or env.grid[s] == 3:
                policy.append(None)
            else:
                policy.append(int(np.argmax(self.Q[s])))
        return policy
