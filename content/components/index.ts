import type { Component } from "@tintelix/schema";
import appServer from "./app-server.json";
import cache from "./cache.json";
import cdn from "./cdn.json";
import database from "./database.json";
import loadBalancer from "./load-balancer.json";
import users from "./users.json";

export const components = [users, loadBalancer, appServer, cache, cdn, database] as Component[];
