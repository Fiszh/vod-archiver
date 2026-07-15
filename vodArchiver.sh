#!/bin/bash
if [ $# -eq 0 ]; then
    echo "Usage: $0 {start|stop|restart|status|logs}"
    exit 1
fi

case $1 in
    start|stop|restart|status)
        sudo systemctl $1 vodArchiver
        ;;
    logs)
        sudo journalctl -u vodArchiver -f
        ;;
    *)
        echo "Unknown command: $1"
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac