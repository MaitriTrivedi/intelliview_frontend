# Server Configuration Guide

This documentation explains how to configure the server IP addresses for the IntelliView application.

## Changing the Server IP Address

When your server IP address changes, you need to update it in just one place. There are two ways to update the IP address:

### Method 1: Using the Update Script (Recommended)

The easiest way to update the server IP is to use the provided script:

```bash
# From the project root directory
npm run update-ip 192.168.1.100
```

Replace `192.168.1.100` with your server's IP address.

This will update both the main backend server IP and the LLM service IP to the same address.

### Method 2: Manually Editing the Configuration File

You can also manually edit the configuration file:

1. Open `src/config/environment.js`
2. Find the line that says: `export const SERVER_IP = '127.0.0.1';`
3. Change the IP address to your server's IP address
4. If needed, also update: `export const LLM_SERVER_IP = SERVER_IP;` if your LLM service is on a different machine
5. Save the file

## Additional Configuration Options

The server configuration allows for more advanced options:

### Changing the Server Ports

To change the port numbers:

1. Open `src/config/environment.js`
2. Find the line that says: `export const SERVER_PORT = '8000';` for the main backend server
3. Find the line that says: `export const LLM_SERVER_PORT = '8080';` for the LLM service
4. Change the ports to your desired values
5. Save the file

### Using HTTPS

To enable HTTPS:

1. Open `src/config/environment.js`
2. Find the line that says: `export const USE_HTTPS = false;`
3. Change it to `export const USE_HTTPS = true;`
4. Save the file

## Service Architecture

IntelliView uses two server components:

1. **Main Backend Server** - Django-based REST API server (default port 8000)
2. **LLM Service** - FastAPI service for AI interview question generation (default port 8080)

By default, both services are expected to run on the same machine, but you can configure them to run on separate machines if needed.

## Verifying the Configuration

When you start the application, it will log the current server configuration in the browser console (press F12 to view). You should see output similar to:

```
Network Configuration:
Server IP: 192.168.1.100
Server Port: 8000
API Base URL: http://192.168.1.100:8000
LLM Service URL: http://192.168.1.100:8080
✅ Server is reachable
```

If the server is not reachable, you'll see:

```
❌ Server is not reachable
```

## Troubleshooting

If you're having trouble connecting to the server:

1. Make sure both servers are running
2. Check that the IP addresses are correct
3. Ensure there are no firewalls blocking the connection
4. Verify that the server and client are on the same network (or the servers are accessible from the client's network)
5. Try pinging the server IP from the client machine to verify connectivity

For more advanced configuration, refer to the environment configuration file at `src/config/environment.js`. 