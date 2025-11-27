from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from typing import List, Optional
import threading
import time
import uuid
import os
import logging
from envs.maze_env import MazeEnv
from agents.q_learning import QLearningAgent
from agents.monte_carlo import MonteCarloAgent
from agents.sarsa import SarsaAgent

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True
)
logger = logging.getLogger(__name__)

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    logger.info("="*60)
    logger.info("🚀 MAZE SOLVER BACKEND STARTED")
    logger.info("Server: FastAPI + Uvicorn")
    logger.info("Port: 8000")
    logger.info("Docs: http://localhost:8000/docs")
    logger.info("="*60)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS = {}

class TrainRequest(BaseModel):
    algorithm: str = "q_learning"
    episodes: int = 5000
    alpha: float = 0.3
    gamma: float = 0.99
    epsilon: float = 0.15
    max_steps: int = 200
    mc_method: str = "first_visit"
    epsilon_decay: float = 0.9996
    min_epsilon: float = 0.01
    maze: Optional[List[int]] = None
    rows: Optional[int] = None
    cols: Optional[int] = None

@app.get("/", response_class=HTMLResponse)
def index():
    return "<h2>Maze Solver Backend</h2><p>Use <a href='/docs'>/docs</a> to access the API.</p>"

@app.get("/favicon.ico")
def favicon():
    path = os.path.join(os.path.dirname(__file__), "static", "favicon.ico")
    if os.path.exists(path):
        return FileResponse(path)
    return "", 204

