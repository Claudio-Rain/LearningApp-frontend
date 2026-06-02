# Interview Questions: Data Abstraction

## Level 1

### Abstract Classes & Interfaces
- L1 How do you define an abstract class in C#, and what makes it different from a regular class? `[FROM JD]`
- L1 How do you define an interface in C#, and what are the rules that govern its members? `[FROM JD]`
- L1 What is the difference between an interface and an abstract class, and when would you choose one over the other? `[FROM JD]`
- L1 How would you write an abstract class that declares abstract methods and properties, and how does a concrete class inherit and implement them? `[FROM JD]`

### Multiple Inheritance
- L1 How do you implement multiple inheritance in C# using interfaces, and how do you satisfy all contracts when a class implements two or more interfaces? `[FROM JD]`

---

## Level 2

### Abstract Modifiers
- L2 What does the `abstract` modifier mean when applied to a class, method, or property, and what constraints does it impose on derived types? `[FROM JD]`
- L2 Can interfaces have default implementations in C# 8+? When is this useful and what are the limitations?

### Interface Implementation
- L2 What is explicit interface implementation, and how would you use it to resolve a naming conflict when a class implements two interfaces with the same member name? `[FROM JD]`

### Polymorphism & Virtual Methods
- L2 What is polymorphism, and how do you declare and override virtual methods in C#? What is the difference between `virtual`/`override` and `new`? `[FROM JD]`
- L2 What is the Liskov Substitution Principle and how does it relate to inheritance and polymorphism?
- L2 What happens if you call a virtual method from a constructor — what is the risk?

---

## Level 3

### Design & Architecture
- L3 How would you combine interfaces and abstract classes to design a well-structured type hierarchy, and how do you decide which members belong in each? `[FROM JD]`
- L3 When would you choose composition over inheritance, and what problem does it solve?
- L3 What are covariant (`out`) and contravariant (`in`) type parameters in generic interfaces, and when do you need them?
