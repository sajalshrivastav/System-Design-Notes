# JavaScript Design Patterns Day-3
---
## 🟣 Behavioral Patterns
### 1. Observer Pattern (Pub/Sub)
> **Objects subscribe to events and get notified when they occur.**
```javascript
// ============================================
// OBSERVER — Event Emitter
// ============================================
class EventEmitter {
 #events = new Map();
 on(event, listener) {
   if (!this.#events.has(event)) {
     this.#events.set(event, new Set());
   }
   this.#events.get(event).add(listener);
   // Return unsubscribe function
   return () => this.off(event, listener);
 }
 off(event, listener) {
   this.#events.get(event)?.delete(listener);
 }
 emit(event, ...args) {
   this.#events.get(event)?.forEach(listener => {
     try {
       listener(...args);
     } catch (error) {
       console.error(`Error in listener for "${event}":`, error);
     }
   });
 }
 once(event, listener) {
   const wrapper = (...args) => {
     listener(...args);
     this.off(event, wrapper);
   };
   return this.on(event, wrapper);
 }
}
// Usage
const store = new EventEmitter();
// Subscribe
const unsub = store.on("userLoggedIn", (user) => {
 console.log(`Welcome back, ${user.name}!`);
});
store.on("userLoggedIn", (user) => {
 console.log(`Loading preferences for ${user.email}...`);
});
store.on("userLoggedIn", (user) => {
 console.log(`Logging analytics for ${user.name}`);
});
// Emit — all listeners fire
store.emit("userLoggedIn", { name: "Sajal", email: "sajal@mail.com" });
// Unsubscribe
unsub();

// ============================================
// OBSERVER — Reactive Store (Like Redux)
// ============================================
class Store {
 #state;
 #listeners = new Set();
 #reducer;
 constructor(reducer, initialState) {
   this.#reducer = reducer;
   this.#state = initialState;
 }
 getState() {
   return this.#state;
 }
 dispatch(action) {
   const prevState = this.#state;
   this.#state = this.#reducer(this.#state, action);
   if (prevState !== this.#state) {
     this.#listeners.forEach(listener => listener(this.#state, prevState));
   }
 }
 subscribe(listener) {
   this.#listeners.add(listener);
   return () => this.#listeners.delete(listener);
 }
}
// Reducer
function counterReducer(state, action) {
 switch (action.type) {
   case "INCREMENT": return { ...state, count: state.count + 1 };
   case "DECREMENT": return { ...state, count: state.count - 1 };
   case "RESET":     return { ...state, count: 0 };
   default: return state;
 }
}
const counterStore = new Store(counterReducer, { count: 0 });
// Subscribe to changes
counterStore.subscribe((newState, prevState) => {
 console.log(`Count changed: ${prevState.count} → ${newState.count}`);
});
counterStore.dispatch({ type: "INCREMENT" }); // Count changed: 0 → 1
counterStore.dispatch({ type: "INCREMENT" }); // Count changed: 1 → 2
counterStore.dispatch({ type: "DECREMENT" }); // Count changed: 2 → 1
```
---
### 2. Mediator Pattern
> **Centralize complex communication between objects.**
```javascript
// ============================================
// MEDIATOR — Chat Room
// ============================================
class ChatRoom {
 #users = new Map();
 #messageHistory = [];
 register(user) {
   this.#users.set(user.name, user);
   user.chatRoom = this;
   console.log(`${user.name} joined the chat`);
 }
 sendMessage(from, to, message) {
   const recipient = this.#users.get(to);
   const entry = {
     from: from.name,
     to,
     message,
     timestamp: new Date(),
   };
   this.#messageHistory.push(entry);
   if (recipient) {
     recipient.receive(from.name, message);
   } else {
     console.log(`User "${to}" not found`);
   }
 }
 broadcast(from, message) {
   this.#users.forEach((user, name) => {
     if (name !== from.name) {
       user.receive(from.name, message);
     }
   });
 }
 getHistory() {
   return [...this.#messageHistory];
 }
}
class User {
 constructor(name) {
   this.name = name;
   this.chatRoom = null;
   this.inbox = [];
 }
 send(to, message) {
   console.log(`${this.name} → ${to}: ${message}`);
   this.chatRoom.sendMessage(this, to, message);
 }
 broadcast(message) {
   console.log(`${this.name} (broadcast): ${message}`);
   this.chatRoom.broadcast(this, message);
 }
 receive(from, message) {
   this.inbox.push({ from, message });
   console.log(`  ${this.name} received from ${from}: ${message}`);
 }
}
const room = new ChatRoom();
const sajal = new User("Sajal");
const john = new User("John");
const jane = new User("Jane");
room.register(sajal);
room.register(john);
room.register(jane);
sajal.send("John", "Hey, how's the project going?");
john.send("Sajal", "Almost done! Deploying tonight.");
jane.broadcast("Team standup in 5 minutes! 🚀");
```
---
### 3. Strategy Pattern
> **Define a family of algorithms and make them interchangeable.**
```javascript
// ============================================
// STRATEGY — Sorting Strategies
// ============================================
const sortingStrategies = {
 byName: (a, b) => a.name.localeCompare(b.name),
 byPrice: (a, b) => a.price - b.price,
 byPriceDesc: (a, b) => b.price - a.price,
 byRating: (a, b) => b.rating - a.rating,
 byNewest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
};
class ProductList {
 #products = [];
 #sortStrategy = sortingStrategies.byName;
 constructor(products) {
   this.#products = products;
 }
 setSortStrategy(strategy) {
   this.#sortStrategy = strategy;
 }
 getSorted() {
   return [...this.#products].sort(this.#sortStrategy);
 }
}
const products = [
 { name: "Laptop", price: 999, rating: 4.5, createdAt: "2026-01-01" },
 { name: "Phone",  price: 699, rating: 4.8, createdAt: "2026-03-01" },
 { name: "Tablet", price: 499, rating: 4.2, createdAt: "2026-02-01" },
];
const list = new ProductList(products);
list.setSortStrategy(sortingStrategies.byPrice);
console.log("By Price:", list.getSorted().map(p => `${p.name}: $${p.price}`));
list.setSortStrategy(sortingStrategies.byRating);
console.log("By Rating:", list.getSorted().map(p => `${p.name}: ${p.rating}⭐`));

// ============================================
// STRATEGY — Validation Strategies
// ============================================
const validators = {
 required: (value) => ({
   valid: value !== null && value !== undefined && value !== "",
   message: "This field is required",
 }),
 email: (value) => ({
   valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
   message: "Invalid email format",
 }),
 minLength: (min) => (value) => ({
   valid: value.length >= min,
   message: `Must be at least ${min} characters`,
 }),
 maxLength: (max) => (value) => ({
   valid: value.length <= max,
   message: `Must be at most ${max} characters`,
 }),
 pattern: (regex, msg) => (value) => ({
   valid: regex.test(value),
   message: msg,
 }),
};
class FormValidator {
 #rules = new Map();
 addRule(field, ...validatorFns) {
   this.#rules.set(field, validatorFns);
   return this;
 }
 validate(data) {
   const errors = {};
   for (const [field, validatorFns] of this.#rules) {
     const value = data[field];
     for (const validatorFn of validatorFns) {
       const result = validatorFn(value);
       if (!result.valid) {
         errors[field] = errors[field] || [];
         errors[field].push(result.message);
       }
     }
   }
   return {
     isValid: Object.keys(errors).length === 0,
     errors,
   };
 }
}
const signupValidator = new FormValidator()
 .addRule("name", validators.required, validators.minLength(2))
 .addRule("email", validators.required, validators.email)
 .addRule("password", validators.required, validators.minLength(8));
console.log(signupValidator.validate({ name: "S", email: "bad", password: "123" }));
// { isValid: false, errors: { name: [...], email: [...], password: [...] } }
```
---
### 4. Command Pattern
> **Encapsulate actions as objects, enabling undo/redo.**
```javascript
// ============================================
// COMMAND — Text Editor with Undo/Redo
// ============================================
class Command {
 execute() { throw new Error("Must implement"); }
 undo() { throw new Error("Must implement"); }
 describe() { return "Unknown command"; }
}
class InsertTextCommand extends Command {
 constructor(editor, text, position) {
   super();
   this.editor = editor;
   this.text = text;
   this.position = position;
 }
 execute() {
   this.editor.insertAt(this.position, this.text);
 }
 undo() {
   this.editor.deleteRange(this.position, this.position + this.text.length);
 }
 describe() {
   return `Insert "${this.text}" at ${this.position}`;
 }
}
class DeleteTextCommand extends Command {
 constructor(editor, start, end) {
   super();
   this.editor = editor;
   this.start = start;
   this.end = end;
   this.deletedText = ""; // Saved for undo
 }
 execute() {
   this.deletedText = this.editor.getText(this.start, this.end);
   this.editor.deleteRange(this.start, this.end);
 }
 undo() {
   this.editor.insertAt(this.start, this.deletedText);
 }
 describe() {
   return `Delete from ${this.start} to ${this.end}`;
 }
}
class BoldCommand extends Command {
 constructor(editor, start, end) {
   super();
   this.editor = editor;
   this.start = start;
   this.end = end;
 }
 execute() {
   this.editor.insertAt(this.end, "**");
   this.editor.insertAt(this.start, "**");
 }
 undo() {
   this.editor.deleteRange(this.end + 2, this.end + 4);
   this.editor.deleteRange(this.start, this.start + 2);
 }
 describe() {
   return `Bold text from ${this.start} to ${this.end}`;
 }
}
// Simple text buffer
class TextEditor {
 #content = "";
 insertAt(pos, text) {
   this.#content = this.#content.slice(0, pos) + text + this.#content.slice(pos);
 }
 deleteRange(start, end) {
   this.#content = this.#content.slice(0, start) + this.#content.slice(end);
 }
 getText(start, end) { return this.#content.slice(start, end); }
 getContent() { return this.#content; }
}
// Command Manager (Invoker)
class CommandManager {
 #history = [];
 #redoStack = [];
 execute(command) {
   command.execute();
   this.#history.push(command);
   this.#redoStack = []; // Clear redo on new action
   console.log(`Executed: ${command.describe()}`);
 }
 undo() {
   const command = this.#history.pop();
   if (command) {
     command.undo();
     this.#redoStack.push(command);
     console.log(`Undid: ${command.describe()}`);
   }
 }
 redo() {
   const command = this.#redoStack.pop();
   if (command) {
     command.execute();
     this.#history.push(command);
     console.log(`Redid: ${command.describe()}`);
   }
 }
}
// Usage
const editor = new TextEditor();
const manager = new CommandManager();
manager.execute(new InsertTextCommand(editor, "Hello World", 0));
console.log(editor.getContent()); // "Hello World"
manager.execute(new InsertTextCommand(editor, "! Welcome", 11));
console.log(editor.getContent()); // "Hello World! Welcome"
manager.undo();
console.log(editor.getContent()); // "Hello World"
manager.redo();
console.log(editor.getContent()); // "Hello World! Welcome"
```
---
### 5. Iterator Pattern
> **Traverse a collection without exposing its internal structure.**
```javascript
// ============================================
// ITERATOR — Custom Iterable Collection
// ============================================
class NumberRange {
 constructor(start, end, step = 1) {
   this.start = start;
   this.end = end;
   this.step = step;
 }
 // Make it iterable with Symbol.iterator
 [Symbol.iterator]() {
   let current = this.start;
   const { end, step } = this;
   return {
     next() {
       if (current <= end) {
         const value = current;
         current += step;
         return { value, done: false };
       }
       return { done: true };
     }
   };
 }
}
// Works with for...of, spread, destructuring!
const range = new NumberRange(1, 10, 2);
for (const num of range) {
 console.log(num); // 1, 3, 5, 7, 9
}
console.log([...range]); // [1, 3, 5, 7, 9]

// ============================================
// ITERATOR — Paginated API Iterator
// ============================================
class PaginatedAPI {
 constructor(baseUrl, pageSize = 10) {
   this.baseUrl = baseUrl;
   this.pageSize = pageSize;
 }
 async *[Symbol.asyncIterator]() {
   let page = 1;
   let hasMore = true;
   while (hasMore) {
     // Simulate API call
     const response = await this.fetchPage(page);
     for (const item of response.data) {
       yield item;
     }
     hasMore = response.hasMore;
     page++;
   }
 }
 async fetchPage(page) {
   // Simulated response
   console.log(`Fetching page ${page}...`);
   const totalItems = 25;
   const start = (page - 1) * this.pageSize;
   const end = Math.min(start + this.pageSize, totalItems);
   return {
     data: Array.from({ length: end - start }, (_, i) => ({
       id: start + i + 1,
       name: `Item ${start + i + 1}`,
     })),
     hasMore: end < totalItems,
   };
 }
}
// Usage with for-await-of
async function processAllItems() {
 const api = new PaginatedAPI("https://api.example.com/items", 10);
 for await (const item of api) {
   console.log(`Processing: ${item.name}`);
 }
}
// processAllItems();
```
---
### 6. State Pattern
> **An object changes its behavior when its internal state changes.**
```javascript
// ============================================
// STATE — Traffic Light System
// ============================================
class TrafficLight {
 #state;
 #states = {};
 constructor() {
   // Define states
   this.#states = {
     red: {
       color: "🔴 RED",
       duration: 5000,
       next: "green",
       canGo: false,
     },
     yellow: {
       color: "🟡 YELLOW",
       duration: 2000,
       next: "red",
       canGo: false,
     },
     green: {
       color: "🟢 GREEN",
       duration: 4000,
       next: "yellow",
       canGo: true,
     },
   };
   this.#state = this.#states.red;
 }
 getState() {
   return this.#state;
 }
 change() {
   const nextStateName = this.#state.next;
   this.#state = this.#states[nextStateName];
   console.log(`Light changed to: ${this.#state.color}`);
   return this;
 }
 canGo() {
   return this.#state.canGo;
 }
}

