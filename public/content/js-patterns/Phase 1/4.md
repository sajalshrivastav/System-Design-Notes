# JavaScript Design Patterns Day-4
---
### 7. Chain of Responsibility Pattern
> **Pass requests along a chain of handlers until one handles it.**
```javascript
// ============================================
// CHAIN OF RESPONSIBILITY — Middleware Pipeline
// ============================================
class Middleware {
 #next = null;
 setNext(middleware) {
   this.#next = middleware;
   return middleware; // Enable chaining
 }
 handle(request) {
   if (this.#next) {
     return this.#next.handle(request);
   }
   return request;
 }
}
class AuthMiddleware extends Middleware {
 handle(request) {
   if (!request.headers?.authorization) {
     return { status: 401, body: "Unauthorized" };
   }
   const token = request.headers.authorization.replace("Bearer ", "");
   request.user = { id: 1, name: "Sajal", token };
   console.log("✅ Auth passed");
   return super.handle(request);
 }
}
class RateLimitMiddleware extends Middleware {
 #requests = new Map();
 #limit;
 #windowMs;
 constructor(limit = 100, windowMs = 60000) {
   super();
   this.#limit = limit;
   this.#windowMs = windowMs;
 }
 handle(request) {
   const ip = request.ip || "unknown";
   const now = Date.now();
   const windowStart = now - this.#windowMs;
   if (!this.#requests.has(ip)) {
     this.#requests.set(ip, []);
   }
   const timestamps = this.#requests.get(ip).filter(t => t > windowStart);
   this.#requests.set(ip, timestamps);
   if (timestamps.length >= this.#limit) {
     return { status: 429, body: "Too Many Requests" };
   }
   timestamps.push(now);
   console.log(`✅ Rate limit OK (${timestamps.length}/${this.#limit})`);
   return super.handle(request);
 }
}
class ValidationMiddleware extends Middleware {
 #rules;
 constructor(rules) {
   super();
   this.#rules = rules;
 }
 handle(request) {
   for (const [field, validator] of Object.entries(this.#rules)) {
     if (!validator(request.body?.[field])) {
       return { status: 400, body: `Invalid field: ${field}` };
     }
   }
   console.log("✅ Validation passed");
   return super.handle(request);
 }
}
class LoggingMiddleware extends Middleware {
 handle(request) {
   console.log(`[${new Date().toISOString()}] ${request.method} ${request.path}`);
   return super.handle(request);
 }
}
// Build the chain
const logging = new LoggingMiddleware();
const auth = new AuthMiddleware();
const rateLimit = new RateLimitMiddleware(100);
const validation = new ValidationMiddleware({
 name: (v) => v && v.length >= 2,
 email: (v) => v && v.includes("@"),
});
logging.setNext(rateLimit).setNext(auth).setNext(validation);
// Process request through chain
const result = logging.handle({
 method: "POST",
 path: "/api/users",
 ip: "192.168.1.1",
 headers: { authorization: "Bearer jwt-token-123" },
 body: { name: "Sajal", email: "sajal@mail.com" },
});
console.log("Result:", result);
```
---
### 8. Template Method Pattern
> **Define the skeleton of an algorithm, letting subclasses override specific steps.**
```javascript
// ============================================
// TEMPLATE METHOD — Data Processing Pipeline
// ============================================
class DataProcessor {
 // Template method — defines the algorithm
 async process(source) {
   console.log("🚀 Starting data processing...\n");
   const rawData = await this.fetchData(source);
   const validData = this.validate(rawData);
   const transformedData = this.transform(validData);
   const result = await this.save(transformedData);
   this.notify(result);
   console.log("\n✅ Processing complete!");
   return result;
 }
 // Steps to be overridden by subclasses
 async fetchData(source) { throw new Error("Must implement fetchData"); }
 validate(data) { throw new Error("Must implement validate"); }
 transform(data) { throw new Error("Must implement transform"); }
 async save(data) { throw new Error("Must implement save"); }
 // Optional hook — default implementation
 notify(result) {
   console.log(`Processed ${result.count} records`);
 }
}
class CSVProcessor extends DataProcessor {
 async fetchData(filePath) {
   console.log(`Reading CSV: ${filePath}`);
   // Simulated CSV parsing
   return [
     { name: "Sajal", age: "25", email: "sajal@mail.com" },
     { name: "", age: "30", email: "john@mail.com" },
     { name: "Jane", age: "abc", email: "jane@mail.com" },
   ];
 }
 validate(data) {
   console.log("Validating CSV data...");
   return data.filter(row => {
     return row.name && row.email && !isNaN(Number(row.age));
   });
 }
 transform(data) {
   console.log("Transforming...");
   return data.map(row => ({
     ...row,
     age: Number(row.age),
     name: row.name.trim().toUpperCase(),
   }));
 }
 async save(data) {
   console.log("Saving to database...");
   return { count: data.length, data };
 }
}
class APIProcessor extends DataProcessor {
 async fetchData(apiUrl) {
   console.log(`Fetching from API: ${apiUrl}`);
   return [{ id: 1, status: "active" }, { id: 2, status: "inactive" }];
 }
 validate(data) {
   return data.filter(item => item.id && item.status);
 }
 transform(data) {
   return data.map(item => ({ ...item, processedAt: new Date() }));
 }
 async save(data) {
   return { count: data.length, data };
 }
 notify(result) {
   super.notify(result);
   console.log("📧 Sending notification email...");
 }
}
// Usage
const csvProcessor = new CSVProcessor();
// csvProcessor.process("data/users.csv");
```
---
## 🟠 Modern JavaScript Patterns
### 1. Mixin Pattern
> **Share behavior across classes without inheritance.**
```javascript
// ============================================
// MIXIN — Composable Behaviors
// ============================================
const Serializable = (superclass) => class extends superclass {
 toJSON() {
   return JSON.stringify(this);
 }
 static fromJSON(json) {
   return Object.assign(new this(), JSON.parse(json));
 }
};
const Timestamped = (superclass) => class extends superclass {
 constructor(...args) {
   super(...args);
   this.createdAt = new Date();
   this.updatedAt = new Date();
 }
 touch() {
   this.updatedAt = new Date();
   return this;
 }
};
const Validatable = (superclass) => class extends superclass {
 validate() {
   const rules = this.constructor.validationRules || {};
   const errors = [];
   for (const [field, rule] of Object.entries(rules)) {
     if (!rule(this[field])) {
       errors.push(`Invalid ${field}: ${this[field]}`);
     }
   }
   return { valid: errors.length === 0, errors };
 }
};
// Compose mixins
class User extends Serializable(Timestamped(Validatable(class {}))) {
 static validationRules = {
   name: (v) => v && v.length >= 2,
   email: (v) => v && v.includes("@"),
 };
 constructor(name, email) {
   super();
   this.name = name;
   this.email = email;
 }
}
const user = new User("Sajal", "sajal@mail.com");
console.log(user.validate());    // { valid: true, errors: [] }
console.log(user.toJSON());      // Serialized JSON
console.log(user.createdAt);     // Timestamp
```
---
### 2. Middleware Pattern
> **Process data through a chain of composable functions.**
```javascript
// ============================================
// MIDDLEWARE — Express-style Pipeline
// ============================================
class Pipeline {
 #middlewares = [];
 use(fn) {
   this.#middlewares.push(fn);
   return this;
 }
 async execute(context) {
   let index = 0;
   const next = async () => {
     if (index < this.#middlewares.length) {
       const middleware = this.#middlewares[index++];
       await middleware(context, next);
     }
   };
   await next();
   return context;
 }
}
// Usage
const pipeline = new Pipeline();
pipeline
 .use(async (ctx, next) => {
   ctx.startTime = Date.now();
   console.log(`→ ${ctx.method} ${ctx.path}`);
   await next();
   console.log(`← Response in ${Date.now() - ctx.startTime}ms`);
 })
 .use(async (ctx, next) => {
   // Auth middleware
   if (ctx.headers?.token === "valid-token") {
     ctx.user = { id: 1, role: "admin" };
     await next();
   } else {
     ctx.response = { status: 401, body: "Unauthorized" };
   }
 })
 .use(async (ctx, next) => {
   // Handler
   ctx.response = { status: 200, body: { message: "Hello!" } };
   await next();
 });
pipeline.execute({
 method: "GET",
 path: "/api/data",
 headers: { token: "valid-token" },
});
```
---
### 3. Dependency Injection
> **Pass dependencies into objects instead of creating them internally.**
```javascript
// ============================================
// DEPENDENCY INJECTION — Service Container
// ============================================
class Container {
 #services = new Map();
 #singletons = new Map();
 // Register a factory (creates new instance each time)
 register(name, factory) {
   this.#services.set(name, { factory, singleton: false });
   return this;
 }
 // Register a singleton (created once, cached)
 singleton(name, factory) {
   this.#services.set(name, { factory, singleton: true });
   return this;
 }
 // Resolve a service
 resolve(name) {
   const service = this.#services.get(name);
   if (!service) throw new Error(`Service "${name}" not registered`);
   if (service.singleton) {
     if (!this.#singletons.has(name)) {
       this.#singletons.set(name, service.factory(this));
     }
     return this.#singletons.get(name);
   }
   return service.factory(this);
 }
}
// Setup
const container = new Container();
container.singleton("config", () => ({
 dbHost: "localhost",
 dbPort: 5432,
 apiKey: "secret",
}));
container.singleton("logger", () => ({
 log: (msg) => console.log(`[LOG] ${msg}`),
 error: (msg) => console.error(`[ERR] ${msg}`),
}));
container.singleton("database", (c) => {
 const config = c.resolve("config");
 const logger = c.resolve("logger");
 logger.log(`Connecting to ${config.dbHost}:${config.dbPort}`);
 return { query: (sql) => logger.log(`SQL: ${sql}`) };
});
container.register("userService", (c) => {
 const db = c.resolve("database");
 const logger = c.resolve("logger");
 return {
   getUser(id) {
     logger.log(`Getting user ${id}`);
     db.query(`SELECT * FROM users WHERE id = ${id}`);
     return { id, name: "Sajal" };
   },
 };
});
// Usage — Dependencies are injected automatically
const userService = container.resolve("userService");
userService.getUser(1);
```
---
## 🧠 Pattern Selection Guide
| Scenario | Pattern | Why |
|----------|---------|-----|
| Need only one instance | **Singleton** | Global shared state |
| Create objects based on type | **Factory** | Decouple creation logic |
| Build complex object step by step | **Builder** | Readable construction |
| Clone existing objects | **Prototype** | Avoid expensive creation |
| Simplify complex APIs | **Facade** | Clean interface |
| Add behavior dynamically | **Decorator** | Stack features |
| Make incompatible APIs work | **Adapter** | Bridge interfaces |
| Control access to objects | **Proxy** | Validation, caching, logging |
| Notify on state changes | **Observer** | Event-driven architecture |
| Swap algorithms at runtime | **Strategy** | Flexible behavior |
| Support undo/redo | **Command** | Action history |
| State-dependent behavior | **State** | Clean state transitions |
| Pass request through handlers | **Chain of Responsibility** | Middleware pipelines |
| Share behavior across classes | **Mixin** | Composition over inheritance |
---
> **Next:** [React Design Patterns →](./02_React_Design_Patterns.md)
 