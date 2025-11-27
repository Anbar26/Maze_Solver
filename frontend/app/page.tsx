"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Loader2, Play, RotateCcw, TrendingUp, Shuffle, BarChart3, Edit3, Save, Upload, Download, Grid3x3, Eye, EyeOff, Sparkles, X } from "lucide-react"
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Algorithm = "q_learning" | "monte_carlo" | "sarsa"

interface BackendStatus {
  status: "queued" | "running" | "finished" | "error"
  progress: number
  episode: number
  episodes: number
  avg_reward: number | null
  success_rate: number | null
  policy: (number | null)[] | null
  q_table: number[][] | null
  logs: number[]
}

interface TrainingStatus {
  status: "idle" | "training" | "completed" | "error"
  episode?: number
  total_episodes?: number
  message?: string
  policy?: (number | null)[][]
  rewards?: number[]
}

interface DetailedMetrics {
  avg_return: number
  std_return: number
  avg_discounted_return: number
  avg_episode_length: number
  min_episode_length: number
  avg_td_error: number
  training_loss: number
  final_loss: number
  q_value_mean: number
  q_value_max: number
  q_value_min: number
  q_value_std: number
  return_p25: number
  return_p50: number
  return_p75: number
  training_duration: number
  episodes_per_sec: number
}

interface MetricsResponse {
  status: string
  detailed_metrics: DetailedMetrics | null
  q_value_history: {
    mean: number[]
    max: number[]
    min: number[]
    std: number[]
  } | null
  episode_returns_history: number[] | null
  episode_lengths_history: number[] | null
  loss_history: number[] | null
  success_rate: number | null
  avg_reward: number | null
}

