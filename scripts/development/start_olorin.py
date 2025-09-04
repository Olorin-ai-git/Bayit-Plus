#!/usr/bin/env python3

"""
Olorin Service Startup Script
This script starts the frontend, backend, and MCP server with proper process management.
"""

import os
import sys
import time
import signal
import subprocess
import argparse
import json
import socket
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime


class Colors:
    """ANSI color codes for terminal output."""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    PURPLE = '\033[0;35m'
    CYAN = '\033[0;36m'
    WHITE = '\033[1;37m'
    NC = '\033[0m'  # No Color


class OlorinLauncher:
    """Main class for managing Olorin services."""
    
    def __init__(self):
        self.script_dir = Path(__file__).parent.absolute()
        self.backend_dir = self.script_dir / "back"
        self.frontend_dir = self.script_dir / "front"
        self.log_dir = self.script_dir / "logs"
        
        # Default ports
        self.backend_port = int(os.environ.get('BACKEND_PORT', 8000))
        self.frontend_port = int(os.environ.get('FRONTEND_PORT', 3000))
        self.mcp_port = int(os.environ.get('MCP_PORT', 8090))
        
        # Process tracking
        self.processes: Dict[str, subprocess.Popen] = {}
        self.pid_files = {
            'backend': self.log_dir / 'backend.pid',
            'frontend': self.log_dir / 'frontend.pid',
            'mcp': self.log_dir / 'mcp.pid'
        }
        
        # Log files
        self.log_files = {
            'backend': self.log_dir / 'backend.log',
            'frontend': self.log_dir / 'frontend.log',
            'mcp': self.log_dir / 'mcp.log'
        }
        
        # Create logs directory
        self.log_dir.mkdir(exist_ok=True)
        
        # Set up signal handling
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        self.print_status("Received shutdown signal, stopping services...")
        self.stop_all_services()
        sys.exit(0)
    
    def print_status(self, message: str):
        """Print status message with timestamp."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"{Colors.BLUE}[{timestamp}]{Colors.NC} {message}")
    
    def print_success(self, message: str):
        """Print success message."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"{Colors.GREEN}[{timestamp}]{Colors.NC} ✅ {message}")
    
    def print_error(self, message: str):
        """Print error message."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"{Colors.RED}[{timestamp}]{Colors.NC} ❌ {message}")
    
    def print_warning(self, message: str):
        """Print warning message."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"{Colors.YELLOW}[{timestamp}]{Colors.NC} ⚠️  {message}")
    
    def is_port_in_use(self, port: int) -> bool:
        """Check if a port is in use."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('localhost', port))
                return False
            except OSError:
                return True
    
    def read_pid_file(self, service: str) -> Optional[int]:
        """Read PID from file."""
        pid_file = self.pid_files[service]
        if pid_file.exists():
            try:
                with open(pid_file, 'r') as f:
                    return int(f.read().strip())
            except (ValueError, IOError):
                return None
        return None
    
    def write_pid_file(self, service: str, pid: int):
        """Write PID to file."""
        pid_file = self.pid_files[service]
        with open(pid_file, 'w') as f:
            f.write(str(pid))
    
    def remove_pid_file(self, service: str):
        """Remove PID file."""
        pid_file = self.pid_files[service]
        if pid_file.exists():
            pid_file.unlink()
    
    def is_process_running(self, pid: int) -> bool:
        """Check if a process is running."""
        try:
            os.kill(pid, 0)
            return True
        except (OSError, ProcessLookupError):
            return False
    
    def kill_process(self, pid: int, service_name: str, force: bool = False):
        """Kill a process gracefully or forcefully."""
        try:
            if force:
                os.kill(pid, signal.SIGKILL)
                self.print_warning(f"Force killed {service_name} (PID: {pid})")
            else:
                os.kill(pid, signal.SIGTERM)
                self.print_status(f"Stopping {service_name} (PID: {pid})...")
                
                # Wait for graceful shutdown
                for _ in range(10):  # Wait up to 10 seconds
                    if not self.is_process_running(pid):
                        break
                    time.sleep(1)
                
                # Force kill if still running
                if self.is_process_running(pid):
                    os.kill(pid, signal.SIGKILL)
                    self.print_warning(f"Force killed {service_name} (PID: {pid})")
        except (OSError, ProcessLookupError):
            pass  # Process already dead
    
    def stop_service(self, service: str):
        """Stop a specific service."""
        # Stop process if it's in our tracking
        if service in self.processes:
            process = self.processes[service]
            if process.poll() is None:  # Process is still running
                self.kill_process(process.pid, service)
            del self.processes[service]
        
        # Also check PID file
        pid = self.read_pid_file(service)
        if pid and self.is_process_running(pid):
            self.kill_process(pid, service)
        
        self.remove_pid_file(service)
    
    def start_backend(self) -> bool:
        """Start the backend server."""
        self.print_status("Starting Backend server...")
        
        if self.is_port_in_use(self.backend_port):
            self.print_warning(f"Port {self.backend_port} is already in use. Skipping backend startup.")
            return False
        
        if not self.backend_dir.exists():
            self.print_error(f"Backend directory not found: {self.backend_dir}")
            return False
        
        # Check if poetry is available
        try:
            subprocess.run(['poetry', '--version'], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            self.print_error("Poetry not found. Please install Poetry first.")
            return False
        
        # Check if pyproject.toml exists
        if not (self.backend_dir / 'pyproject.toml').exists():
            self.print_error(f"pyproject.toml not found in {self.backend_dir}")
            return False
        
        # Start backend server
        try:
            with open(self.log_files['backend'], 'w') as log_file:
                process = subprocess.Popen(
                    ['poetry', 'run', 'uvicorn', 'app.main:app', 
                     '--host', '0.0.0.0', '--port', str(self.backend_port), '--reload'],
                    cwd=self.backend_dir,
                    stdout=log_file,
                    stderr=subprocess.STDOUT,
                    preexec_fn=os.setsid if os.name != 'nt' else None
                )
            
            self.processes['backend'] = process
            self.write_pid_file('backend', process.pid)
            
            # Wait and check if process is still running
            time.sleep(3)
            if process.poll() is None:
                self.print_success(f"Backend server started (PID: {process.pid}, Port: {self.backend_port})")
                self.print_status(f"Backend logs: {self.log_files['backend']}")
                return True
            else:
                self.print_error(f"Backend server failed to start. Check logs: {self.log_files['backend']}")
                return False
                
        except Exception as e:
            self.print_error(f"Failed to start backend: {e}")
            return False
    
    def start_mcp(self) -> bool:
        """Start the MCP server."""
        self.print_status("Starting MCP server...")
        
        if not self.backend_dir.exists():
            self.print_error(f"Backend directory not found: {self.backend_dir}")
            return False
        
        # Start MCP server
        try:
            with open(self.log_files['mcp'], 'w') as log_file:
                process = subprocess.Popen(
                    ['poetry', 'run', 'python', '-m', 'app.mcp_server.cli', '--transport', 'stdio://'],
                    cwd=self.backend_dir,
                    stdout=log_file,
                    stderr=subprocess.STDOUT,
                    preexec_fn=os.setsid if os.name != 'nt' else None,
                    stdin=subprocess.PIPE  # Keep stdin open
                )
            
            self.processes['mcp'] = process
            self.write_pid_file('mcp', process.pid)
            
            # Wait and check if process is still running
            time.sleep(3)
            if process.poll() is None:
                self.print_success(f"MCP server started (PID: {process.pid})")
                self.print_status(f"MCP logs: {self.log_files['mcp']}")
                return True
            else:
                self.print_error(f"MCP server failed to start. Check logs: {self.log_files['mcp']}")
                return False
                
        except Exception as e:
            self.print_error(f"Failed to start MCP: {e}")
            return False
    
    def start_frontend(self) -> bool:
        """Start the frontend server."""
        self.print_status("Starting Frontend server...")
        
        if self.is_port_in_use(self.frontend_port):
            self.print_warning(f"Port {self.frontend_port} is already in use. Skipping frontend startup.")
            return False
        
        if not self.frontend_dir.exists():
            self.print_error(f"Frontend directory not found: {self.frontend_dir}")
            return False
        
        # Check if npm is available
        try:
            subprocess.run(['npm', '--version'], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            self.print_error("npm not found. Please install Node.js and npm first.")
            return False
        
        # Check if package.json exists
        if not (self.frontend_dir / 'package.json').exists():
            self.print_error(f"package.json not found in {self.frontend_dir}")
            return False
        
        # Install dependencies if node_modules doesn't exist
        if not (self.frontend_dir / 'node_modules').exists():
            self.print_status("Installing frontend dependencies...")
            try:
                subprocess.run(['npm', 'install'], cwd=self.frontend_dir, check=True)
            except subprocess.CalledProcessError:
                self.print_error("Failed to install frontend dependencies")
                return False
        
        # Start frontend server
        try:
            with open(self.log_files['frontend'], 'w') as log_file:
                # Set environment variable for port
                env = os.environ.copy()
                env['PORT'] = str(self.frontend_port)
                
                process = subprocess.Popen(
                    ['npm', 'start'],
                    cwd=self.frontend_dir,
                    stdout=log_file,
                    stderr=subprocess.STDOUT,
                    env=env,
                    preexec_fn=os.setsid if os.name != 'nt' else None
                )
            
            self.processes['frontend'] = process
            self.write_pid_file('frontend', process.pid)
            
            # Wait longer for frontend to start
            time.sleep(8)
            if process.poll() is None:
                self.print_success(f"Frontend server started (PID: {process.pid}, Port: {self.frontend_port})")
                self.print_status(f"Frontend logs: {self.log_files['frontend']}")
                return True
            else:
                self.print_error(f"Frontend server failed to start. Check logs: {self.log_files['frontend']}")
                return False
                
        except Exception as e:
            self.print_error(f"Failed to start frontend: {e}")
            return False
    
    def start_all_services(self):
        """Start all services."""
        self.print_status("Starting Olorin services...")
        
        services_started = []
        
        # Start backend (continue even if it fails)
        try:
            if self.start_backend():
                services_started.append('backend')
        except Exception as e:
            self.print_error(f"Backend startup failed: {e}")
        
        # Start MCP server (continue even if it fails)
        try:
            if self.start_mcp():
                services_started.append('mcp')
        except Exception as e:
            self.print_error(f"MCP server startup failed: {e}")
        
        # Start frontend (continue even if it fails)
        try:
            if self.start_frontend():
                services_started.append('frontend')
        except Exception as e:
            self.print_error(f"Frontend startup failed: {e}")
        
        if services_started:
            self.print_success("Services started successfully!")
            self.print_status("URLs:")
            if 'frontend' in services_started:
                self.print_status(f"  Frontend: http://localhost:{self.frontend_port}")
            if 'backend' in services_started:
                self.print_status(f"  Backend:  http://localhost:{self.backend_port}")
                self.print_status(f"  API Docs: http://localhost:{self.backend_port}/docs")
            self.print_status("")
            self.print_status("Press Ctrl+C to stop all services")
            
            # Wait for interrupt
            try:
                while True:
                    time.sleep(1)
                    # Check if any process has died
                    for service, process in list(self.processes.items()):
                        if process.poll() is not None:
                            self.print_error(f"{service} process has died")
                            del self.processes[service]
            except KeyboardInterrupt:
                pass
        else:
            self.print_warning("No services were started successfully")
            self.print_status("Check the logs for more details on startup failures")
    
    def stop_all_services(self):
        """Stop all services."""
        self.print_status("Shutting down services...")
        
        for service in ['frontend', 'backend', 'mcp']:
            self.stop_service(service)
        
        self.print_success("All services stopped")
    
    def restart_all_services(self):
        """Restart all services."""
        self.stop_all_services()
        time.sleep(2)
        self.start_all_services()
    
    def check_status(self):
        """Check the status of all services."""
        self.print_status("Checking service status...")
        
        for service in ['backend', 'mcp', 'frontend']:
            pid = self.read_pid_file(service)
            if pid and self.is_process_running(pid):
                port_info = ""
                if service == 'backend':
                    port_info = f", Port: {self.backend_port}"
                elif service == 'frontend':
                    port_info = f", Port: {self.frontend_port}"
                
                self.print_success(f"{service.capitalize()} running (PID: {pid}{port_info})")
            else:
                self.print_error(f"{service.capitalize()} not running")
    
    def show_logs(self, lines: int = 20):
        """Show recent logs from all services."""
        self.print_status(f"Recent logs from all services (last {lines} lines):")
        print()
        
        for service, log_file in self.log_files.items():
            if log_file.exists():
                print(f"{Colors.BLUE}=== {service.capitalize()} Logs ==={Colors.NC}")
                try:
                    with open(log_file, 'r') as f:
                        lines_list = f.readlines()
                        for line in lines_list[-lines:]:
                            print(line.rstrip())
                except Exception as e:
                    print(f"Error reading log file: {e}")
                print()
    
    def create_config_file(self):
        """Create a sample configuration file for Claude Desktop."""
        config = {
            "mcpServers": {
                "olorin": {
                    "command": "poetry",
                    "args": ["run", "python", "-m", "app.mcp_server.cli"],
                    "cwd": str(self.backend_dir.absolute())
                }
            }
        }
        
        config_file = self.script_dir / "claude_desktop_config.json"
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        self.print_success(f"Claude Desktop configuration created: {config_file}")
        self.print_status("Add this configuration to your Claude Desktop settings")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Olorin Service Launcher")
    parser.add_argument('command', nargs='?', default='start',
                       choices=['start', 'stop', 'restart', 'status', 'logs', 'config'],
                       help='Command to execute')
    parser.add_argument('--lines', type=int, default=20,
                       help='Number of log lines to show (for logs command)')
    
    args = parser.parse_args()
    
    launcher = OlorinLauncher()
    
    try:
        if args.command == 'start':
            launcher.start_all_services()
        elif args.command == 'stop':
            launcher.stop_all_services()
        elif args.command == 'restart':
            launcher.restart_all_services()
        elif args.command == 'status':
            launcher.check_status()
        elif args.command == 'logs':
            launcher.show_logs(args.lines)
        elif args.command == 'config':
            launcher.create_config_file()
    except KeyboardInterrupt:
        launcher.print_status("Interrupted by user")
        launcher.stop_all_services()
    except Exception as e:
        launcher.print_error(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main() 