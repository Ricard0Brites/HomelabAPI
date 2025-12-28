import express from "express";
class Server
{
    listenPort = null;
    server = null;
    
    constructor(listenPort = 3001)
    {
        this.listenPort = listenPort;
    }
    
    startServer()
    {
        if(!this.listenPort)
        {
            console.error(`Server Not Started\n Port: ${this.listenPort}`);
            return;
        }
        this.server = express();
        this.server.set("trust proxy", true);

        //Start Listening
        this.server.get("/", this.onRequestReceived);
        

        this.server = this.server.listen(this.listenPort, () => 
        {
            console.log(`Server listening on ${this.listenPort}`);
        });
    }

    stopServer()
    {
        //stops the server and ends the process
        
        if(this.server)
            this.server.close(() => process.exit(0));
    }

    onRequestReceived(req, res)
    {
        res.send("ok");
    }
}

const serverRef = new Server(3001);
serverRef.startServer();