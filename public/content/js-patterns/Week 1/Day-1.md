# JavaScript Design Patterns Day-1
---
## 📖 Table of Contents
1. [What Are Design Patterns?](#what-are-design-patterns)
2. [Creational Patterns](#-creational-patterns)
  - Singleton
  - Factory
  - Abstract Factory
  - Builder
  - Prototype
3. [Structural Patterns](#-structural-patterns)
  - Module / Revealing Module
  - Facade
  - Decorator
  - Adapter
  - Proxy
  - Flyweight
  - Composite
4. [Behavioral Patterns](#-behavioral-patterns)
  - Observer / PubSub
  - Mediator
  - Strategy
  - Command
  - Iterator
  - State
  - Chain of Responsibility
  - Template Method
5. [Modern JS Patterns](#-modern-javascript-patterns)
  - Mixin
  - Middleware
  - Dependency Injection
  - Lazy Initialization
---
## What Are Design Patterns?
Design patterns are **proven, reusable solutions** to common software design problems. They are NOT ready-made code — they are templates/blueprints you adapt to your situation.
### Three Categories
| Category       | Purpose                                  | Examples                           |
|---------------|------------------------------------------|------------------------------------|
| **Creational** | How objects are **created**              | Singleton, Factory, Builder        |
| **Structural** | How objects are **composed/organized**   | Facade, Decorator, Proxy, Adapter  |
| **Behavioral** | How objects **communicate/interact**     | Observer, Strategy, Command, State |
---
## 🟢 Creational Patterns
### 1. Singleton Pattern
> **One instance, shared everywhere.**
The Singleton ensures a class has only ONE instance and provides a global point of access to it.
#### When to Use
- Database connections
- Configuration managers
- Logger services
- Caching layers
- Global state stores
```javascript
// ============================================
// SINGLETON — Basic Implementation
// ============================================
class Database {
 constructor() {
   if (Database.instance) {
     return Database.instance; // Return existing instance
   }
   this.connection = "MongoDB://localhost:27017";
   this.isConnected = false;
   Database.instance = this; // Store the instance
 }
 connect() {
   if (!this.isConnected) {
     console.log(`Connecting to ${this.connection}...`);
     this.isConnected = true;
   }
   return this;
 }
 query(sql) {
   if (!this.isConnected) throw new Error("Not connected!");
   console.log(`Executing: ${sql}`);
   return { rows: [] };
 }
}
// Usage
const db1 = new Database();
const db2 = new Database();
console.log(db1 === db2); // ✅ true — Same instance!

// ============================================
// SINGLETON — Using Closure (More Robust)
// ============================================
const DatabaseSingleton = (() => {
 let instance = null;
 class Database {
   constructor(config) {
     this.host = config.host;
     this.port = config.port;
     this.connectionPool = [];
   }
   connect() {
     console.log(`Connected to ${this.host}:${this.port}`);
     return this;
   }
   getConnection() {
     return { host: this.host, active: true };
   }
 }
 return {
   getInstance(config) {
     if (!instance) {
       instance = new Database(config);
     }
     return instance;
   }
 };
})();
// Usage
const db = DatabaseSingleton.getInstance({ host: "localhost", port: 5432 });
const db2Copy = DatabaseSingleton.getInstance({ host: "remote", port: 3306 });
// db2Copy still points to the FIRST instance — config is ignored!
console.log(db === db2Copy); // ✅ true

// ============================================
// SINGLETON — ES Module Pattern (Modern JS)
// ============================================
// logger.js — In ES Modules, a module is evaluated ONCE
// So any exported instance is inherently a singleton
class Logger {
 #logs = [];
 log(message) {
   const entry = { timestamp: Date.now(), message };
   this.#logs.push(entry);
   console.log(`[LOG] ${message}`);
 }
 warn(message) {
   const entry = { timestamp: Date.now(), level: "WARN", message };
   this.#logs.push(entry);
   console.warn(`[WARN] ${message}`);
 }
 getLogs() {
   return [...this.#logs]; // Return copy
 }
}
// Export a single instance — singleton by nature of ES modules
// export default new Logger();
```
#### ⚠️ Pitfalls
- Makes unit testing harder (global state)
- Can hide dependencies
- Thread-safety issues in other languages (not in JS due to single-threaded nature)
---
### 2. Factory Pattern
> **Create objects without specifying their exact class.**
The Factory delegates object creation to a dedicated function/class, decoupling creation logic from business logic.
#### When to Use
- When object creation is complex
- When you need different objects based on conditions
- When you want to centralize creation logic
- API response parsing, UI component creation
```javascript
// ============================================
// FACTORY — Simple Function Factory
// ============================================
function createUser(type, data) {
 const baseUser = {
   id: crypto.randomUUID(),
   name: data.name,
   email: data.email,
   createdAt: new Date(),
 };
 switch (type) {
   case "admin":
     return {
       ...baseUser,
       role: "admin",
       permissions: ["read", "write", "delete", "manage_users"],
       canAccessDashboard: true,
     };
   case "editor":
     return {
       ...baseUser,
       role: "editor",
       permissions: ["read", "write"],
       canAccessDashboard: true,
     };
   case "viewer":
     return {
       ...baseUser,
       role: "viewer",
       permissions: ["read"],
       canAccessDashboard: false,
     };
   default:
     throw new Error(`Unknown user type: ${type}`);
 }
}
// Usage
const admin = createUser("admin", { name: "Sajal", email: "sajal@example.com" });
const viewer = createUser("viewer", { name: "Guest", email: "guest@example.com" });
console.log(admin.permissions); // ["read", "write", "delete", "manage_users"]

// ============================================
// FACTORY — Class-based Factory
// ============================================
class Notification {
 constructor(message) {
   this.message = message;
   this.timestamp = Date.now();
 }
 send() { throw new Error("send() must be implemented"); }
}
class EmailNotification extends Notification {
 constructor(message, to) {
   super(message);
   this.to = to;
   this.type = "email";
 }
 send() {
   console.log(`📧 Sending email to ${this.to}: ${this.message}`);
 }
}
class SMSNotification extends Notification {
 constructor(message, phone) {
   super(message);
   this.phone = phone;
   this.type = "sms";
 }
 send() {
   console.log(`📱 Sending SMS to ${this.phone}: ${this.message}`);
 }
}
class PushNotification extends Notification {
 constructor(message, deviceToken) {
   super(message);
   this.deviceToken = deviceToken;
   this.type = "push";
 }
 send() {
   console.log(`🔔 Sending push to ${this.deviceToken}: ${this.message}`);
 }
}
// THE FACTORY
class NotificationFactory {
 static create(type, message, target) {
   switch (type) {
     case "email": return new EmailNotification(message, target);
     case "sms":   return new SMSNotification(message, target);
     case "push":  return new PushNotification(message, target);
     default: throw new Error(`Unknown notification type: ${type}`);
   }
 }
}
// Usage — Client doesn't need to know about specific classes
const notifications = [
 NotificationFactory.create("email", "Welcome!", "sajal@mail.com"),
 NotificationFactory.create("sms", "Your OTP is 1234", "+919876543210"),
 NotificationFactory.create("push", "New message!", "device_abc123"),
];
notifications.forEach(n => n.send());

// ============================================
// FACTORY — With Registration (Extensible)
// ============================================
class PaymentProcessorFactory {
 static #processors = new Map();
 static register(name, ProcessorClass) {
   this.#processors.set(name, ProcessorClass);
 }
 static create(name, config) {
   const ProcessorClass = this.#processors.get(name);
   if (!ProcessorClass) {
     throw new Error(`Processor "${name}" not registered`);
   }
   return new ProcessorClass(config);
 }
 static getAvailable() {
   return [...this.#processors.keys()];
 }
}
// Register processors (can be in different files)
class StripeProcessor {
 constructor(config) { this.apiKey = config.apiKey; }
 charge(amount) { console.log(`Stripe charging $${amount}`); }
}
class PayPalProcessor {
 constructor(config) { this.clientId = config.clientId; }
 charge(amount) { console.log(`PayPal charging $${amount}`); }
}
PaymentProcessorFactory.register("stripe", StripeProcessor);
PaymentProcessorFactory.register("paypal", PayPalProcessor);
// Usage
const processor = PaymentProcessorFactory.create("stripe", { apiKey: "sk_..." });
processor.charge(99.99);
```
---
### 3. Abstract Factory Pattern
> **Factory of Factories — Create families of related objects.**
```javascript
// ============================================
// ABSTRACT FACTORY — UI Theme System
// ============================================
// Abstract Products
class Button {
 render() { throw new Error("Must implement render()"); }
}
class Input {
 render() { throw new Error("Must implement render()"); }
}
class Card {
 render() { throw new Error("Must implement render()"); }
}
// ---- Dark Theme Family ----
class DarkButton extends Button {
 render() {
   return `<button class="bg-gray-800 text-white border-gray-600">Dark Button</button>`;
 }
}
class DarkInput extends Input {
 render() {
   return `<input class="bg-gray-900 text-white border-gray-700" />`;
 }
}
class DarkCard extends Card {
 render() {
   return `<div class="bg-gray-800 text-white shadow-dark">Dark Card</div>`;
 }
}
// ---- Light Theme Family ----
class LightButton extends Button {
 render() {
   return `<button class="bg-white text-black border-gray-300">Light Button</button>`;
 }
}
class LightInput extends Input {
 render() {
   return `<input class="bg-white text-black border-gray-300" />`;
 }
}
class LightCard extends Card {
 render() {
   return `<div class="bg-white text-black shadow-light">Light Card</div>`;
 }
}
// Abstract Factory
class UIFactory {
 createButton() { throw new Error("Must implement"); }
 createInput()  { throw new Error("Must implement"); }
 createCard()   { throw new Error("Must implement"); }
}
class DarkThemeFactory extends UIFactory {
 createButton() { return new DarkButton(); }
 createInput()  { return new DarkInput(); }
 createCard()   { return new DarkCard(); }
}
class LightThemeFactory extends UIFactory {
 createButton() { return new LightButton(); }
 createInput()  { return new LightInput(); }
 createCard()   { return new LightCard(); }
}
// Usage — Client code works with ANY theme
function renderPage(factory) {
 const button = factory.createButton();
 const input = factory.createInput();
 const card = factory.createCard();
 console.log(button.render());
 console.log(input.render());
 console.log(card.render());
}
const theme = "dark"; // Could come from user preference
const factory = theme === "dark" ? new DarkThemeFactory() : new LightThemeFactory();
renderPage(factory);
```
---
### 4. Builder Pattern
> **Construct complex objects step by step.**
```javascript
// ============================================
// BUILDER — HTTP Request Builder
// ============================================
class RequestBuilder {
 #config = {
   method: "GET",
   headers: {},
   body: null,
   timeout: 5000,
   retries: 0,
   cache: false,
   params: {},
 };
 setUrl(url) {
   this.#config.url = url;
   return this; // Enable chaining
 }
 setMethod(method) {
   this.#config.method = method.toUpperCase();
   return this;
 }
 setHeader(key, value) {
   this.#config.headers[key] = value;
   return this;
 }
 setAuth(token) {
   this.#config.headers["Authorization"] = `Bearer ${token}`;
   return this;
 }
 setBody(body) {
   this.#config.body = JSON.stringify(body);
   this.#config.headers["Content-Type"] = "application/json";
   return this;
 }
 setTimeout(ms) {
   this.#config.timeout = ms;
   return this;
 }
 setRetries(count) {
   this.#config.retries = count;
   return this;
 }
 enableCache() {
   this.#config.cache = true;
   return this;
 }
 addParam(key, value) {
   this.#config.params[key] = value;
   return this;
 }
 build() {
   if (!this.#config.url) throw new Error("URL is required");
   // Append query params to URL
   const params = new URLSearchParams(this.#config.params).toString();
   const fullUrl = params ? `${this.#config.url}?${params}` : this.#config.url;
   return { ...this.#config, url: fullUrl };
 }
 async execute() {
   const config = this.build();
   console.log("Executing request:", config);
   // return fetch(config.url, config);
 }
}
// Usage — Clean, readable object construction
const request = new RequestBuilder()
 .setUrl("https://api.example.com/users")
 .setMethod("POST")
 .setAuth("my-jwt-token")
 .setBody({ name: "Sajal", role: "admin" })
 .setTimeout(10000)
 .setRetries(3)
 .enableCache()
 .build();
console.log(request);

// ============================================
// BUILDER — Query Builder (Real-World)
// ============================================
class QueryBuilder {
 #table = "";
 #selects = [];
 #conditions = [];
 #joins = [];
 #orderBy = [];
 #limit = null;
 #offset = null;
 from(table) {
   this.#table = table;
   return this;
 }
 select(...columns) {
   this.#selects.push(...columns);
   return this;
 }
 where(condition) {
   this.#conditions.push(condition);
   return this;
 }
 join(table, on) {
   this.#joins.push(`JOIN ${table} ON ${on}`);
   return this;
 }
 leftJoin(table, on) {
   this.#joins.push(`LEFT JOIN ${table} ON ${on}`);
   return this;
 }
 orderBy(column, direction = "ASC") {
   this.#orderBy.push(`${column} ${direction}`);
   return this;
 }
 limit(n) {
   this.#limit = n;
   return this;
 }
 offset(n) {
   this.#offset = n;
   return this;
 }
 build() {
   const parts = [];
   parts.push(`SELECT ${this.#selects.length ? this.#selects.join(", ") : "*"}`);
   parts.push(`FROM ${this.#table}`);
   if (this.#joins.length) parts.push(this.#joins.join("\n"));
   if (this.#conditions.length) parts.push(`WHERE ${this.#conditions.join(" AND ")}`);
   if (this.#orderBy.length) parts.push(`ORDER BY ${this.#orderBy.join(", ")}`);
   if (this.#limit !== null) parts.push(`LIMIT ${this.#limit}`);
   if (this.#offset !== null) parts.push(`OFFSET ${this.#offset}`);
   return parts.join("\n");
 }
}
const query = new QueryBuilder()
 .from("users")
 .select("users.name", "orders.total")
 .join("orders", "orders.user_id = users.id")
 .where("users.active = true")
 .where("orders.total > 100")
 .orderBy("orders.total", "DESC")
 .limit(10)
 .offset(20)
 .build();
console.log(query);
// SELECT users.name, orders.total
// FROM users
// JOIN orders ON orders.user_id = users.id
// WHERE users.active = true AND orders.total > 100
// ORDER BY orders.total DESC
// LIMIT 10
// OFFSET 20
```
---
### 5. Prototype Pattern
> **Create new objects by cloning existing ones.**
```javascript
// ============================================
// PROTOTYPE — Object Cloning
// ============================================
const vehiclePrototype = {
 type: "vehicle",
 wheels: 4,
 engine: { type: "petrol", hp: 150 },
 clone() {
   // Deep clone using structuredClone (modern JS)
   return structuredClone(this);
 },
 describe() {
   return `${this.type} with ${this.wheels} wheels (${this.engine.hp}hp ${this.engine.type})`;
 }
};
// Create variations by cloning + modifying
const car = vehiclePrototype.clone();
car.type = "Sedan";
car.engine.hp = 200;
const truck = vehiclePrototype.clone();
truck.type = "Truck";
truck.wheels = 6;
truck.engine = { type: "diesel", hp: 400 };
console.log(car.describe());   // "Sedan with 4 wheels (200hp petrol)"
console.log(truck.describe()); // "Truck with 6 wheels (400hp diesel)"
// Original is UNCHANGED ✅
console.log(vehiclePrototype.describe()); // "vehicle with 4 wheels (150hp petrol)"

// ============================================
// PROTOTYPE — Config Templates
// ============================================
class ConfigTemplate {
 constructor(settings = {}) {
   this.settings = {
     theme: "light",
     language: "en",
     notifications: true,
     fontSize: 14,
     autoSave: true,
     ...settings,
   };
 }
 clone() {
   return new ConfigTemplate(structuredClone(this.settings));
 }
 set(key, value) {
   this.settings[key] = value;
   return this;
 }
}
// Base template
const defaultConfig = new ConfigTemplate();
// Clone and customize for different user types
const developerConfig = defaultConfig.clone()
 .set("theme", "dark")
 .set("fontSize", 13)
 .set("autoSave", false);
const managerConfig = defaultConfig.clone()
 .set("notifications", true)
 .set("language", "en")
 .set("fontSize", 16);
console.log(developerConfig.settings);
console.log(managerConfig.settings);
```
---
## 🔵 Structural Patterns
### 1. Module / Revealing Module Pattern
> **Encapsulate code with public/private access.**
```javascript