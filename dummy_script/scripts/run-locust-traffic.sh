#!/bin/bash

# Locust High-Volume Traffic Test Runner
# Supports single instance, web UI, and distributed modes

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default configuration
PRODUCER_URL="${PRODUCER_URL:-https://api.jungle-panopticon.cloud/producer}"

# Get script directory and set locustfile path
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOCUST_FILE="${SCRIPT_DIR}/locustfile_traffic.py"
REPORTS_DIR="$( cd "${SCRIPT_DIR}/.." && pwd )/reports"

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}🦗 Locust High-Volume Traffic Test Runner${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Check if locust is installed (try both command and python module)
if command -v locust &> /dev/null; then
    LOCUST_CMD="locust"
elif python3 -m locust --version &> /dev/null; then
    LOCUST_CMD="python3 -m locust"
else
    echo -e "${RED}❌ Locust is not installed!${NC}"
    echo -e "${YELLOW}Install it with: pip3 install locust${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Locust is installed${NC}"
echo -e "Target Server: ${BLUE}${PRODUCER_URL}${NC}"
echo ""

# Display menu
echo "Select test mode:"
echo "  1) Headless Mode - Single instance (60 users, for testing)"
echo "  2) Web UI Mode - Interactive monitoring (single instance)"
echo "  3) Distributed Master - For 5-instance distributed setup (RECOMMENDED)"
echo "  4) Distributed Worker - Run on worker nodes"
echo "  5) Custom parameters"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo -e "${GREEN}Starting headless load test (single instance)...${NC}"
        echo -e "${YELLOW}Configuration:${NC}"
        echo -e "${YELLOW}  - Users: 60${NC}"
        echo -e "${YELLOW}  - Spawn rate: 10 users/sec${NC}"
        echo -e "${YELLOW}  - Expected: ~400 RPS, ~12,000 spans/sec${NC}"
        echo -e "${YELLOW}  - Run time: Continuous (Ctrl+C to stop)${NC}"
        echo -e "${YELLOW}Note: For 60k spans/sec target, use distributed mode (option 3)${NC}"
        echo ""
        mkdir -p "$REPORTS_DIR"
        $LOCUST_CMD -f "$LOCUST_FILE" \
               --host "$PRODUCER_URL" \
               --users 60 \
               --spawn-rate 10 \
               --headless \
               --print-stats \
               --html "${REPORTS_DIR}/locust-traffic-$(date +%Y%m%d-%H%M%S).html"
        ;;
    2)
        echo -e "${GREEN}Starting Locust in Web UI mode...${NC}"
        echo -e "${YELLOW}Open http://localhost:8089 in your browser${NC}"
        echo -e "${YELLOW}Recommended settings:${NC}"
        echo -e "${YELLOW}  - Number of users: 60${NC}"
        echo -e "${YELLOW}  - Spawn rate: 10${NC}"
        echo -e "${YELLOW}  - Expected: ~400 RPS, ~12,000 spans/sec${NC}"
        echo -e "${YELLOW}Note: For 60k spans/sec target, use distributed mode (option 3)${NC}"
        echo ""
        mkdir -p "$REPORTS_DIR"
        $LOCUST_CMD -f "$LOCUST_FILE" \
               --host "$PRODUCER_URL" \
               --html "${REPORTS_DIR}/locust-traffic-webui-$(date +%Y%m%d-%H%M%S).html"
        ;;
    3)
        echo -e "${GREEN}Starting Locust Master node...${NC}"
        echo -e "${YELLOW}Configuration for 5-instance distributed setup:${NC}"
        echo -e "${YELLOW}  - Total users: 300 (60 per worker × 5 workers)${NC}"
        echo -e "${YELLOW}  - Spawn rate: 50 users/sec${NC}"
        echo -e "${YELLOW}  - Expected: ~2,000 RPS, ~60,000 spans/sec (system-wide)${NC}"
        echo ""
        echo -e "${YELLOW}Connect 4 worker nodes to this master:${NC}"
        echo -e "${YELLOW}  ./run-locust-traffic.sh  (select option 4 on each worker)${NC}"
        echo -e "${YELLOW}Master Web UI: http://localhost:8089${NC}"
        echo -e "${YELLOW}In Web UI, set: Users=300, Spawn rate=50${NC}"
        echo ""
        mkdir -p "$REPORTS_DIR"
        $LOCUST_CMD -f "$LOCUST_FILE" \
               --host "$PRODUCER_URL" \
               --master \
               --expect-workers 4 \
               --html "${REPORTS_DIR}/locust-traffic-distributed-$(date +%Y%m%d-%H%M%S).html"
        ;;
    4)
        read -p "Enter master host IP address (e.g., 192.168.1.100): " master_host
        echo -e "${GREEN}Starting Locust Worker node...${NC}"
        echo -e "${YELLOW}Connecting to master: ${master_host}:5557${NC}"
        echo -e "${YELLOW}This worker will run tasks assigned by the master${NC}"
        echo ""
        $LOCUST_CMD -f "$LOCUST_FILE" \
               --worker \
               --master-host "$master_host"
        ;;
    5)
        echo ""
        read -p "Number of users: " users
        read -p "Spawn rate (users/sec): " spawn_rate
        read -p "Run time (e.g., 1h, 30m, or leave empty for continuous): " run_time
        read -p "Run in headless mode? (y/n): " headless

        if [[ "$headless" == "y" || "$headless" == "Y" ]]; then
            echo -e "${GREEN}Starting custom headless test...${NC}"
            echo -e "${YELLOW}Users: ${users}, Spawn rate: ${spawn_rate}${NC}"
            mkdir -p "$REPORTS_DIR"

            if [ -n "$run_time" ]; then
                $LOCUST_CMD -f "$LOCUST_FILE" \
                       --host "$PRODUCER_URL" \
                       --users "$users" \
                       --spawn-rate "$spawn_rate" \
                       --run-time "$run_time" \
                       --headless \
                       --print-stats \
                       --html "${REPORTS_DIR}/locust-traffic-custom-$(date +%Y%m%d-%H%M%S).html"
            else
                $LOCUST_CMD -f "$LOCUST_FILE" \
                       --host "$PRODUCER_URL" \
                       --users "$users" \
                       --spawn-rate "$spawn_rate" \
                       --headless \
                       --print-stats \
                       --html "${REPORTS_DIR}/locust-traffic-custom-$(date +%Y%m%d-%H%M%S).html"
            fi
        else
            echo -e "${GREEN}Starting custom Web UI test...${NC}"
            echo -e "${YELLOW}Open http://localhost:8089${NC}"
            echo -e "${YELLOW}Set users to ${users}, spawn rate to ${spawn_rate}${NC}"
            mkdir -p "$REPORTS_DIR"
            $LOCUST_CMD -f "$LOCUST_FILE" \
                   --host "$PRODUCER_URL" \
                   --html "${REPORTS_DIR}/locust-traffic-custom-$(date +%Y%m%d-%H%M%S).html"
        fi
        ;;
    *)
        echo -e "${RED}Invalid choice!${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}=================================================${NC}"
echo -e "${GREEN}✅ Test completed!${NC}"
echo -e "${BLUE}=================================================${NC}"

# Check if reports directory exists and show last report
if [ -d "$REPORTS_DIR" ]; then
    LATEST_REPORT=$(ls -t "${REPORTS_DIR}"/locust-traffic-*.html 2>/dev/null | head -1)
    if [ -n "$LATEST_REPORT" ]; then
        echo -e "${YELLOW}Report saved: ${LATEST_REPORT}${NC}"
        echo -e "${YELLOW}Open it in a browser to view detailed results${NC}"
    fi
fi
