@echo off
set "PATH=C:\Users\Roman Kozachenko\Documents\Migration_WM\nodetools\extracted\node-v24.21.0-win-x64;%PATH%"
cd /d "C:\Users\Roman Kozachenko\Documents\Migration_TM\Tag-Master---Migration"
npm run dev -- --port 8081 --strictPort
