#!/bin/bash

# Maze Solver Startup Script - Runs both backend and frontend

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping servers...${NC}"
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}✓${NC} Backend stopped"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}✓${NC} Frontend stopped"
    fi
    
    echo -e "${GREEN}✨ Thank you!${NC}"
    echo ""
    exit 0
}

trap cleanup SIGINT SIGTERM

clear
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║${NC}    ${BOLD}🎮  MAZE SOLVER - REINFORCEMENT LEARNING  🎮${NC}    ${BOLD}${CYAN}║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}Starting servers...${NC}"
echo ""

cd backend
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✓${NC} Virtual environment activated"
else
    echo -e "${RED}✗${NC} Virtual environment not found!"
    echo "Run: cd backend && python3 -m venv venv && pip install -r requirements.txt"
    exit 1
fi

nohup uvicorn app:app --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Backend started (PID: $BACKEND_PID)"
    echo -e "  ${CYAN}→${NC} http://localhost:8000"
else
    echo -e "${RED}✗${NC} Backend failed to start"
    cd ..
    exit 1
fi

cd ../frontend

if command -v pnpm &> /dev/null; then
    nohup pnpm dev > ../frontend.log 2>&1 &
else
    nohup npm run dev > ../frontend.log 2>&1 &
fi

FRONTEND_PID=$!
sleep 3

if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Frontend started (PID: $FRONTEND_PID)"
    echo -e "  ${CYAN}→${NC} http://localhost:3000"
else
    echo -e "${RED}✗${NC} Frontend failed to start"
    cd ..
    cleanup
    exit 1
fi

cd ..

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║${NC}              ${BOLD}✨ Servers Running! ✨${NC}              ${BOLD}${GREEN}║${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}║${NC}  Frontend: ${BOLD}http://localhost:3000${NC}                 ${BOLD}${GREEN}║${NC}"
echo -e "${BOLD}${GREEN}║${NC}  Backend:  ${BOLD}http://localhost:8000${NC}                 ${BOLD}${GREEN}║${NC}"
echo -e "${BOLD}${GREEN}║                                                      ║${NC}"
echo -e "${BOLD}${GREEN}║${NC}  ${YELLOW}Press Ctrl+C to stop${NC}                           ${BOLD}${GREEN}║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

tail -f backend.log frontend.log 2>/dev/null