@app.post('/train')
def start_train(req: TrainRequest):
    """Start a new training job in background thread"""
    job_id = str(uuid.uuid4())
    
    logger.info("="*60)
    logger.info(f"🚀 Training Started: {req.algorithm}")
    logger.info(f"Job ID: {job_id[:8]}...")
    logger.info(f"Episodes: {req.episodes}")
    logger.info("="*60)
    
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
        
        try:
            use_shaping = req.algorithm == "monte_carlo"
            
            if req.maze and req.rows and req.cols:
                env = MazeEnv(grid_flat=req.maze, rows=req.rows, cols=req.cols, use_distance_shaping=use_shaping)
            else:
                env = MazeEnv(use_distance_shaping=use_shaping)
        except Exception as e:
            logger.error(f"Environment creation failed: {str(e)}")
            JOBS[job_id]['status'] = 'error'
            return

        if req.algorithm == "q_learning":
            agent = QLearningAgent(env.n_states, env.n_actions, alpha=req.alpha, gamma=req.gamma, epsilon=req.epsilon)
        elif req.algorithm == "monte_carlo":
            optimistic_init = 100.0
            mc_epsilon = max(req.epsilon, 0.2)
            agent = MonteCarloAgent(env.n_states, env.n_actions, gamma=req.gamma, epsilon=mc_epsilon, method=req.mc_method, optimistic_init=optimistic_init)
        elif req.algorithm == "sarsa":
            agent = SarsaAgent(env.n_states, env.n_actions, alpha=req.alpha, gamma=req.gamma, epsilon=req.epsilon)
        else:
            logger.error(f"Unknown algorithm: {req.algorithm}")
            JOBS[job_id]['status'] = 'error'
            return
        
        start_time = time.time()
        success_count = 0
        rewards_window = []
        
        for ep in range(req.episodes):
            current_epsilon = req.epsilon
            if req.algorithm.startswith("monte_carlo"):
                mc_initial = max(req.epsilon, 0.2)
                mc_min = max(req.min_epsilon, 0.05)
                current_epsilon = max(mc_min, mc_initial * (req.epsilon_decay ** ep))
                agent.epsilon = current_epsilon
            
            exploring_start = req.algorithm == "monte_carlo"
            total_reward, success = agent.run_episode(env, max_steps=req.max_steps, epsilon=current_epsilon, exploring_start=exploring_start)
            rewards_window.append(total_reward)
            if success:
                success_count += 1
            
            if (ep + 1) % max(1, req.episodes // 100) == 0 or ep == req.episodes - 1:
                JOBS[job_id]['episode'] = ep + 1
                JOBS[job_id]['progress'] = int(((ep + 1) / req.episodes) * 100)
                avg_reward = float(sum(rewards_window[-100:]) / min(len(rewards_window), 100))
                success_rate = float(success_count / (ep + 1))
                JOBS[job_id]['avg_reward'] = avg_reward
                JOBS[job_id]['success_rate'] = success_rate
                JOBS[job_id]['logs'] = rewards_window[-200:]
                logger.info(f"Episode {ep + 1}/{req.episodes} - Reward: {avg_reward:.2f} - Success: {success_rate*100:.1f}%")
            time.sleep(0)
        
        training_duration = time.time() - start_time
        
        JOBS[job_id]['status'] = 'finished'
        JOBS[job_id]['policy'] = agent.get_policy(env)
        JOBS[job_id]['q_table'] = agent.Q.tolist()
        
        metrics_summary = agent.get_metrics_summary(last_n=100)
        metrics_summary['training_duration'] = training_duration
        metrics_summary['episodes_per_sec'] = req.episodes / training_duration
        
        JOBS[job_id]['detailed_metrics'] = metrics_summary
        JOBS[job_id]['q_value_history'] = agent.q_value_history
        JOBS[job_id]['episode_returns_history'] = agent.episode_returns
        JOBS[job_id]['episode_lengths_history'] = agent.episode_lengths
        JOBS[job_id]['loss_history'] = agent.loss_history
        
        final_success_rate = JOBS[job_id]['success_rate'] * 100 if JOBS[job_id]['success_rate'] else 0
        
        logger.info("="*60)
        logger.info(f"✅ Training Complete - Success Rate: {final_success_rate:.1f}%")
        logger.info(f"Time: {training_duration:.2f}s - Speed: {req.episodes/training_duration:.1f} eps/sec")
        logger.info("="*60)

    thread = threading.Thread(target=_train, daemon=True)
    thread.start()
    return {"job_id": job_id}

@app.get('/status/{job_id}')
def get_status(job_id: str):
    """Check training progress"""
    job = JOBS.get(job_id)
    if not job:
        return {'error': 'job not found'}
    return job

@app.get('/policy/{job_id}')
def get_policy(job_id: str):
    """Get learned policy and Q-table"""
    job = JOBS.get(job_id)
    if not job:
        return {'error': 'job not found'}
    return {
        'policy': job.get('policy'),
        'q_table': job.get('q_table'),
        'status': job.get('status')
    }

@app.get('/metrics/{job_id}')
def get_detailed_metrics(job_id: str):
    """Get detailed performance statistics"""
    job = JOBS.get(job_id)
    if not job:
        return {'error': 'job not found'}
    
    return {
        'status': job.get('status'),
        'detailed_metrics': job.get('detailed_metrics'),
        'q_value_history': job.get('q_value_history'),
        'episode_returns_history': job.get('episode_returns_history'),
        'episode_lengths_history': job.get('episode_lengths_history'),
        'loss_history': job.get('loss_history'),
        'success_rate': job.get('success_rate'),
        'avg_reward': job.get('avg_reward')
    }

@app.post('/compare')
def compare_algorithms(req: TrainRequest):
    """Train all three algorithms on the same maze"""
    algorithms = ["q_learning", "monte_carlo", "sarsa"]
    job_ids = {}
    
    logger.info(f"🔬 Comparing {len(algorithms)} algorithms")
    
    for algorithm in algorithms:
        comparison_req = TrainRequest(
            algorithm=algorithm,
            episodes=req.episodes,
            alpha=req.alpha,
            gamma=req.gamma,
            epsilon=req.epsilon,
            max_steps=req.max_steps,
            mc_method=req.mc_method,
            epsilon_decay=req.epsilon_decay,
            min_epsilon=req.min_epsilon,
            maze=req.maze,
            rows=req.rows,
            cols=req.cols
        )
        
        result = start_train(comparison_req)
        job_ids[algorithm] = result["job_id"]
    
    return {
        "comparison_id": str(uuid.uuid4()),
        "algorithms": algorithms,
        "job_ids": job_ids,
        "status": "comparison_started"
    }

@app.post('/reset')
def reset_environment():
    """Clear all training jobs"""
    job_count = len(JOBS)
    JOBS.clear()
    logger.info(f"🔄 Reset - Cleared {job_count} jobs")
    return {'status': 'reset', 'message': 'All training jobs cleared'}
