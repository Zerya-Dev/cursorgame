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
    rooms: {
        lobby: defineRoom(LobbyRoom),
        main_room: defineRoom(MainRoom)
    },

    routes: createRouter({
        api_hello: createEndpoint("/api/hello", { method: "GET", }, async (ctx) => {
            return { message: "Hello World" }
        })
    }),

    express: (app) => {
        // Resolved relative to the bundled output at backend/build/index.js.
        const frontendDist = fileURLToPath(new URL("../../frontend/dist", import.meta.url));

        app.get("/hi", (req, res) => {
            res.send("It's time to kick ass and chew bubblegum!");
        });

        app.use("/monitor", basicAuthMiddleware, monitor());

        if (process.env.NODE_ENV !== "production") {
            app.use("/", playground());
        } else {
	        app.use(express.static(frontendDist));
            app.get("/favicon.ico", (_req, res) => {
                res.sendFile(path.join(frontendDist, "assets", "favicon.ico"));
            });
	        app.get("/", (_req, res) => {
		        res.sendFile(path.join(frontendDist, "index.html"));
	        });
        }
    }

});

export default server;