export default function MazeSolver() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("q_learning")
  const [episodes, setEpisodes] = useState(500)
  const [alpha, setAlpha] = useState(0.1)
  const [gamma, setGamma] = useState(0.9)
  const [epsilon, setEpsilon] = useState(0.1)
  // Monte Carlo specific parameters
  const [mcMethod, setMcMethod] = useState<"first_visit" | "every_visit">("first_visit")
  const [epsilonDecay, setEpsilonDecay] = useState(0.9996)
  const [minEpsilon, setMinEpsilon] = useState(0.05)
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({ status: "idle" })
  const [isPolling, setIsPolling] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [maze, setMaze] = useState<number[][]>([])
  const [agentPath, setAgentPath] = useState<[number, number][]>([])
  const [agentPosition, setAgentPosition] = useState<[number, number] | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [goalReached, setGoalReached] = useState(false)
  const [simulationFailed, setSimulationFailed] = useState(false)
  const [failureReason, setFailureReason] = useState<string>("")
  const [trainingLogs, setTrainingLogs] = useState<string[]>([])
  const [validationErrors, setValidationErrors] = useState({
    episodes: false,
    alpha: false,
    gamma: false,
    epsilon: false
  })
  const [mazeComplexity, setMazeComplexity] = useState<"easy" | "medium" | "hard">("medium")
  const [pathLength, setPathLength] = useState<number>(0)
  const [nextDifficulty, setNextDifficulty] = useState<"easy" | "medium" | "hard">("hard")
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false)
  const [detailedMetrics, setDetailedMetrics] = useState<MetricsResponse | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  
  // Editor Mode States
  const [isEditorMode, setIsEditorMode] = useState(false)
  const [editorTool, setEditorTool] = useState<'wall' | 'start' | 'goal' | 'path'>('wall')
  const [savedMazes, setSavedMazes] = useState<{name: string, maze: number[][], complexity: string}[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawValue, setDrawValue] = useState<number | null>(null)
  
  // Visualization States
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [heatmapType, setHeatmapType] = useState<'q-value' | 'visits' | 'td-error'>('q-value')
  const [is3DModalOpen, setIs3DModalOpen] = useState(false)
  const [qTable, setQTable] = useState<number[][] | null>(null)

  useEffect(() => {
    const initialMaze = [
      [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0],
    ]

    setMaze(initialMaze)
    setMazeComplexity("medium")
    setPathLength(estimatePathLength(initialMaze))
    // Set optimal parameters for default algorithm and maze
    setOptimalParameters("q_learning", "medium")
    
    // Load saved mazes from localStorage
    const saved = localStorage.getItem('savedMazes')
    if (saved) {
      setSavedMazes(JSON.parse(saved))
    }
  }, [])

  // Global mouse up listener for drag drawing
  useEffect(() => {
    const handleUp = () => {
      if (isDrawing) {
        setIsDrawing(false)
        setDrawValue(null)
        setPathLength(estimatePathLength(maze))
      }
    }
    
    window.addEventListener('mouseup', handleUp)
    return () => window.removeEventListener('mouseup', handleUp)
  }, [isDrawing, maze])

  // Set optimal parameters based on algorithm and maze complexity
  const setOptimalParameters = (algo: Algorithm, complexity: "easy" | "medium" | "hard") => {
    if (algo === "q_learning") {
      // Q-Learning parameters
      if (complexity === "easy") {
        setEpisodes(500)
        setAlpha(0.3)
        setGamma(0.95)
        setEpsilon(0.15)
      } else if (complexity === "medium") {
        setEpisodes(1000)
        setAlpha(0.3)
        setGamma(0.99)
        setEpsilon(0.15)
      } else {
        // hard
        setEpisodes(2000)
        setAlpha(0.2)
        setGamma(0.99)
        setEpsilon(0.1)
      }
      setTrainingLogs(prev => [...prev, `✨ Q-Learning parameters optimized for ${complexity} maze`])
    } else if (algo === "sarsa") {
      // SARSA parameters (more conservative - on-policy learning)
      if (complexity === "easy") {
        setEpisodes(600)          // Slightly more episodes
        setAlpha(0.25)            // Lower alpha for stability
        setGamma(0.95)
        setEpsilon(0.2)           // Higher epsilon (learns the exploratory policy)
      } else if (complexity === "medium") {
        setEpisodes(1200)         // More episodes than Q-Learning
        setAlpha(0.25)            // More conservative learning rate
        setGamma(0.99)
        setEpsilon(0.18)          // Higher exploration
      } else {
        // hard
        setEpisodes(2500)         // Significantly more episodes
        setAlpha(0.15)            // Very conservative for stability
        setGamma(0.99)
        setEpsilon(0.15)          // Balanced exploration for hard mazes
      }
      setTrainingLogs(prev => [...prev, `✨ SARSA (on-policy) parameters optimized for ${complexity} maze`])
    } else if (algo === "monte_carlo") {
      // Monte Carlo needs MORE episodes
      if (complexity === "easy") {
        setEpisodes(2000)
        setGamma(0.95)
        setEpsilon(0.3)
        setEpsilonDecay(0.9996)
        setMinEpsilon(0.05)
      } else if (complexity === "medium") {
        setEpisodes(5000)
        setGamma(0.99)
        setEpsilon(0.3)
        setEpsilonDecay(0.9996)
        setMinEpsilon(0.05)
      } else {
        // hard
        setEpisodes(8000)
        setGamma(0.99)
        setEpsilon(0.4)
        setEpsilonDecay(0.9998)
        setMinEpsilon(0.08)
      }
      setMcMethod("first_visit")
      setTrainingLogs(prev => [...prev, `✨ Monte Carlo parameters optimized for ${complexity} maze`])
    }
  }

  const estimatePathLength = (mazeGrid: number[][]) => {
    // Find start (value 2) and goal (value 3) dynamically
    let startPos: [number, number] = [0, 1]
    let goalPos: [number, number] = [15, 15]
    
    for (let r = 0; r < mazeGrid.length; r++) {
      for (let c = 0; c < mazeGrid[r].length; c++) {
        if (mazeGrid[r][c] === 2) startPos = [r, c]
        if (mazeGrid[r][c] === 3) goalPos = [r, c]
      }
    }
    
    // Simple BFS to find shortest path length
    const queue: Array<[number, number, number]> = [[startPos[0], startPos[1], 0]]
    const visited = new Set<string>()
    visited.add(`${startPos[0]},${startPos[1]}`)
    
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    
    while (queue.length > 0) {
      const [row, col, dist] = queue.shift()!
      
      if (row === goalPos[0] && col === goalPos[1]) {
        return dist
      }
      
      for (const [dr, dc] of directions) {
        const newRow = row + dr
        const newCol = col + dc
        const key = `${newRow},${newCol}`
        
        // Allow walking on paths (1), start (2), and goal (3) - not walls (0)
        if (newRow >= 0 && newRow < 16 && newCol >= 0 && newCol < 17 &&
            !visited.has(key) && mazeGrid[newRow]?.[newCol] !== 0) {
          visited.add(key)
          queue.push([newRow, newCol, dist + 1])
        }
      }
    }
    
    return 0 // No path found
  }

  const generateRandomMaze = () => {
    // Use timestamp + random for TRUE uniqueness every time
    const seed = Date.now() + Math.random() * 1000000
    const seededRandom = () => {
      const x = Math.sin(seed + Math.random() * 10000) * 10000
      return x - Math.floor(x)
    }
    
    // Cycle through difficulties: medium → hard → easy → medium → hard → ...
    const targetComplexity = nextDifficulty
    
    let attempts = 0
    let maxAttempts = 50  // Reduced - trust the algorithms
    let generatedMaze: number[][] = []
    let pathLen = 0
    
    // Keep generating until we get a valid maze (not necessarily matching difficulty)
    while (attempts < maxAttempts) {
      const rows = 16
      const cols = 17
      const newMaze: number[][] = Array(rows).fill(0).map(() => Array(cols).fill(0))
      
      // Start with all walls
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          newMaze[r][c] = 0
        }
      }
      
      // Use RANDOM generation strategy with proper algorithms
      const strategy = Math.floor(seededRandom() * 8)  // 0-7: eight proven algorithms
      
      if (strategy === 0) {
        // Strategy 1: Prim's Algorithm (creates natural-looking mazes)
        // Start with all walls
        const frontiers = new Set<string>()
        const inMaze = new Set<string>()
        
        // Start from random cell
        const startR = Math.floor(seededRandom() * (rows / 2)) * 2 + 1
        const startC = Math.floor(seededRandom() * (cols / 2)) * 2 + 1
        inMaze.add(`${startR},${startC}`)
        newMaze[startR][startC] = 1
        
        // Add neighbors to frontier
        const addFrontiers = (r: number, c: number) => {
          const directions = [[-2, 0], [2, 0], [0, -2], [0, 2]]
          for (const [dr, dc] of directions) {
            const nr = r + dr
            const nc = c + dc
            if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && !inMaze.has(`${nr},${nc}`)) {
              frontiers.add(`${nr},${nc},${r + dr/2},${c + dc/2}`)
            }
          }
        }
        
        addFrontiers(startR, startC)
        
        // Prim's main loop
        while (frontiers.size > 0) {
          // Pick random frontier
          const frontiersArray = Array.from(frontiers)
          const randomFrontier = frontiersArray[Math.floor(seededRandom() * frontiersArray.length)]
          frontiers.delete(randomFrontier)
          
          const [nr, nc, wallR, wallC] = randomFrontier.split(',').map(Number)
          
          if (!inMaze.has(`${nr},${nc}`)) {
            // Add cell and wall
            newMaze[nr][nc] = 1
            newMaze[wallR][wallC] = 1
            inMaze.add(`${nr},${nc}`)
            addFrontiers(nr, nc)
          }
        }
        
      } else if (strategy === 1) {
        // Strategy 2: Recursive Division (creates building-like structures)
        // Start with empty space
        for (let r = 1; r < rows - 1; r++) {
          for (let c = 1; c < cols - 1; c++) {
            newMaze[r][c] = 1
          }
        }
        
        const divide = (minR: number, maxR: number, minC: number, maxC: number) => {
          const width = maxC - minC
          const height = maxR - minR
          
          if (width < 2 || height < 2) return
          
          // Choose orientation
          const horizontal = width < height ? true : (width > height ? false : seededRandom() < 0.5)
          
          if (horizontal) {
            // Draw horizontal wall with one gap
            const wallRow = minR + Math.floor(seededRandom() * height)
            const gapCol = minC + Math.floor(seededRandom() * width)
            
            for (let c = minC; c < maxC; c++) {
              if (c !== gapCol && wallRow < rows - 1) {
                newMaze[wallRow][c] = 0
              }
            }
            
            divide(minR, wallRow, minC, maxC)
            divide(wallRow + 1, maxR, minC, maxC)
          } else {
            // Draw vertical wall with one gap
            const wallCol = minC + Math.floor(seededRandom() * width)
            const gapRow = minR + Math.floor(seededRandom() * height)
            
            for (let r = minR; r < maxR; r++) {
              if (r !== gapRow && wallCol < cols - 1) {
                newMaze[r][wallCol] = 0
              }
            }
            
            divide(minR, maxR, minC, wallCol)
            divide(minR, maxR, wallCol + 1, maxC)
          }
        }
        
        divide(1, rows - 1, 1, cols - 1)
        
      } else if (strategy === 2) {
        // Strategy 3: Kruskal's Algorithm (creates maze with loops)
        const edges: Array<{r1: number, c1: number, r2: number, c2: number, wallR: number, wallC: number}> = []
        const parent: { [key: string]: string } = {}
        
        // Create cells and edges
        for (let r = 1; r < rows - 1; r += 2) {
          for (let c = 1; c < cols - 1; c += 2) {
            newMaze[r][c] = 1
            parent[`${r},${c}`] = `${r},${c}`
            
            // Add edges
            if (c + 2 < cols - 1) {
              edges.push({r1: r, c1: c, r2: r, c2: c + 2, wallR: r, wallC: c + 1})
            }
            if (r + 2 < rows - 1) {
              edges.push({r1: r, c1: c, r2: r + 2, c2: c, wallR: r + 1, wallC: c})
            }
          }
        }
        
        // Shuffle edges
        for (let i = edges.length - 1; i > 0; i--) {
          const j = Math.floor(seededRandom() * (i + 1))
          ;[edges[i], edges[j]] = [edges[j], edges[i]]
        }
        
        // Union-Find
        const find = (cell: string): string => {
          if (parent[cell] !== cell) {
            parent[cell] = find(parent[cell])
          }
          return parent[cell]
        }
        
        // Kruskal's algorithm
        for (const edge of edges) {
          const cell1 = `${edge.r1},${edge.c1}`
          const cell2 = `${edge.r2},${edge.c2}`
          const root1 = find(cell1)
          const root2 = find(cell2)
          
          if (root1 !== root2) {
            // Union
            parent[root1] = root2
            newMaze[edge.wallR][edge.wallC] = 1
          } else if (seededRandom() < 0.1) {
            // 10% chance to add loop
            newMaze[edge.wallR][edge.wallC] = 1
          }
        }
        
      } else if (strategy === 3) {
        // Strategy 4: Classic recursive backtracking DFS (perfect maze)
        const visited = new Set<string>()
        
        const carve = (row: number, col: number) => {
          const key = `${row},${col}`
          visited.add(key)
          newMaze[row][col] = 1
          
          // Get random direction order using seeded random
          const directions = [[-2, 0], [2, 0], [0, -2], [0, 2]]
          for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom() * (i + 1))
            ;[directions[i], directions[j]] = [directions[j], directions[i]]
          }
          
          for (const [dr, dc] of directions) {
            const newRow = row + dr
            const newCol = col + dc
            const newKey = `${newRow},${newCol}`
            
            if (newRow > 0 && newRow < rows - 1 && newCol > 0 && newCol < cols - 1 && !visited.has(newKey)) {
              // Carve through the wall between
              newMaze[row + dr / 2][col + dc / 2] = 1
              carve(newRow, newCol)
            }
          }
        }
        
        // Start carving from random position using seeded random
        const possibleStarts = []
        for (let r = 1; r < rows - 1; r += 2) {
          for (let c = 1; c < cols - 1; c += 2) {
            possibleStarts.push([r, c])
          }
        }
        const randomStart = possibleStarts[Math.floor(seededRandom() * possibleStarts.length)]
        carve(randomStart[0], randomStart[1])
        
      } else if (strategy === 4) {
        // Strategy 5: Random walk from multiple starting points (organic paths)
        const numStarts = Math.floor(seededRandom() * 4) + 3  // 3-6 starting points
        for (let s = 0; s < numStarts; s++) {
          let r = Math.floor(seededRandom() * (rows - 2)) + 1
          let c = Math.floor(seededRandom() * (cols - 2)) + 1
          
          // Random walk from each starting point with VARIABLE length
          const walkLength = Math.floor(seededRandom() * 60) + 30  // 30-90 steps
          let lastDirection = Math.floor(seededRandom() * 4)
          
          for (let step = 0; step < walkLength; step++) {
            newMaze[r][c] = 1
            
            // Prefer continuing in same direction (creates corridors)
            let direction
            if (seededRandom() < 0.6) {
              direction = lastDirection  // 60% continue same direction
            } else {
              direction = Math.floor(seededRandom() * 4)  // 40% random turn
              lastDirection = direction
            }
            
            const prevR = r
            const prevC = c
            
            if (direction === 0 && r > 1) r--
            else if (direction === 1 && r < rows - 2) r++
            else if (direction === 2 && c > 1) c--
            else if (direction === 3 && c < cols - 2) c++
            
            // Sometimes backtrack or create branches
            if (seededRandom() < 0.15) {
              r = prevR
              c = prevC
            }
          }
        }
        
      } else if (strategy === 5) {
        // Strategy 6: Grid-based with VARIABLE density (structured)
        // Create a grid pattern with random spacing
        const spacing = seededRandom() < 0.5 ? 2 : 3  // Vary grid density
        for (let r = 1; r < rows - 1; r += spacing) {
          for (let c = 1; c < cols - 1; c += spacing) {
            newMaze[r][c] = 1
            // Randomly connect to neighbors with VARIABLE probability
            const connectionProb = seededRandom() * 0.4 + 0.3  // 0.3-0.7
            if (c < cols - 2 && seededRandom() < connectionProb) {
              newMaze[r][c + 1] = 1
            }
            if (r < rows - 2 && seededRandom() < connectionProb) {
              newMaze[r + 1][c] = 1
            }
            // Sometimes add diagonal connections
            if (r < rows - 2 && c < cols - 2 && seededRandom() < 0.2) {
              newMaze[r + 1][c + 1] = 1
            }
          }
        }
      } else if (strategy === 6) {
        // Strategy 7: Cellular Automata-inspired (cave-like, organic)
        const fillProbability = seededRandom() * 0.2 + 0.4  // 0.4-0.6
        for (let r = 1; r < rows - 1; r++) {
          for (let c = 1; c < cols - 1; c++) {
            if (seededRandom() < fillProbability) {
              newMaze[r][c] = 1
            }
          }
        }
        
        // Smooth pass: remove isolated cells, fill enclosed spaces
        for (let pass = 0; pass < 3; pass++) {
          const tempMaze = newMaze.map(row => [...row])
          for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
              const neighbors = [
                newMaze[r-1]?.[c] || 0,
                newMaze[r+1]?.[c] || 0,
                newMaze[r]?.[c-1] || 0,
                newMaze[r]?.[c+1] || 0
              ].filter(n => n === 1).length
              
              if (neighbors >= 3) {
                tempMaze[r][c] = 1
              } else if (neighbors === 1 && seededRandom() < 0.3) {
                tempMaze[r][c] = 0
              }
            }
          }
          newMaze.splice(0, newMaze.length, ...tempMaze)
        }
      } else {
        // Strategy 8: Rooms and corridors (dungeon-style, realistic)
        const numRooms = Math.floor(seededRandom() * 5) + 4  // 4-8 rooms
        const rooms: Array<{x: number, y: number, w: number, h: number}> = []
        
        // Create random rooms with NO OVERLAP (proper dungeon)
        for (let i = 0; i < numRooms; i++) {
          const w = Math.floor(seededRandom() * 4) + 3  // Width 3-6
          const h = Math.floor(seededRandom() * 4) + 3  // Height 3-6
          const x = Math.floor(seededRandom() * (cols - w - 2)) + 1
          const y = Math.floor(seededRandom() * (rows - h - 2)) + 1
          
          // Carve out room
          for (let ry = y; ry < y + h && ry < rows - 1; ry++) {
            for (let rx = x; rx < x + w && rx < cols - 1; rx++) {
              newMaze[ry][rx] = 1
            }
          }
          rooms.push({x, y, w, h})
        }
        
        // Connect ALL rooms with corridors (no isolated rooms)
        for (let i = 0; i < rooms.length - 1; i++) {
          const room1 = rooms[i]
          const room2 = rooms[i + 1]
          const x1 = Math.floor(room1.x + room1.w / 2)
          const y1 = Math.floor(room1.y + room1.h / 2)
          const x2 = Math.floor(room2.x + room2.w / 2)
          const y2 = Math.floor(room2.y + room2.h / 2)
          
          // L-shaped corridor
          if (seededRandom() < 0.5) {
            // Horizontal then vertical
            for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
              if (y1 < rows - 1 && x < cols - 1) newMaze[y1][x] = 1
            }
            for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
              if (y < rows - 1 && x2 < cols - 1) newMaze[y][x2] = 1
            }
          } else {
            // Vertical then horizontal
            for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
              if (y < rows - 1 && x1 < cols - 1) newMaze[y][x1] = 1
            }
            for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
              if (y2 < rows - 1 && x < cols - 1) newMaze[y2][x] = 1
            }
          }
        }
      }
      
      // Ensure start and goal are accessible
      newMaze[0][1] = 2  // Start position
      newMaze[15][15] = 3  // Goal position
      
      // Connect start and goal to the main maze first
      // Connect start (0,1) downward
      if (newMaze[1][1] === 0 && newMaze[2][1] === 1) {
        newMaze[1][1] = 1
      }
      // Connect goal (15,15) - try multiple directions
      const goalConnections = [
        [14, 15], [15, 14], [14, 14]
      ]
      for (const [r, c] of goalConnections) {
        if (newMaze[r][c] === 1) {
          // Already connected
          break
        }
      }
      // Force connection if needed
      if (newMaze[14][15] === 0 && newMaze[15][14] === 0) {
        newMaze[14][15] = 1
      }
      
      // Add additional paths based on target difficulty - PRESERVE base structure more
      if (targetComplexity === "easy") {
        // Easy: Add SOME shortcuts but preserve base structure
        const shortcutCount = Math.floor(seededRandom() * 30) + 20
        for (let i = 0; i < shortcutCount; i++) {
          const r = Math.floor(seededRandom() * (rows - 2)) + 1
          const c = Math.floor(seededRandom() * (cols - 2)) + 1
          if (newMaze[r][c] === 0) {
            // Only add if it connects existing paths (creates shortcuts)
            const neighbors = [
              newMaze[r-1]?.[c],
              newMaze[r+1]?.[c],
              newMaze[r]?.[c-1],
              newMaze[r]?.[c+1]
            ].filter(n => n === 1).length
            
            if (neighbors >= 2 && seededRandom() < 0.6) {
              newMaze[r][c] = 1
            }
          }
        }
      } else if (targetComplexity === "medium") {
        // Medium: Add fewer shortcuts
        const shortcutCount = Math.floor(seededRandom() * 15) + 10
        for (let i = 0; i < shortcutCount; i++) {
          const r = Math.floor(seededRandom() * (rows - 2)) + 1
          const c = Math.floor(seededRandom() * (cols - 2)) + 1
          if (newMaze[r][c] === 0) {
            const neighbors = [
              newMaze[r-1]?.[c],
              newMaze[r+1]?.[c],
              newMaze[r]?.[c-1],
              newMaze[r]?.[c+1]
            ].filter(n => n === 1).length
            
            if (neighbors >= 2 && seededRandom() < 0.4) {
              newMaze[r][c] = 1
            }
          }
        }
      }
      // Hard: NO additional paths at all - use only base generation structure
      
      // Calculate path length
      pathLen = estimatePathLength(newMaze)
      
      // Check if this maze matches our target complexity
      let achievedComplexity: "easy" | "medium" | "hard"
      if (pathLen < 30) achievedComplexity = "easy"      // Easy: short paths (increased threshold)
      else if (pathLen > 55) achievedComplexity = "hard" // Hard: long paths
      else achievedComplexity = "medium"                  // Medium: everything else
      
      // Make sure path exists (pathLen > 0)
      if (pathLen === 0) {
        attempts++
        continue
      }
      
      // Strict matching - we want the TARGET difficulty
      const isMatch = achievedComplexity === targetComplexity
      
      // Also accept close matches for specific cases
      const isCloseMatch = (
        (targetComplexity === "easy" && pathLen < 35) ||  // Very lenient for easy
        (targetComplexity === "medium" && pathLen >= 30 && pathLen <= 55) ||
        (targetComplexity === "hard" && pathLen > 50)
      )
      
      // If we hit the target or close match, use this maze
      // Give up after 50 attempts
      if (isMatch || (isCloseMatch && attempts > 20) || attempts > 50) {
        generatedMaze = newMaze
        break
      }
      
      attempts++
    }
    
    // If we couldn't generate exact complexity, create a guaranteed valid maze
    if (generatedMaze.length === 0) {
      const rows = 16
      const cols = 17
      generatedMaze = Array(rows).fill(0).map(() => Array(cols).fill(0))
      
      // Create random path pattern with MORE variety
      const pathType = Math.floor(seededRandom() * 5)  // 0-4: five different fallback patterns
      
      if (pathType === 0) {
        // L-shaped: Vertical then horizontal
        for (let r = 0; r < rows; r++) {
          generatedMaze[r][1] = 1
        }
        for (let c = 1; c <= 15; c++) {
          generatedMaze[15][c] = 1
        }
      } else if (pathType === 1) {
        // Snake pattern: zigzag from top to bottom
        let currentCol = 1
        for (let r = 0; r < rows; r++) {
          generatedMaze[r][currentCol] = 1
          if (r < rows - 1 && r % 3 === 2) {
            // Move horizontally
            const direction = currentCol < 8 ? 1 : -1
            for (let c = currentCol; c >= 1 && c <= 15; c += direction) {
              generatedMaze[r][c] = 1
              if (Math.random() < 0.3) break
            }
            currentCol = Math.min(15, Math.max(1, currentCol + direction * (Math.floor(Math.random() * 6) + 3)))
          }
        }
        // Ensure path to goal
        for (let c = Math.min(currentCol, 15); c <= 15; c++) {
          generatedMaze[15][c] = 1
        }
      } else if (pathType === 2) {
        // Diagonal pattern
        for (let step = 0; step <= 15; step++) {
          const r = Math.min(15, Math.floor(step * 15 / 15))
          const c = Math.min(15, Math.max(1, step))
          generatedMaze[r][c] = 1
          if (r > 0) generatedMaze[r-1][c] = 1
          if (c > 1) generatedMaze[r][c-1] = 1
        }
      } else if (pathType === 3) {
        // Spiral pattern from outside to inside
        let top = 1, bottom = 14, left = 1, right = 15
        while (top <= bottom && left <= right) {
          // Top row
          for (let c = left; c <= right; c++) generatedMaze[top][c] = 1
          top++
          // Right column
          for (let r = top; r <= bottom; r++) generatedMaze[r][right] = 1
          right--
          // Bottom row
          if (top <= bottom) {
            for (let c = right; c >= left; c--) generatedMaze[bottom][c] = 1
            bottom--
          }
          // Left column
          if (left <= right) {
            for (let r = bottom; r >= top; r--) generatedMaze[r][left] = 1
            left++
          }
        }
      } else {
        // Random branching path
        const branches = Math.floor(Math.random() * 3) + 2  // 2-4 branches
        for (let b = 0; b < branches; b++) {
          let r = Math.floor(Math.random() * (rows - 4)) + 2
          let c = Math.floor(Math.random() * (cols - 4)) + 2
          const branchLength = Math.floor(Math.random() * 25) + 15
          
          for (let i = 0; i < branchLength; i++) {
            generatedMaze[r][c] = 1
            // Random walk with some persistence
            const dir = Math.floor(Math.random() * 4)
            if (dir === 0 && r > 1) r--
            else if (dir === 1 && r < rows - 2) r++
            else if (dir === 2 && c > 1) c--
            else if (dir === 3 && c < cols - 2) c++
          }
        }
        // Connect to start and goal
        generatedMaze[0][1] = 1
        generatedMaze[1][1] = 1
        generatedMaze[15][15] = 1
        generatedMaze[14][15] = 1
        generatedMaze[15][14] = 1
      }
      
      // Add complexity based on target with MORE randomization
      const densityMultiplier = Math.random() * 0.3 + 0.85  // 0.85-1.15 random variation
      
      if (targetComplexity === "easy") {
        // Add many random corridors
        const corridorCount = Math.floor((Math.random() * 4) + 6)  // 6-10 corridors
        for (let i = 0; i < corridorCount; i++) {
          const isHorizontal = Math.random() < 0.5
          const startPos = Math.floor(Math.random() * (rows - 2)) + 1
          const length = Math.floor(Math.random() * 8) + 5
          
          if (isHorizontal) {
            const row = startPos
            const startCol = Math.floor(Math.random() * (cols - length - 2)) + 1
            for (let c = startCol; c < Math.min(cols - 1, startCol + length); c++) {
              if (Math.random() < 0.7 * densityMultiplier) generatedMaze[row][c] = 1
            }
          } else {
            const col = startPos
            const startRow = Math.floor(Math.random() * (rows - length - 2)) + 1
            for (let r = startRow; r < Math.min(rows - 1, startRow + length); r++) {
              if (Math.random() < 0.7 * densityMultiplier) generatedMaze[r][col] = 1
            }
          }
        }
      } else if (targetComplexity === "medium") {
        // Add some corridors with medium density
        const corridorCount = Math.floor((Math.random() * 3) + 3)  // 3-6 corridors
        for (let i = 0; i < corridorCount; i++) {
          const isHorizontal = Math.random() < 0.5
          const startPos = Math.floor(Math.random() * (rows - 2)) + 1
          const length = Math.floor(Math.random() * 6) + 3
          
          if (isHorizontal) {
            const row = startPos
            const startCol = Math.floor(Math.random() * (cols - length - 2)) + 1
            for (let c = startCol; c < Math.min(cols - 1, startCol + length); c++) {
              if (Math.random() < 0.5 * densityMultiplier) generatedMaze[row][c] = 1
            }
          } else {
            const col = startPos
            const startRow = Math.floor(Math.random() * (rows - length - 2)) + 1
            for (let r = startRow; r < Math.min(rows - 1, startRow + length); r++) {
              if (Math.random() < 0.5 * densityMultiplier) generatedMaze[r][col] = 1
            }
          }
        }
      } else {
        // Hard: VERY minimal extra paths - create a narrow, winding path
        // Only add a few strategic connections, not random corridors
        const strategicSpots = Math.floor(Math.random() * 3) + 2  // 2-5 spots only
        for (let i = 0; i < strategicSpots; i++) {
          const r = Math.floor(Math.random() * (rows - 2)) + 1
          const c = Math.floor(Math.random() * (cols - 2)) + 1
          // Only add if exactly 1 neighbor (creates narrow passages)
          const neighbors = [
            generatedMaze[r-1]?.[c],
            generatedMaze[r+1]?.[c],
            generatedMaze[r]?.[c-1],
            generatedMaze[r]?.[c+1]
          ].filter(n => n === 1).length
          
          if (neighbors === 1 && Math.random() < 0.25 * densityMultiplier) {
            generatedMaze[r][c] = 1
          }
        }
      }
      
      // Ensure start and goal are set as paths first, then mark them
      generatedMaze[0][1] = 1
      generatedMaze[15][15] = 1
      
      pathLen = estimatePathLength(generatedMaze)
    }
    
    // Ensure start and goal positions are always set correctly (2 = start, 3 = goal)
    // This must be done after all generation logic to ensure they're not overwritten
    generatedMaze[0][1] = 2  // Start position
    generatedMaze[15][15] = 3  // Goal position
    
    // Determine actual complexity (match the generation thresholds)
    let actualComplexity: "easy" | "medium" | "hard"
    if (pathLen < 30) actualComplexity = "easy"
    else if (pathLen > 55) actualComplexity = "hard"
    else actualComplexity = "medium"
    
    setMaze(generatedMaze)
    setMazeComplexity(actualComplexity)
    setPathLength(pathLen)
    
    // Auto-adjust parameters for current algorithm based on new maze complexity
    setOptimalParameters(algorithm, actualComplexity)
    
    // Cycle to next difficulty based on what was ACTUALLY generated (not target)
    if (actualComplexity === "easy") setNextDifficulty("medium")
    else if (actualComplexity === "medium") setNextDifficulty("hard")
    else setNextDifficulty("easy")
    
    // Reset simulation state
    setAgentPath([])
    setAgentPosition(null)
    setGoalReached(false)
    setSimulationFailed(false)
    setFailureReason("")
    
    // Add log with cycle info
    if (pathLen > 0) {
      setTrainingLogs(prev => [...prev, `🎲 Generated ${actualComplexity.toUpperCase()} maze (path: ${pathLen} steps) • Next: ${nextDifficulty === "easy" ? "EASY" : nextDifficulty === "medium" ? "MEDIUM" : "HARD"}`])
    } else {
      setTrainingLogs(prev => [...prev, `⚠️ Failed to generate ${targetComplexity.toUpperCase()} maze - using fallback`])
    }
  }

  const startTraining = async () => {
    // Validate inputs
    const errors = {
      episodes: episodes < 1 || episodes > 10000,
      alpha: alpha < 0.01 || alpha > 1.0,
      gamma: gamma < 0.5 || gamma > 1.0,
      epsilon: epsilon < 0.0 || epsilon > 1.0
    }
    
    setValidationErrors(errors)
    
    // If any validation error, don't start training
    if (errors.episodes || errors.alpha || errors.gamma || errors.epsilon) {
      setTrainingLogs(prev => [...prev, `❌ Invalid hyperparameters - please check highlighted fields`])
      return
    }
    
    try {
      setTrainingStatus({ status: "training" })
      setIsPolling(true)
      setTrainingLogs([])
      
      // Add initial log
      setTrainingLogs(prev => [...prev, `🚀 Starting training with ${algorithm}...`])
      setTrainingLogs(prev => [...prev, `📊 Episodes: ${episodes}, α: ${alpha}, γ: ${gamma}, ε: ${epsilon}`])

      // Flatten maze for backend (convert 2D to 1D array)
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

  const checkStatus = async () => {
    if (!jobId) return
    
    try {
      const response = await fetch(`${API_URL}/status/${jobId}`)
      const data: BackendStatus = await response.json()
      
      // Add training logs at milestones
      const progress = data.progress
      if (progress === 25 || progress === 50 || progress === 75) {
        setTrainingLogs(prev => {
          const lastLog = prev[prev.length - 1]
          if (!lastLog?.includes(`${progress}%`)) {
            return [...prev, `⏳ Progress: ${progress}% (Episode ${data.episode}/${data.episodes})`]
          }
          return prev
        })
      }
      
      if (data.avg_reward !== null && data.episode % 100 === 0) {
        setTrainingLogs(prev => {
          const lastLog = prev[prev.length - 1]
          if (!lastLog?.includes(`Episode ${data.episode}`)) {
            const successRate = data.success_rate !== null ? (data.success_rate * 100).toFixed(1) : '0.0'
            const avgReward = data.avg_reward !== null ? data.avg_reward.toFixed(2) : '0.00'
            return [...prev, `📈 Episode ${data.episode}: Avg Reward = ${avgReward}, Success Rate = ${successRate}%`]
          }
          return prev
        })
      }
      
      // Convert backend status to frontend format
      const frontendStatus: TrainingStatus = {
        status: data.status === "finished" ? "completed" : 
                data.status === "running" || data.status === "queued" ? "training" : 
                data.status === "error" ? "error" : "idle",
        episode: data.episode,
        total_episodes: data.episodes,
        rewards: data.logs,
      }
      
      // Convert flattened policy to 2D grid
      if (data.policy && data.status === "finished") {
        const policy2D: (number | null)[][] = []
        for (let r = 0; r < 16; r++) {
          const row: (number | null)[] = []
          for (let c = 0; c < 17; c++) {
            row.push(data.policy[r * 17 + c])
          }
          policy2D.push(row)
        }
        frontendStatus.policy = policy2D
        
        // Store Q-table if available
        if (data.q_table) {
          setQTable(data.q_table)
        }
        
        // Add completion log
        const finalSuccessRate = data.success_rate !== null ? (data.success_rate * 100).toFixed(1) : '0.0'
        setTrainingLogs(prev => [...prev, `🎉 Training completed! Final success rate: ${finalSuccessRate}%`])
        setTrainingLogs(prev => [...prev, `✨ Policy learned and ready for simulation!`])
      }
      
      setTrainingStatus(frontendStatus)

      if (data.status === "finished" || data.status === "error") {
        setIsPolling(false)
      }
    } catch (error) {
      console.error("Failed to check status:", error)
    }
  }

  const resetEnvironment = async () => {
    try {
      await fetch(`${API_URL}/reset`, { method: "POST" })
      setTrainingStatus({ status: "idle" })
      setAgentPath([])
      setJobId(null)
      setAgentPosition(null)
      setIsAnimating(false)
      setGoalReached(false)
      setSimulationFailed(false)
      setFailureReason("")
      setTrainingLogs([])
      setDetailedMetrics(null)
      setShowHeatmap(false)
      setQTable(null)
    } catch (error) {
      console.error("Failed to reset:", error)
    }
  }

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

  const simulatePolicy = async () => {
    if (!trainingStatus.policy || isAnimating) return
    
    // Reset state before starting
    setIsAnimating(true)
    setAgentPath([])
    setAgentPosition(null)
    setGoalReached(false)
    setSimulationFailed(false)
    setFailureReason("")
    
    // Small delay to ensure state is cleared
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Find start (value 2) and goal (value 3) dynamically
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
    
    // Set initial position
    setAgentPosition(start)
    path.push(start)
    setAgentPath([...path])
    
    await new Promise(resolve => setTimeout(resolve, 300))
    
    while (steps < maxSteps) {
      const [row, col] = currentPos
      
      // Check if reached goal
      if (row === goal[0] && col === goal[1]) {
        setGoalReached(true)
        // Wait for celebration animation
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsAnimating(false)
        return
      }
      
      // Get action from policy
      const action = trainingStatus.policy[row]?.[col]
      if (action === null || action === undefined) {
        console.log("No valid action at position:", row, col)
        setSimulationFailed(true)
        setFailureReason("Policy has no action for this position. Try increasing episodes to 1000+ or gamma to 0.99 for better coverage.")
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsAnimating(false)
        return
      }
      
      // Calculate next position based on action
      // Actions: 0=up, 1=down, 2=left, 3=right
      let newRow = row
      let newCol = col
      
      if (action === 0) newRow -= 1      // up
      else if (action === 1) newRow += 1  // down
      else if (action === 2) newCol -= 1  // left
      else if (action === 3) newCol += 1  // right
      
      // Check bounds
      if (newRow < 0 || newRow >= 16 || newCol < 0 || newCol >= 17) {
        console.log("Out of bounds:", newRow, newCol)
        setSimulationFailed(true)
        setFailureReason("Agent tried to move outside the maze. Policy is broken - try alpha=0.3, gamma=0.99, and 1000+ episodes.")
        setTrainingLogs(prev => [...prev, `⚠️ Simulation failed: Agent tried to move out of bounds`])
        setTrainingLogs(prev => [...prev, `💡 Policy is broken - retrain with better hyperparameters`])
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsAnimating(false)
        return
      }
      
      // Check wall
      if (maze[newRow]?.[newCol] === 0) {
        console.log("Hit wall at:", newRow, newCol)
        setSimulationFailed(true)
        
        // Environment-aware suggestions
        const minEpisodes = mazeComplexity === "hard" ? 2000 : mazeComplexity === "medium" ? 1000 : 500
        const suggestedGamma = mazeComplexity === "hard" ? 0.99 : 0.95
        
        if (gamma < 0.9) {
          setFailureReason(`Gamma (${gamma}) is too low for this ${mazeComplexity} maze (path: ${pathLength} steps). Increase to ${suggestedGamma} for better long-term planning.`)
        } else if (episodes < minEpisodes) {
          setFailureReason(`Only ${episodes} episodes for ${mazeComplexity} maze - not enough training. This maze needs ${minEpisodes}+ episodes for complete learning.`)
        } else {
          setFailureReason(`Agent hit a wall in ${mazeComplexity} maze. Try epsilon=0.15, gamma=${suggestedGamma}, and ${minEpisodes}+ episodes.`)
        }
        setTrainingLogs(prev => [...prev, `⚠️ Simulation failed: Agent hit a wall at (${newRow}, ${newCol})`])
        setTrainingLogs(prev => [...prev, `💡 Policy is incomplete - needs more training`])
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsAnimating(false)
        return
      }
      
      // Check for loops (visiting same cell twice)
      if (path.some(([r, c]) => r === newRow && c === newCol)) {
        console.log("Loop detected at:", newRow, newCol)
        setSimulationFailed(true)
        
        // Environment-aware suggestions
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
        setTrainingLogs(prev => [...prev, `⚠️ Simulation failed: Agent got stuck in a loop (poor policy)`])
        setTrainingLogs(prev => [...prev, `💡 Try training with more episodes or better hyperparameters`])
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsAnimating(false)
        return
      }
      
      currentPos = [newRow, newCol]
      path.push(currentPos)
      
      // Update position and trail
      setAgentPosition([newRow, newCol])
      setAgentPath([...path])
      
      await new Promise(resolve => setTimeout(resolve, 250)) // Slightly slower for smoother animation
      steps++
    }
    
    console.log("Max steps reached")
    setSimulationFailed(true)
    
    // Environment-aware suggestions
    const minEpisodes = mazeComplexity === "hard" ? 2000 : mazeComplexity === "medium" ? 1000 : 500
    const pathEfficiency = (pathLength / 200) * 100
    
    if (epsilon > 0.3) {
      setFailureReason(`Epsilon (${epsilon}) too high for ${mazeComplexity} maze. Reduce to 0.1 and train ${minEpisodes}+ episodes.`)
    } else if (gamma < 0.9) {
      setFailureReason(`Gamma (${gamma}) too low for ${pathLength}-step solution. Increase to 0.99 for this ${mazeComplexity} maze.`)
    } else if (episodes < minEpisodes) {
      setFailureReason(`${episodes} episodes not enough for ${mazeComplexity} maze. This ${pathLength}-step path needs ${minEpisodes}+ episodes.`)
    } else {
      setFailureReason(`Inefficient path in ${mazeComplexity} maze (optimal: ${pathLength} steps). Try alpha=0.3, gamma=0.99, episodes=${minEpisodes}.`)
    }
    setTrainingLogs(prev => [...prev, `⚠️ Simulation failed: Agent couldn't reach goal in 200 steps`])
    setTrainingLogs(prev => [...prev, `💡 Policy is suboptimal - consider retraining with better hyperparameters`])
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsAnimating(false)
  }

  useEffect(() => {
    if (isPolling && jobId) {
      const interval = setInterval(checkStatus, 1000)
      return () => clearInterval(interval)
    }
  }, [isPolling, jobId])

  const getArrowForAction = (action: number | null) => {
    if (action === null) return ""
    // Backend actions: 0=up, 1=down, 2=left, 3=right
    const arrows = ["↑", "↓", "←", "→"]
    return arrows[action] || ""
  }

  // ========== MAZE EDITOR FUNCTIONS ==========
  const handleCellMouseDown = (row: number, col: number) => {
    if (!isEditorMode || isAnimating || trainingStatus.status === "training") return
    
    setIsDrawing(true)
    
    // Determine what value to draw based on tool
    if (editorTool === 'wall') {
      // Toggle: if current cell is wall (0), draw paths (1), otherwise draw walls (0)
      // For start/goal positions (2/3), treat them as paths and draw walls
      const cellValue = maze[row][col]
      setDrawValue(cellValue === 0 ? 1 : 0)
    } else if (editorTool === 'path') {
      setDrawValue(1)
    } else if (editorTool === 'start') {
      setDrawValue(2)
    } else if (editorTool === 'goal') {
      setDrawValue(3)
    }
    
    // Apply to first cell
    applyDrawing(row, col)
  }

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isDrawing || !isEditorMode) return
    applyDrawing(row, col)
  }

  const applyDrawing = (row: number, col: number) => {
    const newMaze = maze.map(r => [...r])
    const currentCellValue = newMaze[row][col]
    
    if (editorTool === 'start') {
      // Clear old start
      newMaze.forEach((r, i) => r.forEach((c, j) => {
        if (c === 2) newMaze[i][j] = 1
      }))
      newMaze[row][col] = 2
    } else if (editorTool === 'goal') {
      // Clear old goal
      newMaze.forEach((r, i) => r.forEach((c, j) => {
        if (c === 3) newMaze[i][j] = 1
      }))
      newMaze[row][col] = 3
    } else if (editorTool === 'wall') {
      // For wall tool: use drawValue set at mouse down (toggles based on initial cell)
      // If drawValue is null (edge case), toggle based on current cell state
      if (drawValue !== null) {
        // Use the toggle value determined at mouse down
        // This preserves the original toggle behavior: if you start on a wall, you're erasing (drawing paths)
        // If you start on a path, you're drawing walls
        // If placing on start/goal, convert to path first, then apply the toggle
        if (currentCellValue === 2 || currentCellValue === 3) {
          // Start/goal positions should be converted to paths first, then apply wall toggle
          newMaze[row][col] = drawValue === 0 ? 0 : 1
        } else {
          newMaze[row][col] = drawValue
        }
      } else {
        // Fallback: toggle based on current cell state
        // Handle start/goal positions by converting them to paths first
        if (currentCellValue === 2 || currentCellValue === 3) {
          newMaze[row][col] = 1
        } else {
          newMaze[row][col] = currentCellValue === 0 ? 1 : 0
        }
      }
    } else if (editorTool === 'path') {
      // For path tool, just set the value
      if (drawValue !== null) {
        newMaze[row][col] = drawValue
      }
    }
    
    setMaze(newMaze)
    // Reset training when maze is edited
    setTrainingStatus({ status: "idle" })
    setAgentPath([])
    setAgentPosition(null)
  }

  const saveMaze = () => {
    // Auto-generate name with timestamp
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    const name = `Maze ${timestamp}`
    
    const newMazes = [...savedMazes, { name, maze: maze.map(r => [...r]), complexity: mazeComplexity }]
    setSavedMazes(newMazes)
    localStorage.setItem('savedMazes', JSON.stringify(newMazes))
    setTrainingLogs(prev => [...prev, `💾 Maze saved as "${name}"`])
    
    // Auto-close editor mode after saving
    setIsEditorMode(false)
  }

  const loadMaze = (mazeData: { name: string, maze: number[][], complexity: string }) => {
    setMaze(mazeData.maze.map(r => [...r]))
    setMazeComplexity(mazeData.complexity as "easy" | "medium" | "hard")
    setPathLength(estimatePathLength(mazeData.maze))
    setTrainingLogs(prev => [...prev, `📂 Loaded maze "${mazeData.name}"`])
    setTrainingStatus({ status: "idle" })
    setAgentPath([])
    setAgentPosition(null)
  }

  const deleteSavedMaze = (index: number) => {
    const newMazes = savedMazes.filter((_, i) => i !== index)
    setSavedMazes(newMazes)
    localStorage.setItem('savedMazes', JSON.stringify(newMazes))
    setTrainingLogs(prev => [...prev, `🗑️ Maze deleted`])
  }

  const exportMaze = () => {
    const dataStr = JSON.stringify({ maze, complexity: mazeComplexity }, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `maze_${mazeComplexity}_${Date.now()}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    setTrainingLogs(prev => [...prev, `📥 Maze exported to ${exportFileDefaultName}`])
  }

  const importMaze = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (event: any) => {
        try {
          const data = JSON.parse(event.target.result)
          if (data.maze && Array.isArray(data.maze)) {
            setMaze(data.maze)
            setMazeComplexity(data.complexity || "medium")
            setPathLength(estimatePathLength(data.maze))
            setTrainingLogs(prev => [...prev, `📤 Maze imported from ${file.name}`])
            setTrainingStatus({ status: "idle" })
            setAgentPath([])
            setAgentPosition(null)
          }
        } catch (err) {
          setTrainingLogs(prev => [...prev, `❌ Failed to import maze - invalid file`])
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const clearMaze = () => {
    const emptyMaze = Array(16).fill(null).map(() => Array(17).fill(1)) // Fill with paths (white)
    
    // Set black borders (walls)
    for (let c = 0; c < 17; c++) {
      emptyMaze[0][c] = 0 // Top border
      emptyMaze[15][c] = 0 // Bottom border
    }
    for (let r = 0; r < 16; r++) {
      emptyMaze[r][0] = 0 // Left border
      emptyMaze[r][16] = 0 // Right border
    }
    
    // Set start and goal inside the border
    emptyMaze[0][1] = 2 // Start at top-left inside border
    emptyMaze[15][15] = 3 // Goal at bottom-right inside border
    
    setMaze(emptyMaze)
    setPathLength(estimatePathLength(emptyMaze))
    setTrainingStatus({ status: "idle" })
    setAgentPath([])
    setAgentPosition(null)
    setTrainingLogs(prev => [...prev, `🧹 Maze cleared - open space created`])
  }

  // ========== HEATMAP FUNCTIONS ==========
  const getHeatmapValue = (row: number, col: number): number => {
    if (!qTable || maze[row][col] === 0) return 0
    
    const stateIndex = row * 17 + col
    if (stateIndex >= qTable.length) return 0
    
    // Get max Q-value for this state
    const qValues = qTable[stateIndex]
    return Math.max(...qValues)
  }

  const getHeatmapColor = (value: number, maxValue: number): string => {
    if (maxValue === 0) return 'rgba(0, 0, 0, 0)'
    
    const normalized = Math.min(value / maxValue, 1)
    
    // Blue (low) -> Yellow (mid) -> Red (high)
    if (normalized < 0.5) {
      const t = normalized * 2
      return `rgba(${Math.round(t * 255)}, ${Math.round(t * 255)}, 255, 0.6)`
    } else {
      const t = (normalized - 0.5) * 2
      return `rgba(255, ${Math.round((1 - t) * 255)}, ${Math.round((1 - t) * 100)}, 0.6)`
    }
  }

  const getCellColor = (row: number, col: number) => {
    // FAILURE ANIMATIONS
    if (simulationFailed) {
      // Agent stuck position - red pulsing
      if (agentPosition && agentPosition[0] === row && agentPosition[1] === col) {
        return "bg-red-600 shadow-2xl shadow-red-600/50 animate-ping scale-110"
      }
      
      // Failed trail - orange with warning colors
      if (agentPath.some(([r, c]) => r === row && c === col) && 
          !(agentPosition && agentPosition[0] === row && agentPosition[1] === col)) {
        return "bg-gradient-to-r from-orange-300 to-red-400 shadow-lg animate-pulse"
      }
      
      // Goal becomes angry red when failed
      if (maze[row]?.[col] === 3) {
        return "bg-gradient-to-r from-red-500 via-orange-500 to-red-600 shadow-2xl shadow-red-500/50 animate-pulse"
      }
    }
    
    // SUCCESS ANIMATIONS
    // Check if agent is currently on this cell
    if (agentPosition && agentPosition[0] === row && agentPosition[1] === col) {
      // Special celebration when goal is reached
      if (goalReached && maze[row]?.[col] === 3) {
        return "bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 shadow-2xl shadow-green-500/50 animate-pulse scale-125"
      }
      return "bg-blue-500 shadow-lg shadow-blue-500/50 scale-110"
    }
    
    // Check if this is the goal (value 3)
    if (maze[row]?.[col] === 3) {
      // Animate goal when reached
      if (goalReached) {
        return "bg-gradient-to-r from-yellow-400 via-red-500 to-pink-600 shadow-2xl shadow-yellow-500/50 animate-bounce"
      }
      return "bg-red-500 shadow-lg shadow-red-500/50"
    }
    
    // Check if this is part of the trail (but not current position)
    if (agentPath.some(([r, c]) => r === row && c === col) && 
        !(agentPosition && agentPosition[0] === row && agentPosition[1] === col)) {
      // Animate trail when goal is reached
      if (goalReached) {
        return "bg-gradient-to-r from-yellow-200 to-yellow-400 shadow-lg animate-pulse"
      }
      return "bg-yellow-300 shadow-md"
    }
    
    // Check if this is the start (value 2)
    if (maze[row]?.[col] === 2 && !agentPosition && !isAnimating) {
      return "bg-green-500 shadow-lg shadow-green-500/50"
    }
    
    // Wall
    if (maze[row]?.[col] === 0) return "bg-black shadow-md"
    
    // Empty path
    return "bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
  }

  const SimpleRewardChart = ({ rewards, totalEpisodes }: { rewards: number[], totalEpisodes?: number }) => {
    if (!rewards || rewards.length === 0) return null

    const maxReward = Math.max(...rewards)
    const minReward = Math.min(...rewards)
    const range = maxReward - minReward || 1
    const actualTotal = totalEpisodes || rewards.length

    // Calculate start episode (if showing last 200 of more episodes)
    const startEpisode = actualTotal > rewards.length ? actualTotal - rewards.length + 1 : 1

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Episode {startEpisode}</span>
          <span>Episode {actualTotal}</span>
        </div>
        <div className="h-24 bg-gray-50 rounded-lg p-2 flex items-end" style={{ gap: '1px' }}>
          {rewards.map((reward, index) => {
            const height = ((reward - minReward) / range) * 100
            const actualEpisode = startEpisode + index
            return (
              <div
                key={index}
                className="flex-1 bg-black rounded-t-sm transition-all"
                style={{ height: `${Math.max(height, 5)}%`, minWidth: '2px' }}
                title={`Episode ${actualEpisode}: ${reward.toFixed(2)}`}
              />
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Min: {minReward.toFixed(2)}</span>
          <span>Max: {maxReward.toFixed(2)}</span>
        </div>
        {actualTotal > rewards.length && (
          <p className="text-xs text-slate-600 italic text-center">
            Showing last {rewards.length} of {actualTotal} episodes
          </p>
        )}
      </div>
    )
  }

  const SimpleLossChart = ({ losses, totalEpisodes }: { losses: number[], totalEpisodes?: number }) => {
    if (!losses || losses.length === 0) return null

    const maxLoss = Math.max(...losses)
    const minLoss = Math.min(...losses)
    const range = maxLoss - minLoss || 1
    const actualTotal = totalEpisodes || losses.length

    // Calculate start episode (if showing last 200 of more episodes)
    const startEpisode = actualTotal > losses.length ? actualTotal - losses.length + 1 : 1

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Episode {startEpisode}</span>
          <span>Episode {actualTotal}</span>
        </div>
        <div className="h-24 bg-gray-50 rounded-lg p-2 flex items-end overflow-hidden" style={{ gap: '1px' }}>
          {losses.map((loss, index) => {
            // Calculate height as percentage, ensuring it stays within bounds
            const height = range > 0 ? ((loss - minLoss) / range) * 100 : 0
            // Cap height at 100% to prevent overflow, with minimum visible height
            const clampedHeight = Math.min(Math.max(height, 0.5), 100)
            const actualEpisode = startEpisode + index
            return (
              <div
                key={index}
                className="flex-1 bg-indigo-600 rounded-t-sm transition-all"
                style={{ height: `${clampedHeight}%`, minWidth: '2px', maxHeight: '100%' }}
                title={`Episode ${actualEpisode}: ${loss.toFixed(4)}`}
              />
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Min: {minLoss.toFixed(4)}</span>
          <span>Max: {maxLoss.toFixed(4)}</span>
        </div>
        {actualTotal > losses.length && (
          <p className="text-xs text-slate-600 italic text-center">
            Showing last {losses.length} of {actualTotal} episodes
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900 p-5 overscroll-none">
      <div className="max-w-7xl mx-auto space-y-3 overscroll-none">
        <div className="text-center space-y-1">
          <h1 className="font-bold text-black text-2xl font-sans tracking-wider leading-10">
            RL MAZE SOLVER
          </h1>
          <p className="text-xs text-slate-600 italic font-medium">Arhaan Girdhar - 220962050 | Anbar Althaf - 220962051 </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* LEFT COLUMN - Live Training Logs and Controls (appears second on large screens) */}
          <div className="space-y-3 order-1 lg:order-2">
            <Card className="p-3 bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg shadow-blue-100/50">
              <h2 className="text-sm font-semibold mb-2 text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Live Training Logs
              </h2>
              {trainingLogs.length > 0 ? (
                <>
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-3 max-h-[300px] overflow-y-auto font-mono text-xs text-emerald-400 space-y-1 shadow-inner">
                    {trainingLogs.slice(-15).map((log, index) => (
                      <div key={index} className="whitespace-pre-wrap break-words">
                        {log}
                      </div>
                    ))}
                    {trainingStatus.status === "training" && (
                      <div className="animate-pulse text-yellow-400">
                        ⚡ Training in progress...
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-slate-600 text-center">
                    Showing last 15 log entries • Complete metrics in Detailed Report
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-600 text-center py-4">No training logs yet. Start training to see logs.</p>
              )}
            </Card>

            <Card className="p-3 bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg shadow-blue-100/50">
              <h2 className="text-sm font-semibold mb-2 text-slate-800 border-b border-slate-200 pb-2">Algorithm Selection</h2>
              <div className="grid grid-cols-3 gap-2">
                {(["q_learning", "monte_carlo", "sarsa"] as Algorithm[]).map((algo) => (
                  <Button
                    key={algo}
                    onClick={() => {
                      setAlgorithm(algo)
                      // Auto-set optimal parameters based on current maze complexity
                      setOptimalParameters(algo, mazeComplexity)
                    }}
                    variant={algorithm === algo ? "default" : "outline"}
                    size="sm"
                    className={
                      algorithm === algo
                        ? "bg-black/90 backdrop-blur-md text-white hover:bg-black text-xs shadow-lg border border-black/50"
                        : "bg-white/60 backdrop-blur-sm border-slate-300/60 hover:bg-white/80 text-slate-700 text-xs shadow-sm"
                    }
                  >
                    {algo === "q_learning" ? "Q-Learning" : 
                     algo === "monte_carlo" ? "Monte Carlo" : 
                     "SARSA"}
                  </Button>
                ))}
              </div>
            </Card>

            <Card className="p-3 bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg shadow-blue-100/50">
              <h2 className="text-sm font-semibold mb-2 text-slate-800 border-b border-slate-200 pb-2">Hyperparameters</h2>
              
              <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-700 font-medium mb-1 block">
                      Episodes
                    </label>
                  <Input
                    type="number"
                    value={episodes}
                    onChange={(e) => {
                      setEpisodes(Number(e.target.value))
                      // Clear validation error when user types
                      if (validationErrors.episodes) {
                        setValidationErrors(prev => ({ ...prev, episodes: false }))
                      }
                    }}
                    className={`bg-white h-8 text-sm transition-colors ${
                      validationErrors.episodes 
                        ? 'border-red-500 border-2 focus:border-red-500 focus:ring-red-500' 
                        : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                    }`}
                    disabled={trainingStatus.status === "training"}
                  />
                  {validationErrors.episodes && (
                    <p className="text-xs text-red-500 mt-1">Must be between 1 and 10000</p>
                  )}
                </div>
                
                {/* Alpha - ONLY for Q-Learning and SARSA */}
                {(algorithm === "q_learning" || algorithm === "sarsa") && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-700 font-medium mb-1 block">
                        Alpha (α) <span className="text-slate-400">- Learning Rate</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={alpha}
                        onChange={(e) => {
                          setAlpha(Number(e.target.value))
                          if (validationErrors.alpha) {
                            setValidationErrors(prev => ({ ...prev, alpha: false }))
                          }
                        }}
                        className={`bg-white h-8 text-sm transition-colors ${
                          validationErrors.alpha 
                            ? 'border-red-500 border-2 focus:border-red-500 focus:ring-red-500' 
                            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                        }`}
                        disabled={trainingStatus.status === "training"}
                      />
                      {validationErrors.alpha && (
                        <p className="text-xs text-red-500 mt-1">0.01-1.0</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-slate-700 font-medium mb-1 block">
                        Gamma (γ) <span className="text-gray-400">- Discount</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={gamma}
                        onChange={(e) => {
                          setGamma(Number(e.target.value))
                          if (validationErrors.gamma) {
                            setValidationErrors(prev => ({ ...prev, gamma: false }))
                          }
                        }}
                        className={`bg-white h-8 text-sm transition-colors ${
                          validationErrors.gamma 
                            ? 'border-red-500 border-2 focus:border-red-500 focus:ring-red-500' 
                            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                        }`}
                        disabled={trainingStatus.status === "training"}
                      />
                      {validationErrors.gamma && (
                        <p className="text-xs text-red-500 mt-1">0.5-1.0</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-slate-700 font-medium mb-1 block">
                        Epsilon (ε) <span className="text-gray-400">- Exploration</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={epsilon}
                        onChange={(e) => {
                          setEpsilon(Number(e.target.value))
                          if (validationErrors.epsilon) {
                          setValidationErrors(prev => ({ ...prev, epsilon: false }))
                        }
                          }}
                          className={`bg-white h-8 text-sm transition-colors ${
                            validationErrors.epsilon 
                              ? 'border-red-500 border-2 focus:border-red-500 focus:ring-red-500' 
                              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                          }`}
                          disabled={trainingStatus.status === "training"}
                        />
                        {validationErrors.epsilon && (
                          <p className="text-xs text-red-500 mt-1">0.0-1.0</p>
                        )}
                      </div>
                  </div>
                )}
                
                {/* Gamma and Epsilon - For Monte Carlo only (different layout) */}
                {algorithm === "monte_carlo" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-700 font-medium mb-1 block">
                        Gamma (γ) <span className="text-gray-400">- Discount Factor</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={gamma}
                        onChange={(e) => {
                          setGamma(Number(e.target.value))
                          if (validationErrors.gamma) {
                            setValidationErrors(prev => ({ ...prev, gamma: false }))
                          }
                        }}
                        className={`bg-white h-8 text-sm transition-colors ${
                          validationErrors.gamma 
                            ? 'border-red-500 border-2 focus:border-red-500 focus:ring-red-500' 
                            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                        }`}
                        disabled={trainingStatus.status === "training"}
                      />
                      {validationErrors.gamma && (
                        <p className="text-xs text-red-500 mt-1">0.5-1.0</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-slate-700 font-medium mb-1 block">
                        Epsilon (ε) <span className="text-gray-400">- Initial Exploration</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={epsilon}
                        onChange={(e) => {
                          setEpsilon(Number(e.target.value))
                          if (validationErrors.epsilon) {
                            setValidationErrors(prev => ({ ...prev, epsilon: false }))
                          }
                        }}
                        className={`bg-white h-8 text-sm transition-colors ${
                          validationErrors.epsilon 
                            ? 'border-red-500 border-2 focus:border-red-500 focus:ring-red-500' 
                            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                        }`}
                        disabled={trainingStatus.status === "training"}
                      />
                      {validationErrors.epsilon && (
                        <p className="text-xs text-red-500 mt-1">0.0-1.0</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Monte Carlo specific parameters */}
                {algorithm === "monte_carlo" && (
                  <div className="border-t pt-2 mt-2 border-gray-300 space-y-2">
                    <div>
                      <label className="text-xs text-slate-700 font-medium mb-1 block">
                        MC Method <span className="text-gray-400">- Update Strategy</span>
                      </label>
                      <select
                        value={mcMethod}
                        onChange={(e) => setMcMethod(e.target.value as "first_visit" | "every_visit")}
                        className="w-full h-8 text-sm border-gray-300 rounded-md bg-white"
                        disabled={trainingStatus.status === "training"}
                      >
                        <option value="first_visit">First Visit (recommended)</option>
                        <option value="every_visit">Every Visit</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-700 font-medium mb-1 block">
                          ε Decay <span className="text-gray-400">- Per Episode</span>
                        </label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={epsilonDecay}
                          onChange={(e) => setEpsilonDecay(Number(e.target.value))}
                          className="bg-white h-8 text-sm border-gray-300"
                          disabled={trainingStatus.status === "training"}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-700 font-medium mb-1 block">
                          Min ε <span className="text-gray-400">- Lower Bound</span>
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={minEpsilon}
                          onChange={(e) => setMinEpsilon(Number(e.target.value))}
                          className="bg-white h-8 text-sm border-gray-300"
                          disabled={trainingStatus.status === "training"}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

          </div>

          {/* RIGHT COLUMN - Maze and Training Logs (appears first on large screens) */}
          <div className="space-y-3 order-2 lg:order-1">
            <Card className="p-3 bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg shadow-indigo-100/50">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold font-sans leading-7 bg-slate-900/90 backdrop-blur-sm text-white py-2 px-4 rounded-lg shadow-sm border border-slate-800/50 flex-1 text-center">
                  Agent&#39;s Environment [ 16 × 17 ]
                </h2>
                <Button
                  onClick={generateRandomMaze}
                  variant="outline"
                  size="sm"
                  className="ml-2 bg-teal-600/80 backdrop-blur-md text-black hover:bg-teal-700/90 border-teal-500/50 shadow-lg transition-all"
                  disabled={isAnimating || trainingStatus.status === "training"}
                  title={`Generate ${nextDifficulty.toUpperCase()} maze`}
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>

              {/* Editor Mode Controls */}
              <div className="mb-3 space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => {
                      setIsEditorMode(!isEditorMode)
                      if (!isEditorMode) {
                        setTrainingLogs(prev => [...prev, `✏️ Editor mode activated`])
                      }
                    }}
                    variant={isEditorMode ? "default" : "outline"}
                    size="sm"
                    className={isEditorMode ? "bg-slate-700/80 backdrop-blur-md text-white hover:bg-slate-800/90 shadow-lg border border-slate-600/50" : "bg-white/60 backdrop-blur-sm border-slate-300/60 hover:bg-white/80 text-slate-700 shadow-sm"}
                    disabled={isAnimating || trainingStatus.status === "training"}
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    {isEditorMode ? 'Editing' : 'Edit Mode'}
                  </Button>
                  
                  {trainingStatus.status === "completed" && qTable && (
                    <>
                      <Button
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        variant={showHeatmap ? "default" : "outline"}
                        size="sm"
                        className={showHeatmap ? "bg-slate-700/80 backdrop-blur-md text-white hover:bg-slate-800/90 shadow-lg border border-slate-600/50" : "bg-white/60 backdrop-blur-sm border-slate-300/60 hover:bg-white/80 text-slate-700 shadow-sm"}
                      >
                        {showHeatmap ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                        Q-Heatmap
                      </Button>
                      <Button
                        onClick={() => setIs3DModalOpen(true)}
                        variant="outline"
                        size="sm"
                        className="bg-white/60 backdrop-blur-sm border-slate-300/60 hover:bg-white/80 text-slate-700 shadow-sm"
                      >
                        <Grid3x3 className="h-3 w-3 mr-1" />
                        3D View
                      </Button>
                    </>
                  )}

                  {/* Action Buttons with Tooltips */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={startTraining}
                          disabled={trainingStatus.status === "training"}
                          size="sm"
                          className="bg-black/80 backdrop-blur-md text-white hover:bg-black shadow-lg border border-black/50 transition-all"
                        >
                          {trainingStatus.status === "training" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Start Training</p>
                      </TooltipContent>
                    </Tooltip>

                    {trainingStatus.policy && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={simulatePolicy}
                            disabled={isAnimating}
                            size="sm"
                            className="bg-blue-700/80 backdrop-blur-md text-white hover:bg-blue-800/90 shadow-lg border border-blue-600/50 transition-all"
                          >
                            {isAnimating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Simulate Learned Policy</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={resetEnvironment}
                          variant="outline"
                          size="sm"
                          className="bg-amber-600/80 backdrop-blur-md text-black hover:bg-amber-700/90 shadow-lg border border-amber-500/50 transition-all"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reset Environment</p>
                      </TooltipContent>
                    </Tooltip>

                    {trainingStatus.status === "completed" && jobId && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={fetchDetailedMetrics}
                            disabled={loadingMetrics}
                            size="sm"
                            className="bg-red-700/80 backdrop-blur-md text-white hover:bg-red-800/90 shadow-lg border border-red-600/50 transition-all"
                          >
                            {loadingMetrics ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <BarChart3 className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Detailed Report</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TooltipProvider>
                </div>

                {/* Editor Tools */}
                {isEditorMode && (
                  <div className="bg-slate-50/80 backdrop-blur-sm border border-slate-200 rounded-lg p-2 space-y-2 shadow-sm">
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        onClick={() => setEditorTool('wall')}
                        variant={editorTool === 'wall' ? "default" : "outline"}
                        size="sm"
                        className={editorTool === 'wall' ? "h-7 text-xs bg-slate-600/80 backdrop-blur-md text-white hover:bg-slate-700/90 border border-slate-500/50 shadow-md" : "h-7 text-xs bg-white/60 backdrop-blur-sm border-slate-300/60 hover:bg-white/80 text-slate-700"}
                      >
                        🧱 Wall
                      </Button>
                      <Button
                        onClick={() => setEditorTool('start')}
                        variant={editorTool === 'start' ? "default" : "outline"}
                        size="sm"
                        className={editorTool === 'start' ? "h-7 text-xs bg-green-600/80 backdrop-blur-md text-white hover:bg-green-700/90 border border-green-500/50 shadow-md" : "h-7 text-xs bg-white/60 backdrop-blur-sm border-slate-300/60 hover:bg-white/80 text-slate-700"}
                      >
                        🟢 Start
                      </Button>
                      <Button
                        onClick={() => setEditorTool('goal')}
                        variant={editorTool === 'goal' ? "default" : "outline"}
                        size="sm"
                        className={editorTool === 'goal' ? "h-7 text-xs bg-orange-600/80 backdrop-blur-md text-white hover:bg-orange-700/90 border border-orange-500/50 shadow-md" : "h-7 text-xs bg-white/60 backdrop-blur-sm border-slate-300/60 hover:bg-white/80 text-slate-700"}
                      >
                        🎯 Goal
                      </Button>
                      <Button
                        onClick={() => setEditorTool('path')}
                        variant={editorTool === 'path' ? "default" : "outline"}
                        size="sm"
                        className={editorTool === 'path' ? "h-7 text-xs bg-purple-600/80 backdrop-blur-md text-white hover:bg-purple-700/90 border border-purple-500/50 shadow-md" : "h-7 text-xs bg-white/60 backdrop-blur-sm border-slate-300/60 hover:bg-white/80 text-slate-700"}
                      >
                        ✏️ Path
                      </Button>
                      <Button onClick={saveMaze} variant="outline" size="sm" className="h-7 text-xs bg-sky-600/80 backdrop-blur-md text-black hover:bg-sky-700/90 border-sky-500/50 shadow-md">
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button onClick={clearMaze} variant="outline" size="sm" className="h-7 text-xs bg-red-600/80 backdrop-blur-md text-black hover:bg-red-700/90 border-red-500/50 shadow-md">
                        <X className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                    {savedMazes.length > 0 && (
                      <div className="max-h-20 overflow-y-auto">
                        <div className="text-xs font-semibold mb-1 text-slate-800">Saved Mazes:</div>
                        <div className="space-y-1">
                          {savedMazes.map((m, i) => (
                            <div key={i} className="flex justify-between items-center bg-white p-1 rounded text-xs">
                              <button onClick={() => loadMaze(m)} className="text-blue-600 hover:underline flex-1 text-left">
                                {m.name} ({m.complexity})
                              </button>
                              <button onClick={() => deleteSavedMaze(i)} className="text-red-600 hover:text-red-800 ml-2">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 items-stretch">
                {/* Vertical Progress Bar - Always Visible */}
                <div className="relative w-2 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`absolute bottom-0 w-full transition-all duration-500 ease-out ${
                      trainingStatus.status === "idle" && !isAnimating
                        ? "bg-black"
                        : trainingStatus.status === "training"
                        ? "bg-yellow-400 animate-pulse"
                        : isAnimating
                        ? "bg-green-400 animate-pulse"
                        : simulationFailed
                        ? "bg-red-500 animate-pulse"
                        : goalReached
                        ? "bg-gradient-to-t from-green-400 via-blue-500 to-purple-600 animate-pulse"
                        : trainingStatus.status === "completed"
                        ? "bg-gradient-to-t from-green-400 to-green-600"
                        : trainingStatus.status === "error"
                        ? "bg-red-500 animate-pulse"
                        : "bg-black"
                    }`}
                    style={{
                      height: trainingStatus.episode && trainingStatus.total_episodes
                        ? `${(trainingStatus.episode / trainingStatus.total_episodes) * 100}%`
                        : isAnimating || goalReached || simulationFailed
                        ? '100%'
                        : '100%',
                    }}
                  />
                </div>

                <div className="grid grid-cols-17 gap-1 bg-gradient-to-br from-gray-100 to-gray-200 p-3 rounded-xl shadow-inner relative flex-1">
                  {maze.map((row, rowIndex) =>
                  row.map((_, colIndex) => {
                    const cellColor = getCellColor(rowIndex, colIndex)
                    const showArrow = !isAnimating &&
                      trainingStatus.policy?.[rowIndex]?.[colIndex] !== undefined &&
                      trainingStatus.policy[rowIndex][colIndex] !== null &&
                      maze[rowIndex][colIndex] === 1
                    
                    // Calculate heatmap overlay
                    const heatmapValue = showHeatmap ? getHeatmapValue(rowIndex, colIndex) : 0
                    const maxHeatmapValue = showHeatmap && qTable ? Math.max(...qTable.flat().flat()) : 1
                    const heatmapColor = showHeatmap && heatmapValue > 0 ? getHeatmapColor(heatmapValue, maxHeatmapValue) : ''
                    
                    // Use heatmap color if showing heatmap, otherwise use normal cell color
                    const displayClassName = showHeatmap && heatmapColor ? '' : cellColor
                    const displayStyle = showHeatmap && heatmapColor ? { backgroundColor: heatmapColor } : {}
                    
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                        onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                        className={`aspect-square ${displayClassName} rounded flex items-center justify-center text-xs font-bold transition-all duration-200 ease-in-out relative ${
                          isEditorMode ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 select-none' : ''
                        } ${maze[rowIndex][colIndex] === 0 && showHeatmap ? 'bg-black' : ''}`}
                        style={displayStyle}
                      >
                        {/* Show arrows only when not animating and not in heatmap mode */}
                        {showArrow && trainingStatus.policy && !showHeatmap && (
                          <span className="text-black drop-shadow-sm opacity-30">
                            {getArrowForAction(trainingStatus.policy[rowIndex][colIndex])}
                          </span>
                        )}
                        {/* Show heatmap values */}
                        {showHeatmap && heatmapValue > 0 && (
                          <span className="text-white text-[8px] font-bold drop-shadow-lg">
                            {heatmapValue.toFixed(1)}
                          </span>
                        )}
                      </div>
                    )
                  }),
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Detailed Metrics Modal */}
      <Dialog open={isMetricsModalOpen} onOpenChange={setIsMetricsModalOpen}>
        <DialogContent className="!max-w-[98vw] !w-[98vw] h-[95vh] !max-h-[95vh] overflow-y-auto bg-white p-4" style={{ width: '98vw', maxWidth: '98vw' }}>
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-bold text-gray-900">📊 Detailed Performance Report</DialogTitle>
          </DialogHeader>

          {detailedMetrics && detailedMetrics.detailed_metrics && (
            <div className="space-y-3 mt-2">
              {/* Summary Cards */}
              <div className="grid grid-cols-5 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300">
                  <div className="text-sm text-blue-700 font-semibold mb-1">Success Rate</div>
                  <div className="text-3xl font-bold text-blue-900">
                    {((detailedMetrics.success_rate || 0) * 100).toFixed(1)}%
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-300">
                  <div className="text-sm text-green-700 font-semibold mb-1">Avg Episode Length</div>
                  <div className="text-3xl font-bold text-green-900">
                    {detailedMetrics.detailed_metrics.avg_episode_length.toFixed(1)}
                  </div>
                  <div className="text-xs text-green-600">steps</div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300">
                  <div className="text-sm text-purple-700 font-semibold mb-1">Avg Return</div>
                  <div className="text-3xl font-bold text-purple-900">
                    {detailedMetrics.detailed_metrics.avg_return.toFixed(2)}
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-300">
                  <div className="text-sm text-red-700 font-semibold mb-1">Training Loss (MSE)</div>
                  <div className="text-3xl font-bold text-red-900">
                    {detailedMetrics.detailed_metrics.training_loss.toFixed(4)}
                  </div>
                  <div className="text-xs text-red-600">Final: {detailedMetrics.detailed_metrics.final_loss.toFixed(4)}</div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300">
                  <div className="text-sm text-orange-700 font-semibold mb-1">Training Time</div>
                  <div className="text-3xl font-bold text-orange-900">
                    {detailedMetrics.detailed_metrics.training_duration.toFixed(1)}s
                  </div>
                  <div className="text-xs text-orange-600">{detailedMetrics.detailed_metrics.episodes_per_sec.toFixed(0)} eps/sec</div>
                </Card>
              </div>

              {/* Charts Row - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Reward Curve */}
                {trainingStatus.rewards && trainingStatus.rewards.length > 0 && (
                  <Card className="p-4 bg-white border-gray-300">
                    <h3 className="text-base font-semibold mb-3 text-gray-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Training Progress - Reward Curve
                    </h3>
                    <SimpleRewardChart 
                      rewards={trainingStatus.rewards} 
                      totalEpisodes={trainingStatus.total_episodes}
                    />
                  </Card>
                )}

                {/* Training Loss Curve */}
                {detailedMetrics.loss_history && detailedMetrics.loss_history.length > 0 && (
                  <Card className="p-4 bg-white border-gray-300">
                    <h3 className="text-base font-semibold mb-3 text-gray-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Training Loss Curve (MSE)
                    </h3>
                    <SimpleLossChart 
                      losses={detailedMetrics.loss_history} 
                      totalEpisodes={detailedMetrics.loss_history.length}
                    />
                    <div className="text-xs text-slate-600 mt-1">
                      Lower loss = better value approximation
                    </div>
                  </Card>
                )}
              </div>

              {/* Quantitative Metrics */}
              <Card className="p-4 bg-white border-gray-300">
                <h3 className="text-base font-semibold mb-3 text-gray-900">📈 Quantitative Metrics</h3>
                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <div className="text-gray-600 font-medium mb-1 text-xs">Undiscounted Return</div>
                    <div className="text-lg font-bold text-gray-900">{detailedMetrics.detailed_metrics.avg_return.toFixed(2)}</div>
                    <div className="text-xs text-slate-600 mt-0.5">Std: {detailedMetrics.detailed_metrics.std_return.toFixed(2)}</div>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <div className="text-gray-600 font-medium mb-1 text-xs">Discounted Return</div>
                    <div className="text-lg font-bold text-gray-900">{detailedMetrics.detailed_metrics.avg_discounted_return.toFixed(2)}</div>
                    <div className="text-xs text-slate-600 mt-0.5">With gamma decay</div>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <div className="text-gray-600 font-medium mb-1 text-xs">Avg Episode Length</div>
                    <div className="text-lg font-bold text-gray-900">{detailedMetrics.detailed_metrics.avg_episode_length.toFixed(1)}</div>
                    <div className="text-xs text-slate-600 mt-0.5">Min: {detailedMetrics.detailed_metrics.min_episode_length.toFixed(0)}</div>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <div className="text-gray-600 font-medium mb-1 text-xs">TD Error</div>
                    <div className="text-lg font-bold text-gray-900">{detailedMetrics.detailed_metrics.avg_td_error.toFixed(3)}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{detailedMetrics.detailed_metrics.avg_td_error === 0 ? 'N/A for MC' : 'Accuracy'}</div>
                  </div>
                  <div className="p-2.5 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
                    <div className="text-indigo-700 font-medium mb-1 text-xs">Training Loss (MSE)</div>
                    <div className="text-lg font-bold text-indigo-900">{detailedMetrics.detailed_metrics.training_loss.toFixed(4)}</div>
                    <div className="text-xs text-indigo-600 mt-0.5">Final: {detailedMetrics.detailed_metrics.final_loss.toFixed(4)}</div>
                  </div>
                </div>
              </Card>

              {/* Bottom Row - Q-Values and Return Distribution Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Q-Value Statistics */}
                <Card className="p-4 bg-white border-gray-300">
                  <h3 className="text-base font-semibold mb-3 text-gray-900">🎯 Q-Value Statistics</h3>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-blue-700 font-medium mb-1 text-sm">Mean</div>
                      <div className="text-lg font-bold text-blue-900">{detailedMetrics.detailed_metrics.q_value_mean.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-green-700 font-medium mb-1 text-sm">Max</div>
                      <div className="text-lg font-bold text-green-900">{detailedMetrics.detailed_metrics.q_value_max.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-red-700 font-medium mb-1 text-sm">Min</div>
                      <div className="text-lg font-bold text-red-900">{detailedMetrics.detailed_metrics.q_value_min.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="text-purple-700 font-medium mb-1 text-sm">Std Dev</div>
                      <div className="text-lg font-bold text-purple-900">{detailedMetrics.detailed_metrics.q_value_std.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                    <strong>Interpretation:</strong> Max Q-values should be near goal states, with values decreasing farther from goal
                  </div>
                </Card>

                {/* Return Distribution */}
                <Card className="p-4 bg-white border-gray-300">
                  <h3 className="text-base font-semibold mb-3 text-gray-900">📊 Return Distribution (Percentiles)</h3>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="p-3 bg-yellow-50 rounded-lg border-2 border-yellow-300">
                      <div className="text-yellow-700 font-medium mb-1 text-sm">25th Percentile</div>
                      <div className="text-lg font-bold text-yellow-900">{detailedMetrics.detailed_metrics.return_p25.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg border-2 border-orange-300">
                      <div className="text-orange-700 font-medium mb-1 text-sm">50th (Median)</div>
                      <div className="text-lg font-bold text-orange-900">{detailedMetrics.detailed_metrics.return_p50.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border-2 border-red-300">
                      <div className="text-red-700 font-medium mb-1 text-sm">75th Percentile</div>
                      <div className="text-lg font-bold text-red-900">{detailedMetrics.detailed_metrics.return_p75.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                    <strong>Interpretation:</strong> Narrow range (p75 - p25) indicates consistent performance, wide range suggests high variance
                  </div>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 3D Q-Value Surface Plot Modal */}
      <Dialog open={is3DModalOpen} onOpenChange={setIs3DModalOpen}>
        <DialogContent className="!max-w-[95vw] !w-[95vw] h-[90vh] !max-h-[90vh] overflow-y-auto bg-white p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-bold text-gray-900">
              <Sparkles className="inline h-5 w-5 mr-2" />
              3D Q-Value Surface Visualization
            </DialogTitle>
            <DialogDescription>
              Interactive 3D surface plot showing Q-values across the maze
            </DialogDescription>
          </DialogHeader>

          {qTable && qTable.length > 0 ? (
            <div className="w-full" style={{ height: '700px' }}>
              <Plot
                data={[
                  {
                    type: 'surface',
                    z: Array.from({ length: 16 }, (_, row) =>
                      Array.from({ length: 17 }, (_, col) => {
                        const stateIndex = row * 17 + col
                        if (maze[row][col] === 0) return 0
                        const qValues = qTable[stateIndex]
                        if (!qValues || qValues.length === 0) return 0
                        return Math.max(...qValues)
                      })
                    ),
                    colorscale: [
                      [0.0, 'rgb(0,0,255)'],
                      [0.25, 'rgb(0,255,255)'],
                      [0.5, 'rgb(0,255,0)'],
                      [0.75, 'rgb(255,255,0)'],
                      [1.0, 'rgb(255,0,0)']
                    ],
                    showscale: true,
                    colorbar: {
                      title: { text: 'Max Q-Value' },
                      titleside: 'right',
                      titlefont: { size: 14 }
                    },
                    hovertemplate: 'Row: %{y}<br>Col: %{x}<br>Max Q: %{z:.2f}<extra></extra>',
                  } as any
                ]}
                layout={{
                  autosize: true,
                  title: {
                    text: `Max Q-Values - ${algorithm.toUpperCase()}`,
                    font: { size: 18, family: 'Arial, sans-serif' }
                  },
                  scene: {
                    xaxis: { title: { text: 'Column' }, gridcolor: '#ddd' },
                    yaxis: { title: { text: 'Row' }, gridcolor: '#ddd' },
                    zaxis: { title: { text: 'Max Q-Value' }, gridcolor: '#ddd' },
                    camera: {
                      eye: { x: 1.5, y: 1.5, z: 1.3 }
                    }
                  },
                  margin: { l: 0, r: 0, t: 50, b: 0 },
                  paper_bgcolor: 'white',
                  plot_bgcolor: 'white',
                }}
                config={{
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['toImage'],
                  responsive: true
                }}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <p className="text-gray-500">No Q-table data available. Complete training first.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
