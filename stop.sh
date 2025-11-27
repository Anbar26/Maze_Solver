#!/bin/bash

# Stop Maze Solver servers

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}Stopping Maze Solver servers...${NC}"
echo ""

BACKEND_PID=$(lsof -ti:8000)
if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null
    echo -e "${GREEN}✓${NC} Backend stopped"
else
    echo -e "${CYAN}ℹ${NC} Backend not running"
fi

FRONTEND_PID=$(lsof -ti:3000)
if [ ! -z "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✓${NC} Frontend stopped"
else
    echo -e "${CYAN}ℹ${NC} Frontend not running"
fi

rm -f backend.log frontend.log 2>/dev/null

echo ""
echo -e "${GREEN}✨ Servers stopped!${NC}"
echo ""