// ============================================
// STATE — Order State Machine (Real-World)
// ============================================
class OrderState {
 constructor(order) { this.order = order; }
 cancel() { throw new Error(`Cannot cancel in "${this.name}" state`); }
 pay() { throw new Error(`Cannot pay in "${this.name}" state`); }
 ship() { throw new Error(`Cannot ship in "${this.name}" state`); }
 deliver() { throw new Error(`Cannot deliver in "${this.name}" state`); }
 refund() { throw new Error(`Cannot refund in "${this.name}" state`); }
}
class PendingState extends OrderState {
 name = "pending";
 pay() {
   console.log("✅ Payment received!");
   this.order.setState(new PaidState(this.order));
 }
 cancel() {
   console.log("❌ Order cancelled");
   this.order.setState(new CancelledState(this.order));
 }
}
class PaidState extends OrderState {
 name = "paid";
 ship() {
   console.log("📦 Order shipped!");
   this.order.setState(new ShippedState(this.order));
 }
 refund() {
   console.log("💰 Refund processed");
   this.order.setState(new RefundedState(this.order));
 }
}
class ShippedState extends OrderState {
 name = "shipped";
 deliver() {
   console.log("🎉 Order delivered!");
   this.order.setState(new DeliveredState(this.order));
 }
}
class DeliveredState extends OrderState {
 name = "delivered";
 refund() {
   console.log("💰 Return & refund initiated");
   this.order.setState(new RefundedState(this.order));
 }
}
class CancelledState extends OrderState { name = "cancelled"; }
class RefundedState extends OrderState { name = "refunded"; }
class Order {
 #state;
 #history = [];
 constructor(id) {
   this.id = id;
   this.#state = new PendingState(this);
   this.#history.push("pending");
 }
 setState(state) {
   this.#state = state;
   this.#history.push(state.name);
 }
 getStatus() { return this.#state.name; }
 getHistory() { return [...this.#history]; }
 pay() { this.#state.pay(); }
 cancel() { this.#state.cancel(); }
 ship() { this.#state.ship(); }
 deliver() { this.#state.deliver(); }
 refund() { this.#state.refund(); }
}
const order = new Order("ORD-001");
console.log(order.getStatus()); // "pending"
order.pay();      // ✅ Payment received!
order.ship();     // 📦 Order shipped!
order.deliver();  // 🎉 Order delivered!
console.log(order.getHistory()); // ["pending", "paid", "shipped", "delivered"]
// order.ship(); // ❌ Error: Cannot ship in "delivered" state
```