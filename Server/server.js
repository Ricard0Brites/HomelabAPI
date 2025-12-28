import express from 'express';
import process from 'process';

import { readdir } from 'fs/promises';
import path from 'path';
import { Worker } from 'worker_threads';

const DevelopmentMode = true;
var CurrentVersion = -1;
class Thread 
{
    constructor(threadname, pathToModule, workerArgs = { type: 'module' }) 
    {
        this.threadname = threadname;
        this.__threadRef = new Worker(pathToModule, workerArgs);
        this.__terminated = false;

        this.__threadRef.once('exit', () => 
        {
            this.__terminated = true;
        });
    }

    isActive() 
    {
        return !this.__terminated;
    }

    kill()
    {
        if (this.__terminated) return;
        this.__threadRef.terminate();
    }

    bindOnTerminated(handler) 
    {
        this.__threadRef.once('exit', handler);
    }
}
class Server
{
    listenPort = null;
    server = null;
    isUpdating = false;
    
    constructor(listenPort = 3001)
    {
        this.listenPort = listenPort;
    }

    async startServer()
    {
        if(!this.listenPort)
        {
            console.error(`Server Not Started\n Port: ${this.listenPort}`);
            return;
        }
        this.server = express();
        this.server.set('trust proxy', true);
        
        await this.registerPaths();

        //Start Listening
        this.server = this.server.listen(this.listenPort, async () => 
        {
            console.log(`Server listening on ${this.listenPort}`);
        });

        while(true) //Fetch updates indefinitely
        {
            await this.fetchUpdates();
            await new Promise(resolve => setTimeout(resolve, 60000)); // wait 60s
        }
    }

    stopServer()
    {
        //stops the server and ends the process
        
        if(this.server)
            this.server.close(() => process.exit(0));
    }

    async registerPaths()
    {
        // In a func for readability
        // Gets All The services
        const GetServices = async () => 
        {
            const dir = path.resolve(process.cwd(), '');
            const entries = await readdir(dir, { withFileTypes: true });
            
            const folders = entries
            .filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('node_modules') && !e.name.startsWith('obj'))
            .map(e => path.join(dir, e.name));

            return folders;   
        }
        const Services = await GetServices();

        for(const service of Services)
        {
            const servicename = path.basename(service);
            const servicepath = service;

            //Create URL Binding
            this.server.get(`/${servicename}`, async () => 
            {
                while(this.isUpdating)
                {
                    // Wait 100 ms to recheck.
                    await new Promise(resolve => setTimeout(()=>{console.warn('Updating Services. Worker startup suspended 100ms')}, 100)); // wait 1s
                }

                const CurrentThread = new Thread(`${servicename}_Thread`, servicepath);

                while(CurrentThread.isActive())
                {
                    // Wait 100 ms to recheck.
                    await new Promise(resolve => setTimeout(resolve, 100)); // wait 1s
                }
                // continues to the next service
            });            
        }
    }

    async fetchUpdates()
    {
        const url = 'https://api.github.com/repos/Ricard0Brites/HomelabAPI/releases/latest';

        const res = await fetch(url, 
            {
                headers: 
                {
                    'Accept': 'application/vnd.github+json',
                    'User-Agent': 'HomelabAPI'
                }
            });

        const data = await res.json();
        console.log(data.tag_name, data.id);

        // If fetched version is different than the current version
            // set this.isUpdating = true
            // Update all files
            // Build
            // set this.isUpdating = false
    }
}

const serverRef = new Server(3001);
serverRef.startServer();