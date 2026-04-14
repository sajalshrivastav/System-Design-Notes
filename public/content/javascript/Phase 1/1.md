# JavaScript Prototypes & Prototypal Inheritance

## Core Concept: Everything is an Object

In JavaScript, **everything is an object**. At the heart of JS's object system lies the **prototype** — an object from which other objects inherit properties and methods. This forms JavaScript's **prototype-based inheritance system**.

---

## 1. Basic Object Structure

### Simple Object Example

```javascript
const p1 = {
  fName: 'Peter',
  lName: 'Pan',
}

// Output structure:
// ├── fName: "Peter"
// ├── lName: "Pan"
// └── [[Prototype]]: Object
```

### Adding Methods to Objects

```javascript
const p1 = {
  fName: 'Peter',
  lName: 'Pan',
  fullName() {
    return `${this.fName} ${this.lName}`
  },
}

console.log(p1.fullName()) // "Peter Pan"
```

---

## 2. The Problem: Violating DRY Principle

### Bad Practice — Code Duplication

```javascript
const p2 = {
  fName: 'John',
  lName: 'Doe',
  fullName() {
    // ⚠️ Duplicated method!
    return `${this.fName} ${this.lName}`
  },
}
```

**Issue**: The `fullName()` method is duplicated across objects, violating the **DRY (Don't Repeat Yourself)** principle.

---

## 3. The Solution: Prototypal Inheritance

### Using `Object.create()`

```javascript
const p1 = {
  fName: 'Peter',
  lName: 'Pan',
  fullName() {
    return `${this.fName} ${this.lName}`
  },
}

// Create p2 that inherits from p1
const p2 = Object.create(p1)

// p2 structure:
// └── [[Prototype]]: p1
//     ├── fName: "Peter"
//     ├── lName: "Pan"
//     └── fullName: [Function]
```

### Accessing Inherited Properties

```javascript
console.log(p2.fName) // "Peter" (inherited from p1)
console.log(p2.fullName()) // "Peter Pan" (inherited from p1)
```

**Key Point**: `p2` appears empty but has access to `p1`'s properties through its prototype chain.

---

## 4. How Prototype Lookup Works

### The Prototype Chain Search Mechanism

When you access `p2.fName`, JavaScript follows this lookup process:

```
1. Search in p2's own properties →  Not found
2. Search in p2's [[Prototype]] (which is p1) →  Found!
3. Return the value
```

**Visual Representation**:

```javascript
const p2 = {
  __proto__: p1, // Simplified internal representation
}
```

---

## 5. Modifying Prototypes — A Dangerous Practice

### What Happens When You Modify `__proto__`

```javascript
p2.__proto__.fName = 'ChangedName'

console.log(p1.fName) // "ChangedName" ⚠️ p1 is also changed!
```

**Why?** `Object.create(p1)` creates a **reference** to `p1`, not a copy. Changes to the prototype affect all objects that inherit from it.

---

## 6. Wrapper Classes: How Primitives Become Objects

### The Mystery of Primitive Methods

```javascript
let fName = 'Peter Pan'

// How can a string have methods?
console.log(fName.slice(0, 5)) // "Peter"
console.log(fName.charAt(0)) // "P"
console.log(fName.length) // 9
```

### Answer: JavaScript's Wrapper Classes

When you access properties/methods on primitives, JavaScript **temporarily wraps** them in object wrappers:

| Primitive Type | Wrapper Class |
| -------------- | ------------- |
| `string`       | `String`      |
| `number`       | `Number`      |
| `boolean`      | `Boolean`     |

**Internal Representation**:

```javascript
// What you write:
let fName = 'Peter Pan'

// How JS treats it when accessing methods:
fName = {
  value: 'Peter Pan',
  __proto__: String.prototype,
}
```

### Visualizing the Prototype Chain

```javascript
console.log(fName) // "Peter Pan"
console.log(fName.__proto__) // String.prototype (all String methods)
```

---

## 7. Deep Dive: Multi-Level Prototype Chain

### Building a Prototype Chain

```javascript
const p1 = {
  xp1: 'I am inside p1',
}

const p2 = {
  xp2: 'I am inside p2',
  __proto__: p1,
}

const p3 = {
  xp3: 'I am inside p3',
  __proto__: p2,
}
```

### Chain Structure Visualization

```
p3
├── xp3: "I am inside p3"
└── [[Prototype]]: p2
    ├── xp2: "I am inside p2"
    └── [[Prototype]]: p1
        ├── xp1: "I am inside p1"
        └── [[Prototype]]: Object.prototype
            └── [[Prototype]]: null (chain ends here)
```

### Property Lookup in Multi-Level Chains

```javascript
console.log(p3.xp3) // Found in p3 ✅
console.log(p3.xp2) // Found in p2 (via prototype) ✅
console.log(p3.xp1) // Found in p1 (via p2's prototype) ✅
```

**Lookup Order**: `p3` → `p2` → `p1` → `Object.prototype` → `null`

---

## 8. What is Prototypal Inheritance?

**Prototypal Inheritance** is JavaScript's mechanism where objects inherit properties and methods from other objects through the prototype chain.

### Key Characteristics:

1. **Chain Traversal**: JS searches up the prototype chain until it finds the property or reaches `null`
2. **Dynamic**: You can modify prototypes at runtime (though it's not recommended)
3. **Efficient**: Methods are shared across instances rather than duplicated

---

## 9. Best Practices & Warnings

### DO: Use `Object.create()`

```javascript
const child = Object.create(parent)
```

### DON'T: Manually Modify `__proto__`

```javascript
// Bad practice — can cause performance issues and bugs
obj.__proto__ = someOtherObj
```

**Why?**

- Causes performance degradation in modern JS engines
- Can lead to hard-to-debug issues
- Violates encapsulation principles

### Better Alternative: Use Modern Class Syntax

```javascript
class Person {
  constructor(fName, lName) {
    this.fName = fName
    this.lName = lName
  }

  fullName() {
    return `${this.fName} ${this.lName}`
  }
}

const p1 = new Person('Peter', 'Pan')
const p2 = new Person('John', 'Doe')
```

---

## 10. Key Takeaways

| Concept                    | Summary                                                                         |
| -------------------------- | ------------------------------------------------------------------------------- |
| **Prototype**              | An object that provides shared properties/methods to other objects              |
| **`__proto__`**            | Internal property linking an object to its prototype (avoid modifying directly) |
| **`Object.create()`**      | Safe way to create objects with a specified prototype                           |
| **Prototype Chain**        | The linked series of prototypes JS traverses during property lookup             |
| **Wrapper Classes**        | Temporary objects JS creates to give primitives object-like behavior            |
| **Prototypal Inheritance** | Objects inheriting from other objects through the prototype chain               |

---

## Real-World Analogy

Think of prototypes like a **family tree of blueprints**:

- **p3** is a house built using blueprint **p2**
- **p2** itself was created from blueprint **p1**
- **p1** is based on the universal **Object blueprint**

When you need a feature (like a method), JS checks:

1. Your house (p3)
2. Your blueprint (p2)
3. Your blueprint's blueprint (p1)
4. The universal blueprint (Object)

If none have it → `undefined`

---

## Summary

JavaScript's prototype system is the foundation of its inheritance model. By understanding how prototypes work, you can:

- Write more efficient, DRY code
- Understand how built-in objects work
- Debug inheritance issues effectively
- Make informed decisions about using prototypes vs. modern classes

**Remember**: Always use `Object.create()` instead of manually setting `__proto__` to avoid bugs and performance issues!
