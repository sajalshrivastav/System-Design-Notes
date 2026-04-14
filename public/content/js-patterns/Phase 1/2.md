# JavaScript Design Patterns Day-2 
---
## 🔵 Structural Patterns
### 1. Module / Revealing Module Pattern
> **Encapsulate code with public/private access.**
```javascript
// ============================================
// MODULE PATTERN — Using IIFE
// ============================================
const ShoppingCart = (() => {
 // PRIVATE state
 let items = [];
 let discount = 0;
 // PRIVATE helper
 function calculateSubtotal() {
   return items.reduce((sum, item) => sum + item.price * item.qty, 0);
 }
 // PUBLIC API (Revealed)
 return {
   addItem(name, price, qty = 1) {
     const existing = items.find(i => i.name === name);
     if (existing) {
       existing.qty += qty;
     } else {
       items.push({ name, price, qty });
     }
     console.log(`Added ${qty}x ${name}`);
   },
   removeItem(name) {
     items = items.filter(i => i.name !== name);
   },
   setDiscount(percent) {
     discount = Math.min(percent, 50); // Max 50% discount
   },
   getTotal() {
     const subtotal = calculateSubtotal();
     return subtotal - (subtotal * discount / 100);
   },
   getItems() {
     return items.map(i => ({ ...i })); // Return copies
   },
   clear() {
     items = [];
     discount = 0;
   }
 };
})();
ShoppingCart.addItem("Laptop", 999, 1);
ShoppingCart.addItem("Mouse", 25, 2);
ShoppingCart.setDiscount(10);
console.log(ShoppingCart.getTotal()); // 943.1
console.log(ShoppingCart.items);      // undefined — private! ✅

// ============================================
// MODULE — ES Module Style (Modern)
// ============================================
// eventBus.js
class EventBus {
 #handlers = new Map();
 on(event, handler) {
   if (!this.#handlers.has(event)) {
     this.#handlers.set(event, []);
   }
   this.#handlers.get(event).push(handler);
   // Return unsubscribe function
   return () => this.off(event, handler);
 }
 off(event, handler) {
   const handlers = this.#handlers.get(event);
   if (handlers) {
     const idx = handlers.indexOf(handler);
     if (idx > -1) handlers.splice(idx, 1);
   }
 }
 emit(event, data) {
   const handlers = this.#handlers.get(event) || [];
   handlers.forEach(handler => handler(data));
 }
 once(event, handler) {
   const wrapper = (data) => {
     handler(data);
     this.off(event, wrapper);
   };
   this.on(event, wrapper);
 }
}
// Singleton export
const eventBus = new EventBus();
// export default eventBus;
```
---
### 2. Facade Pattern
> **Provide a simple interface to a complex subsystem.**
```javascript
// ============================================
// FACADE — Complex API Simplified
// ============================================
// Complex subsystems
class AudioEngine {
 loadTrack(url) { console.log(`Loading audio: ${url}`); }
 setVolume(level) { console.log(`Volume: ${level}`); }
 play() { console.log("Audio playing"); }
 pause() { console.log("Audio paused"); }
 seek(time) { console.log(`Seeking to ${time}s`); }
 getAnalyser() { return { fftSize: 2048 }; }
}
class VideoEngine {
 loadSource(url) { console.log(`Loading video: ${url}`); }
 setResolution(res) { console.log(`Resolution: ${res}`); }
 play() { console.log("Video playing"); }
 pause() { console.log("Video paused"); }
 seek(time) { console.log(`Video seeking to ${time}s`); }
}
class SubtitleEngine {
 loadSubtitles(url) { console.log(`Loading subtitles: ${url}`); }
 setLanguage(lang) { console.log(`Subtitle lang: ${lang}`); }
 show() { console.log("Subtitles visible"); }
 hide() { console.log("Subtitles hidden"); }
}
class AnalyticsEngine {
 trackEvent(event, data) { console.log(`Analytics: ${event}`, data); }
}
// THE FACADE — Simple interface over complex subsystems
class MediaPlayer {
 constructor() {
   this.audio = new AudioEngine();
   this.video = new VideoEngine();
   this.subtitles = new SubtitleEngine();
   this.analytics = new AnalyticsEngine();
   this.isPlaying = false;
 }
 // Simple method that orchestrates multiple subsystems
 loadMedia(config) {
   this.video.loadSource(config.videoUrl);
   this.audio.loadTrack(config.audioUrl || config.videoUrl);
   this.video.setResolution(config.resolution || "1080p");
   this.audio.setVolume(config.volume || 80);
   if (config.subtitlesUrl) {
     this.subtitles.loadSubtitles(config.subtitlesUrl);
     this.subtitles.setLanguage(config.subtitleLang || "en");
   }
   this.analytics.trackEvent("media_loaded", { url: config.videoUrl });
 }
 play() {
   this.video.play();
   this.audio.play();
   this.subtitles.show();
   this.isPlaying = true;
   this.analytics.trackEvent("play", {});
 }
 pause() {
   this.video.pause();
   this.audio.pause();
   this.isPlaying = false;
   this.analytics.trackEvent("pause", {});
 }
 seek(time) {
   this.video.seek(time);
   this.audio.seek(time);
   this.analytics.trackEvent("seek", { time });
 }
}
// Usage — Client only interacts with the SIMPLE facade
const player = new MediaPlayer();
player.loadMedia({
 videoUrl: "https://cdn.example.com/movie.mp4",
 subtitlesUrl: "https://cdn.example.com/subs.vtt",
 subtitleLang: "en",
 resolution: "4K",
 volume: 70,
});
player.play();
player.seek(120);
player.pause();
```
---
### 3. Decorator Pattern
> **Add new behavior to objects dynamically without modifying them.**
```javascript
// ============================================
// DECORATOR — Function Decorators
// ============================================
// Base function
function fetchData(url) {
 console.log(`Fetching: ${url}`);
 return { data: "response", url };
}
// Decorator: Add logging
function withLogging(fn) {
 return function (...args) {
   console.log(`[${new Date().toISOString()}] Calling ${fn.name} with:`, args);
   const result = fn.apply(this, args);
   console.log(`[${new Date().toISOString()}] ${fn.name} returned:`, result);
   return result;
 };
}
// Decorator: Add caching
function withCache(fn) {
 const cache = new Map();
 return function (...args) {
   const key = JSON.stringify(args);
   if (cache.has(key)) {
     console.log("[CACHE HIT]");
     return cache.get(key);
   }
   const result = fn.apply(this, args);
   cache.set(key, result);
   return result;
 };
}
// Decorator: Add retry logic
function withRetry(fn, maxRetries = 3) {
 return async function (...args) {
   for (let attempt = 1; attempt <= maxRetries; attempt++) {
     try {
       return await fn.apply(this, args);
     } catch (error) {
       console.log(`Attempt ${attempt} failed: ${error.message}`);
       if (attempt === maxRetries) throw error;
       await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
     }
   }
 };
}
// Stack decorators!
const enhancedFetch = withLogging(withCache(fetchData));
enhancedFetch("/api/users");  // Logs + Fetches
enhancedFetch("/api/users");  // Logs + Cache Hit!

// ============================================
// DECORATOR — Class-based Decorator
// ============================================
class Coffee {
 cost() { return 5; }
 description() { return "Basic Coffee"; }
}
class MilkDecorator {
 constructor(coffee) { this.coffee = coffee; }
 cost() { return this.coffee.cost() + 2; }
 description() { return `${this.coffee.description()} + Milk`; }
}
class SugarDecorator {
 constructor(coffee) { this.coffee = coffee; }
 cost() { return this.coffee.cost() + 1; }
 description() { return `${this.coffee.description()} + Sugar`; }
}
class WhipCreamDecorator {
 constructor(coffee) { this.coffee = coffee; }
 cost() { return this.coffee.cost() + 3; }
 description() { return `${this.coffee.description()} + Whip Cream`; }
}
// Stack decorators
let myCoffee = new Coffee();
myCoffee = new MilkDecorator(myCoffee);
myCoffee = new SugarDecorator(myCoffee);
myCoffee = new WhipCreamDecorator(myCoffee);
console.log(myCoffee.description()); // "Basic Coffee + Milk + Sugar + Whip Cream"
console.log(myCoffee.cost());        // 11

// ============================================
// DECORATOR — Modern TC39 Decorators
// ============================================
// Note: Stage 3 decorators (available with transpilers)
function logged(originalMethod, context) {
 return function (...args) {
   console.log(`Calling ${context.name} with`, args);
   const result = originalMethod.apply(this, args);
   console.log(`${context.name} returned`, result);
   return result;
 };
}
function throttle(ms) {
 return function (originalMethod, context) {
   let lastCall = 0;
   return function (...args) {
     const now = Date.now();
     if (now - lastCall >= ms) {
       lastCall = now;
       return originalMethod.apply(this, args);
     }
   };
 };
}
// Usage with decorator syntax:
// class SearchBar {
//   @logged
//   @throttle(300)
//   search(query) {
//     return `Results for: ${query}`;
//   }
// }
```
---
### 4. Adapter Pattern
> **Make incompatible interfaces work together.**
```javascript
// ============================================
// ADAPTER — API Response Adapter
// ============================================
// Old API returns this format
class OldUserAPI {
 getUsers() {
   return [
     { first_name: "Sajal", last_name: "Shrivastav", email_address: "sajal@mail.com", is_active: 1 },
     { first_name: "John", last_name: "Doe", email_address: "john@mail.com", is_active: 0 },
   ];
 }
}
// New API expects this format
// { firstName, lastName, email, active: boolean }
// THE ADAPTER
class UserAPIAdapter {
 constructor(oldAPI) {
   this.oldAPI = oldAPI;
 }
 getUsers() {
   return this.oldAPI.getUsers().map(user => ({
     firstName: user.first_name,
     lastName: user.last_name,
     email: user.email_address,
     active: Boolean(user.is_active),
     fullName: `${user.first_name} ${user.last_name}`,
   }));
 }
}
// Usage — new code works with adapted interface
const adapter = new UserAPIAdapter(new OldUserAPI());
const users = adapter.getUsers();
console.log(users[0].firstName); // "Sajal"
console.log(users[0].active);   // true

// ============================================
// ADAPTER — Third-party Library Adapter
// ============================================
// Imagine two different analytics libraries with different APIs
class GoogleAnalytics {
 sendEvent(category, action, label, value) {
   console.log(`GA: ${category} / ${action} / ${label} = ${value}`);
 }
}
class MixpanelAnalytics {
 track(eventName, properties) {
   console.log(`Mixpanel: ${eventName}`, properties);
 }
}
// Unified adapter
class AnalyticsAdapter {
 constructor(provider) {
   this.provider = provider;
 }
 trackEvent({ event, category, label, value, properties }) {
   if (this.provider instanceof GoogleAnalytics) {
     this.provider.sendEvent(category, event, label, value);
   } else if (this.provider instanceof MixpanelAnalytics) {
     this.provider.track(event, { category, label, value, ...properties });
   }
 }
}
// Usage — Same interface regardless of provider
const analytics = new AnalyticsAdapter(new MixpanelAnalytics());
analytics.trackEvent({
 event: "button_click",
 category: "UI",
 label: "Sign Up",
 value: 1,
});
```
---
### 5. Proxy Pattern
> **Control access to an object through a surrogate.**
```javascript
// ============================================
// PROXY — Validation Proxy
// ============================================
const userValidator = {
 set(target, property, value) {
   switch (property) {
     case "age":
       if (typeof value !== "number" || value < 0 || value > 150) {
         throw new TypeError("Age must be a number between 0 and 150");
       }
       break;
     case "email":
       if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
         throw new TypeError("Invalid email format");
       }
       break;
     case "name":
       if (typeof value !== "string" || value.trim().length < 2) {
         throw new TypeError("Name must be at least 2 characters");
       }
       break;
   }
   target[property] = value;
   return true;
 },
 get(target, property) {
   if (property in target) return target[property];
   console.warn(`Property "${property}" does not exist`);
   return undefined;
 }
};
const user = new Proxy({}, userValidator);
user.name = "Sajal";       // ✅
user.email = "s@mail.com";  // ✅
user.age = 25;              // ✅
// user.age = -5;           // ❌ TypeError: Age must be a number between 0 and 150
// user.email = "invalid";  // ❌ TypeError: Invalid email format

// ============================================
// PROXY — Caching Proxy
// ============================================
function createCachingProxy(apiFunction, ttlMs = 60000) {
 const cache = new Map();
 return new Proxy(apiFunction, {
   apply(target, thisArg, args) {
     const key = JSON.stringify(args);
     const cached = cache.get(key);
     if (cached && Date.now() - cached.timestamp < ttlMs) {
       console.log(`[CACHE HIT] Key: ${key}`);
       return cached.value;
     }
     console.log(`[CACHE MISS] Fetching...`);
     const result = target.apply(thisArg, args);
     cache.set(key, { value: result, timestamp: Date.now() });
     return result;
   }
 });
}
function expensiveCalculation(n) {
 console.log(`Computing for ${n}...`);
 // Simulate heavy computation
 let result = 0;
 for (let i = 0; i < n; i++) result += Math.sqrt(i);
 return result;
}
const cachedCalc = createCachingProxy(expensiveCalculation, 5000);
cachedCalc(1000000); // [CACHE MISS] Computing...
cachedCalc(1000000); // [CACHE HIT] — instant!

// ============================================
// PROXY — Access Control / Logging
// ============================================
function createSecureObject(obj, allowedRoles, currentRole) {
 return new Proxy(obj, {
   get(target, property) {
     const metadata = target._permissions?.[property];
     if (metadata && !metadata.includes(currentRole)) {
       throw new Error(`Access denied: "${currentRole}" cannot read "${property}"`);
     }
     console.log(`[ACCESS LOG] ${currentRole} read "${property}"`);
     return target[property];
   },
   set(target, property, value) {
     if (currentRole !== "admin") {
       throw new Error(`Access denied: Only admin can modify data`);
     }
     target[property] = value;
     return true;
   }
 });
}
const sensitiveData = {
 publicInfo: "Anyone can see this",
 salary: 100000,
 ssn: "123-45-6789",
 _permissions: {
   salary: ["admin", "hr"],
   ssn: ["admin"],
 }
};
const viewerAccess = createSecureObject(sensitiveData, [], "viewer");
console.log(viewerAccess.publicInfo); // ✅ "Anyone can see this"
// console.log(viewerAccess.salary);  // ❌ Access denied
```
---
### 6. Flyweight Pattern
> **Share common data between many objects to save memory.**
```javascript
// ============================================
// FLYWEIGHT — Shared State for Game Entities
// ============================================
// Flyweight: Shared data (intrinsic state)
class EnemyType {
 constructor(name, sprite, maxHealth, attackPower, speed) {
   this.name = name;
   this.sprite = sprite;         // Heavy resource — shared!
   this.maxHealth = maxHealth;
   this.attackPower = attackPower;
   this.speed = speed;
 }
}
// Flyweight Factory
class EnemyTypeFactory {
 static #types = new Map();
 static getType(name, sprite, maxHealth, attackPower, speed) {
   const key = name;
   if (!this.#types.has(key)) {
     this.#types.set(key, new EnemyType(name, sprite, maxHealth, attackPower, speed));
     console.log(`Created new enemy type: ${name}`);
   }
   return this.#types.get(key);
 }
 static getTypeCount() {
   return this.#types.size;
 }
}
// Context: Unique data per enemy instance (extrinsic state)
class Enemy {
 constructor(type, x, y) {
   this.type = type;           // Reference to shared flyweight
   this.x = x;                 // Unique position
   this.y = y;
   this.currentHealth = type.maxHealth;
 }
 takeDamage(amount) {
   this.currentHealth -= amount;
   return this.currentHealth > 0;
 }
 describe() {
   return `${this.type.name} at (${this.x},${this.y}) HP: ${this.currentHealth}/${this.type.maxHealth}`;
 }
}
// Create 1000 enemies but only 3 types!
const enemies = [];
const types = ["Goblin", "Orc", "Dragon"];
const sprites = ["goblin.png", "orc.png", "dragon.png"];
const stats = [
 [50, 10, 5],   // Goblin: HP, ATK, SPD
 [100, 25, 3],  // Orc
 [500, 50, 2],  // Dragon
];
for (let i = 0; i < 1000; i++) {
 const idx = i % 3;
 const type = EnemyTypeFactory.getType(types[idx], sprites[idx], ...stats[idx]);
 enemies.push(new Enemy(type, Math.random() * 800, Math.random() * 600));
}
console.log(`Total enemies: ${enemies.length}`);     // 1000
console.log(`Shared types: ${EnemyTypeFactory.getTypeCount()}`); // 3 — Memory saved! ✅
```
---
### 7. Composite Pattern
> **Treat individual objects and compositions uniformly (tree structures).**
```javascript
// ============================================
// COMPOSITE — File System
// ============================================
class FileSystemItem {
 constructor(name) {
   this.name = name;
 }
 getSize() { throw new Error("Must implement"); }
 display(indent = "") { throw new Error("Must implement"); }
}
class File extends FileSystemItem {
 constructor(name, size) {
   super(name);
   this.size = size;
 }
 getSize() { return this.size; }
 display(indent = "") {
   console.log(`${indent}📄 ${this.name} (${this.size} KB)`);
 }
}
class Folder extends FileSystemItem {
 #children = [];
 add(item) {
   this.#children.push(item);
   return this;
 }
 remove(item) {
   this.#children = this.#children.filter(c => c !== item);
   return this;
 }
 getSize() {
   return this.#children.reduce((total, child) => total + child.getSize(), 0);
 }
 display(indent = "") {
   console.log(`${indent}📁 ${this.name} (${this.getSize()} KB)`);
   this.#children.forEach(child => child.display(indent + "  "));
 }
}
// Build a tree
const root = new Folder("project");
const src = new Folder("src");
const components = new Folder("components");
components.add(new File("Header.jsx", 5));
components.add(new File("Footer.jsx", 3));
components.add(new File("Sidebar.jsx", 8));
src.add(components);
src.add(new File("App.jsx", 12));
src.add(new File("index.js", 2));
root.add(src);
root.add(new File("package.json", 1));
root.add(new File("README.md", 4));
root.display();
// 📁 project (35 KB)
//   📁 src (30 KB)
//     📁 components (16 KB)
//       📄 Header.jsx (5 KB)
//       📄 Footer.jsx (3 KB)
//       📄 Sidebar.jsx (8 KB)
//     📄 App.jsx (12 KB)
//     📄 index.js (2 KB)
//   📄 package.json (1 KB)
//   📄 README.md (4 KB)
console.log(`Total size: ${root.getSize()} KB`); // 35 KB
```