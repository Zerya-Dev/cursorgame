import {
    defineServer,
    defineRoom,
    monitor,
    playground,
    createRouter,
    createEndpoint,
} from "colyseus";

import { MainRoom } from "./rooms/MainRoom.js";
import basicAuth from "express-basic-auth";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LobbyRoom } from "./rooms/LobbyRoom.js";

const basicAuthMiddleware = basicAuth({
    users: { "admin": "admin" },
    challenge: true
});

const server = defineServer({
    /**
     * Define your room handlers:
     */
    rooms: {
        lobby: defineRoom(LobbyRoom),
        main_room: defineRoom(MainRoom)
    },

    /**
     * Experimental: Define API routes. Built-in integration with the "playground" and SDK.
     * 
     * Usage from SDK: 
     *   client.http.get("/api/hello").then((response) => {})
     * 
     */
    routes: createRouter({
        api_hello: createEndpoint("/api/hello", { method: "GET", }, async (ctx) => {
            return { message: "Hello World" }
        })
    }),

    /**
     * Bind your custom express routes here:
     * Read more: https://expressjs.com/en/starter/basic-routing.html
     */
    express: (app) => {
        const frontendDist = fileURLToPath(new URL("../../frontend/dist", import.meta.url));
        if (process.env.NODE_ENV === "production") {
            app.use(express.static(frontendDist));
        }

        app.get("/hi", (req, res) => {
            res.send("It's time to kick ass and chew bubblegum!");
        });

        app.get('/assets/:file', (req, res, next) => {
            res.sendFile(path.join(fileURLToPath(new URL("../../frontend/assets", import.meta.url)), req.params.file));
        });

        /**
         * Use @colyseus/monitor
         * It is recommended to protect this route with a password
         * Read more: https://docs.colyseus.io/tools/monitoring/#restrict-access-to-the-panel-using-a-password
         */
        app.use("/monitor", basicAuthMiddleware, monitor());

        /**
         * Use @colyseus/playground
         * (It is not recommended to expose this route in a production environment)
         */
        if (process.env.NODE_ENV !== "production") {
            app.use("/", playground());
        } else {
	        app.use(express.static(frontendDist));
	        app.get("/", (_req, res) => {
		        res.sendFile(path.join(frontendDist, "index.html"));
	        });
        }
    }

});

export default server;
